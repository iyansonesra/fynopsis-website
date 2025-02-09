import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, X, Info, HelpCircle } from 'lucide-react';
import { post } from 'aws-amplify/api';
import { usePathname } from 'next/navigation';
import { useS3Store, TreeNode } from "./fileService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TbChevronsDownLeft } from 'react-icons/tb';

interface DragDropOverlayProps {
  onClose: () => void;
  onFilesUploaded: (files: File[], fileHashes: FileHashMapping) => void;
  currentPath?: string[];  // Add current path prop
  folderId?: string;
}

interface FileUpload {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error' | 'invalid filename' | 'file too large' | 'invalid file type';
}

interface FileUploads {
  [key: string]: FileUpload;
}

interface FileHashMapping {
  [key: string]: string; // key = filename+size, value = fileHash
}

// Add this state in your component

const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/rtf': '.rtf',
  'application/vnd.oasis.opendocument.text': '.odt',

  // Spreadsheets
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel.sheet.macroEnabled.12': '.xlsm',
  'text/csv': '.csv',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',

  // Presentations
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.oasis.opendocument.presentation': '.odp',

  // Diagrams
  'application/vnd.visio': '.vsd',
  'application/vnd.ms-visio.drawing': '.vsdx',
  'application/vnd.oasis.opendocument.graphics': '.odg',

  // Images
  'image/heic': '.heic',
  'image/png': '.png',
  'image/jpeg': '.jpg,.jpeg',
};

const getAllowedExtensions = () => {
  return Object.values(ALLOWED_FILE_TYPES).flat().join(', ');
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileTypeInfo = () => (
  <HoverCard>
    <HoverCardTrigger asChild>
      <button className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <Info className="h-4 w-4 mr-1" />
        Supported file types
      </button>
    </HoverCardTrigger>
    <HoverCardContent className="w-80 p-4">
      <h4 className="font-semibold mb-2">Allowed file types:</h4>
      <div className="text-sm space-y-2">
        <p><span className="font-medium">Documents:</span> PDF, DOCX, DOC, RTF, ODT</p>
        <p><span className="font-medium">Spreadsheets:</span> XLSX, XLS, XLSM, CSV, ODS</p>
        <p><span className="font-medium">Presentations:</span> PPTX, PPT, ODP</p>
        <p><span className="font-medium">Diagrams:</span> VSD, VSDX, ODG</p>
        <p><span className="font-medium">Images:</span> PNG, JPG, JPEG, HEIC</p>
      </div>
    </HoverCardContent>
  </HoverCard>
);

const isValidFileType = (file: File): boolean => {
  return Object.keys(ALLOWED_FILE_TYPES).includes(file.type);
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

const DragDropOverlay: React.FC<DragDropOverlayProps> = ({
  onClose,
  onFilesUploaded,
  currentPath = [], // Default to empty array for root folder
  folderId
}) => {
  const fileHashes: FileHashMapping = {}; 
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileUploads, setFileUploads] = useState<FileUploads>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const pathname = usePathname();
  const pathArray = pathname.split('/');
  const bucketUuid = pathArray[2] || '';

  const getFullPath = (fileName: string) => {
    if (currentPath.length === 0) {
      return fileName;
    }
    // Join current path with filename, ensuring proper formatting
    return `${currentPath.join('/')}/${fileName}`;
  };

  const uploadFile = async (file: File) => {
    try {
      const fullPath = getCurrentPathString(useS3Store.getState().currentNode);
      let filePathOut = `${fullPath}${file.name}`;
      if (fullPath === '/') {
        filePathOut = filePathOut.slice(1);
      }

      console.log('filePathOut:', filePathOut);

      console.log("file name in uploadFile:", file.name);
      console.log("breh", file.type)
      console.log("folder id in uploadFile:", folderId);

      // Get presigned URL from API with the full path
      const getUrlResponse = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/upload-url`,
        options: {
          withCredentials: true,
          body: {
            fileName: file.name,
            folderId: folderId || null,
            contentType: file.type,
          }
        }
      });

      const { body } = await getUrlResponse.response;
      const responseText = await body.text();
      const { signedUrl, fileHash, fileName } = JSON.parse(responseText);

      const fileKey = `${fileName}-${file.size}`;
      console.log('fileKey:', fileKey);
      console.log('fileHash:', fileHash);
      fileHashes[fileKey] = fileHash;  // Store hash in local object


      console.log("file hash table:", fileHashes);


      // Upload file using presigned URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Content-Length': file.size.toString(),
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      setFileUploads(prev => ({
        ...prev,
        [file.name]: {
          ...prev[file.name],
          status: 'completed',
          progress: 100
        }
      }));

    } catch (error) {
      console.error('Error uploading file:', error);
      setFileUploads(prev => ({
        ...prev,
        [file.name]: {
          ...prev[file.name],
          status: 'invalid filename'
        }
      }));
    }
  };

  const isValidFileName = (fileName: string): boolean => {
    // Regex to check for special characters and slashes
    console.log('fileName:', fileName);
    const validFileNameRegex = /^[a-zA-Z0-9\s._()-]+$/;
    return validFileNameRegex.test(fileName);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.reduce((acc, file) => {
      let status: FileUpload['status'] = 'completed';

      if (file.size > MAX_FILE_SIZE) {
        status = 'file too large';
      } else if (!isValidFileType(file)) {
        status = 'invalid file type';
      } else if (!isValidFileName(file.name)) {
        status = 'invalid filename';
      }

      acc[file.name] = {
        file,
        progress: 0,
        status
      };
      return acc;
    }, {} as FileUploads);

    setFileUploads(prev => ({
      ...prev,
      ...newUploads
    }));

    const validFiles = acceptedFiles.filter(file =>
      file.size <= MAX_FILE_SIZE &&
      isValidFileType(file) &&
      isValidFileName(file.name)
    );

    setPendingFiles(validFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleConfirmUpload = async () => {
    setIsConfirming(true);
    try {
      // Set all pending files to uploading state with 0 progress
      setFileUploads(prev => {
        const updated = { ...prev };
        pendingFiles.forEach(file => {
          updated[file.name] = {
            ...updated[file.name],
            status: 'uploading',
            progress: 0
          };
        });
        return updated;
      });

      // Upload all pending files
      for (const file of pendingFiles) {
        // Simulate progress updates
        const updateProgress = (progress: number) => {
          setFileUploads(prev => ({
            ...prev,
            [file.name]: {
              ...prev[file.name],
              progress
            }
          }));
        };

        // Update progress before upload starts
        updateProgress(20);

        // Start upload
        await uploadFile(file);

        // Set final progress
        updateProgress(100);
      }

      const uploadedFiles = Object.values(fileUploads)
        .filter(upload => upload.status === 'completed')
        .map(upload => upload.file);

      onFilesUploaded(uploadedFiles, fileHashes);
      onClose();
    } catch (error) {
      console.error('Failed to confirm uploads:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const areAllUploadsComplete = Object.values(fileUploads).every(
    upload => upload.status === 'completed'
  );

  const hasErrors = Object.values(fileUploads).some(
    upload => upload.status === 'error'
  );

  const EmptyDropzone = ({ isDragActive, ...props }: { isDragActive: boolean } & React.HTMLAttributes<HTMLDivElement>) => (
    <div
      {...props}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer 
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
    >
      <input {...getInputProps()} />
      <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-200">
        Drag and drop files here, or click to select files
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
      </p>
      <div className="mt-2">
        <FileTypeInfo />
      </div>
    </div>
  );

  const FileItem = ({ fileName, upload }: { fileName: string; upload: FileUpload }) => (
    <li key={fileName} className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>{fileName}</span>
        <span className="flex items-center">
          {upload.status === 'completed' ? (
            <span className="text-green-600">Ready to Upload</span>
          ) : (
            <HoverCard>
              <HoverCardTrigger asChild>
                <span className="text-red-600 cursor-help flex items-center gap-1">
                  {upload.status === 'file too large' && `File exceeds ${formatFileSize(MAX_FILE_SIZE)}`}
                  {upload.status === 'invalid filename' && 'Invalid filename'}
                  {upload.status === 'invalid file type' && (
                    <>
                      Unsupported file type
                      <HelpCircle className="h-4 w-4 inline-block" />
                    </>
                  )}
                  {upload.status === 'error' && 'Error'}
                </span>
              </HoverCardTrigger>
              {upload.status === 'invalid file type' && (
                <HoverCardContent className="w-80">
                  <h4 className="font-semibold mb-2">Supported file types:</h4>
                  <div className="text-sm space-y-2">
                    <p><span className="font-medium">Documents:</span> PDF, DOCX, DOC, RTF, ODT</p>
                    <p><span className="font-medium">Spreadsheets:</span> XLSX, XLS, XLSM, CSV, ODS</p>
                    <p><span className="font-medium">Presentations:</span> PPTX, PPT, ODP</p>
                    <p><span className="font-medium">Diagrams:</span> VSD, VSDX, ODG</p>
                    <p><span className="font-medium">Images:</span> PNG, JPG, JPEG, HEIC</p>
                  </div>
                </HoverCardContent>
              )}
            </HoverCard>
          )}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${upload.status === 'error' ? 'bg-red-500' :
              upload.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
            }`}
          style={{ width: `${Math.max(0, upload.progress)}%` }}
        ></div>
      </div>
    </li>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-2/3 max-w-2xl dark:bg-darkbg">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        {Object.keys(fileUploads).length === 0 ? (
          // This is the key change - wrap everything in the dropzone
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer 
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            <input {...getInputProps()} />
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-200">
              Drag and drop files here, or click to select files
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
            </p>
            <div className="mt-2">
              <FileTypeInfo />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2 dark:text-gray-200">Uploading Files:</h3>
              <ScrollArea className="h-[20rem] w-full rounded-md">
                <div className="p-4">
                  <ul className="space-y-4">
                    {Object.entries(fileUploads).map(([fileName, upload]) => (
                      <FileItem key={fileName} fileName={fileName} upload={upload} />
                    ))}
                  </ul>
                </div>
              </ScrollArea>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isConfirming}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={!areAllUploadsComplete || isConfirming || hasErrors}
              >
                {isConfirming ? 'Confirming...' : 'Confirm Uploads'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getCurrentPathString(node: TreeNode): string {
  const pathParts: string[] = [];
  let current = node;
  while (current.name !== 'root') {
    pathParts.unshift(current.name);
    current = current.parent as TreeNode;
  }
  // Remove the first path part and join the rest with forward slashes
  const output = pathParts.slice(1).join('/') + '/';
  return output;
}

export default DragDropOverlay;