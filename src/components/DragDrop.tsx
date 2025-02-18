import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, X, Info, HelpCircle, Archive } from 'lucide-react';
import { post } from 'aws-amplify/api';
import { usePathname } from 'next/navigation';
import { useS3Store, TreeNode } from "./fileService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TbChevronsDownLeft } from 'react-icons/tb';
import JSZip from 'jszip';
import { Alert, AlertDescription } from './ui/alert';
import ZipPreview from './ZipPreview';
import ZipUploadProgress from './ZipUploadProgress';


interface DragDropOverlayProps {
  onClose: () => void;
  onFilesUploaded: (files: File[], fileHashes: FileHashMapping) => void;
  currentPath?: string[];  // Add current path prop
  folderId?: string;
  onRefreshNeeded?: () => void; // Add new callback prop
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

  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

interface ExtractedFile {
  path: string;
  file: File;
  isDirectory: boolean;
}

interface FolderMapping {
  [path: string]: string; // path -> folderId mapping
}



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
  folderId,
  onRefreshNeeded
}) => {
  const fileHashes: FileHashMapping = {}; 
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileUploads, setFileUploads] = useState<FileUploads>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const pathname = usePathname() ?? '';
  const pathArray = pathname.split('/');
  const bucketUuid = pathArray[2] || '';
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipProcessingError, setZipProcessingError] = useState<string | null>(null);
  const [zipPreviewItems, setZipPreviewItems] = useState<ProcessedItem[]>([]);
const [showZipPreview, setShowZipPreview] = useState(false);
  const [zipFileStore, setZipFileStore] = useState<File | null>(null);
  const [isUploadingZip, setIsUploadingZip] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  interface ProcessedItem {
    path: string;
    file: File;
    isDirectory: boolean;
    level: number;
    parentPath: string;
  }
  
  const processZipFile = async (zipFile: File, bucketUuid: string): Promise<ExtractedFile[]> => {
    const zip = new JSZip();
    const extractedItems: ProcessedItem[] = [];
    const folderIds: FolderMapping = { '/': 'ROOT' };
    
    try {
      const zipContent = await zip.loadAsync(zipFile);
      
      // Process each file path
      for (const [path, file] of Object.entries(zipContent.files)) {
        if (path === '') continue;
        console.log("Processing path:", path);
        
        const parts = path.split('/').filter(part => part !== '');
        let currentPath = '';
        let parentFolderId = 'ROOT';
        
        // Process each part of the path except the last one if it's a file
        const partsToProcess = file.dir ? parts : parts.slice(0, -1);
        
        // Create or verify each folder in the path
        for (const part of partsToProcess) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          console.log("currentPath:", currentPath);
          
          // Check if we've already created this folder
          if (!folderIds[currentPath]) {
            console.log(`Creating folder: ${part} in parent: ${parentFolderId}`);
            const newFolderId = await createFolder(part, parentFolderId, bucketUuid);
            folderIds[currentPath] = newFolderId;
            
            // Add to extracted items
            extractedItems.push({
              path: currentPath,
              file: new File([], currentPath),
              isDirectory: true,
              level: currentPath.split('/').length,
              parentPath: currentPath.split('/').slice(0, -1).join('/') || '/'
            });
          }
          
          // Update parent folder ID for next iteration
          parentFolderId = folderIds[currentPath];
        }
        
        // If this is a file, process it
        if (!file.dir) {
          const fileName = parts[parts.length - 1];
          console.log(`Processing file: ${fileName} in folder: ${parentFolderId}`);
          
          const fileContent = await createFileFromZip(file, path);
          
          // Upload the file to the correct folder
          await uploadFile(fileContent, parentFolderId, bucketUuid);
          
          // Add to extracted items
          extractedItems.push({
            path,
            file: fileContent,
            isDirectory: false,
            level: parts.length,
            parentPath: parts.slice(0, -1).join('/') || '/'
          });
        }
      }
      
      return extractedItems;
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      throw new Error('Failed to process ZIP file');
    }
  };

  const handleZipUploadConfirm = async () => {
    setShowZipPreview(false);
    setIsUploadingZip(true);
    setUploadProgress(0);
    
    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
  
      if (!zipFileStore) {
        throw new Error('No ZIP file to process');
      }
      // Process the ZIP file
      await processZipFile(zipFileStore, bucketUuid);
      
      // Clear interval and set to 100%
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Wait for animation to complete
      setTimeout(() => {
        setIsUploadingZip(false);
        onClose();
        onRefreshNeeded?.(); 
      }, 500);

    } catch (error) {
      console.error('Error processing ZIP:', error);
      setZipProcessingError('Failed to process ZIP file');
      setIsUploadingZip(false);
    }
  };
  
  // Helper function to create a file from zip entry
  const createFileFromZip = async (zipEntry: JSZip.JSZipObject, path: string): Promise<File> => {
    const content = await zipEntry.async('blob');
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const mimeType = Object.entries(ALLOWED_FILE_TYPES).find(([_, extensions]) => 
      extensions.split(',').some(e => e.toLowerCase() === `.${ext}`)
    )?.[0] || 'application/octet-stream';
    
    return new File([content], path.split('/').pop()!, { type: mimeType });
  };
  
  // Helper function to create a folder
  const createFolder = async (name: string, parentFolderId: string, bucketUuid: string): Promise<string> => {
    console.log("createFolder", name, parentFolderId, bucketUuid);
    
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/create-folder`,
        options: {
          withCredentials: true,
          body: {
            folderName: name,
            parentFolderId
          }
        }
      });
  
      const { body } = await response.response;
      const result = await body.json();
      if(result) {
        const response = result as { folderId: string };
        return response.folderId;
      }
      throw new Error('No folder ID returned from server'); 
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };

  const getFullPath = (fileName: string) => {
    if (currentPath.length === 0) {
      return fileName;
    }
    // Join current path with filename, ensuring proper formatting
    return `${currentPath.join('/')}/${fileName}`;
  };

  const uploadFile = async (file: File, parentFolderId: string, bucketUuid: string) => {
    try {
      // Get presigned URL from API with the folder ID
      const getUrlResponse = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/upload-url`,
        options: {
          withCredentials: true,
          body: {
            fileName: file.name,
            folderId: parentFolderId, // Use the provided parent folder ID
            contentType: file.type,
          }
        }
      });
  
      const { body } = await getUrlResponse.response;
      const responseText = await body.text();
      const { signedUrl, fileHash, fileName } = JSON.parse(responseText);
  
      const fileKey = `${fileName}-${file.size}`;
      fileHashes[fileKey] = fileHash;
  
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
        throw new Error(`Upload failed: ${await uploadResponse.text()}`);
      }
  
      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const isValidFileName = (fileName: string): boolean => {
    // Regex to check for special characters and slashes
    console.log('fileName:', fileName);
    const validFileNameRegex = /^[a-zA-Z0-9\s._()-]+$/;
    return validFileNameRegex.test(fileName);
  };

  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setZipProcessingError(null);
    
    const processFiles = async (files: File[]) => {
      const newUploads: FileUploads = {};
      const processedFiles: File[] = [];
      
      for (const file of files) {
        if (file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
          setIsProcessingZip(true);
          setZipFileStore(file);
          try {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(file);
            const items: ProcessedItem[] = [];
            
            for (const [path, zipEntry] of Object.entries(zipContent.files)) {
              if (path === '') continue;
              
              items.push({
                path,
                file: await createFileFromZip(zipEntry, path),
                isDirectory: zipEntry.dir,
                level: path.split('/').length,
                parentPath: path.split('/').slice(0, -1).join('/') || '/'
              });
            }
            
            setZipPreviewItems(items);
            setShowZipPreview(true);
          } catch (error) {
            console.error('ZIP processing error:', error);
            setZipProcessingError('Failed to process ZIP file. Please ensure it contains supported file types.');
          } finally {
            setIsProcessingZip(false);
          }
        } else {
          let status: FileUpload['status'] = 'completed';
          
          if (file.size > MAX_FILE_SIZE) {
            status = 'file too large';
          } else if (!isValidFileType(file)) {
            status = 'invalid file type';
          } else if (!isValidFileName(file.name)) {
            status = 'invalid filename';
          }
          
          newUploads[file.name] = {
            file,
            progress: 0,
            status
          };
          
          if (status === 'completed') {
            processedFiles.push(file);
          }
        }
      }
      
      // Only update state if we have valid files
      if (Object.keys(newUploads).length > 0) {
        setFileUploads(prev => ({
          ...prev,
          ...newUploads
        }));
        
        setPendingFiles(prev => [...prev, ...processedFiles]);
      }
    };
    
    await processFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      ...Object.fromEntries(
        Object.entries(ALLOWED_FILE_TYPES).map(([mimeType, extensions]) => 
          [mimeType, extensions.split(',')]
        )
      )
    }
  });
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
        const updateProgress = (progress: number) => {
          setFileUploads(prev => ({
            ...prev,
            [file.name]: {
              ...prev[file.name],
              progress
            }
          }));
        };
  
        updateProgress(20);
        
        // Use the provided folderId or 'ROOT' as default
        await uploadFile(file, folderId || 'ROOT', bucketUuid);
        
        updateProgress(100);
        
        setFileUploads(prev => ({
          ...prev,
          [file.name]: {
            ...prev[file.name],
            status: 'completed'
          }
        }));
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

  const renderDropzoneContent = () => (
    <div
      {...getRootProps()}
      className={` rounded-lg p-8 text-center cursor-pointer 
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
    >
      <input {...getInputProps()} />
      {isProcessingZip ? (
        <div className="space-y-4">
          <Archive className="mx-auto h-12 w-12 text-blue-500 animate-pulse" />
          <p className="text-sm text-gray-600">Processing ZIP file...</p>
          {/* <Progress value={undefined} className="w-1/2 mx-auto" /> */}
        </div>
      ) : (
        <>
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-200">
            Drag and drop files or ZIP archives here, or click to select
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
          </p>
          <div className="mt-2">
            <FileTypeInfo />
          </div>
        </>
      )}
      {zipProcessingError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{zipProcessingError}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white p-8 rounded-lg shadow-lg w-2/3 max-w-2xl dark:bg-darkbg">
        <div className="absolute top-4 right-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6 dark:text-gray-200" />
          </button>
        </div>
        {isUploadingZip ? (
        <ZipUploadProgress progress={uploadProgress} />
      ) : showZipPreview ? (
        <ZipPreview
          items={zipPreviewItems}
          onUpload={handleZipUploadConfirm}
          onCancel={() => setShowZipPreview(false)}
        />
      ) : Object.keys(fileUploads).length === 0 ? (
          // This is the key change - wrap everything in the dropzone
          renderDropzoneContent()

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