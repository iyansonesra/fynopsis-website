import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, X } from 'lucide-react';
import { post } from 'aws-amplify/api';
import { usePathname } from 'next/navigation';
import { useS3Store, TreeNode } from "./fileService";

interface DragDropOverlayProps {
  onClose: () => void;
  onFilesUploaded: (files: File[]) => void;
}

interface FileUpload {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error' | 'invalid filename' | 'file too large' | 'invalid file type';
}

interface FileUploads {
  [key: string]: FileUpload;
}

interface DragDropOverlayProps {
  onClose: () => void;
  onFilesUploaded: (files: File[]) => void;
  currentPath?: string[];  // Add current path prop
}


const isValidFileType = (file: File): boolean => {
  return ALLOWED_FILE_TYPES.includes(file.type);
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];


const DragDropOverlay: React.FC<DragDropOverlayProps> = ({
  onClose,
  onFilesUploaded,
  currentPath = [] // Default to empty array for root folder
}) => {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileUploads, setFileUploads] = useState<FileUploads>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const pathname = usePathname();
  const bucketUuid = pathname.split('/').pop() || '';

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
      if(fullPath === '/') {
        filePathOut = filePathOut.slice(1);
      }

      

      console.log('filePathOut:', filePathOut);


      // Get presigned URL from API with the full path
      const getUrlResponse = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/upload-url`,
        options: {
          withCredentials: true,
          body: JSON.stringify({
            filePath: filePathOut,
            contentType: file.type
          })
        }
      });

      const { body } = await getUrlResponse.response;
      const responseText = await body.text();
      const { signedUrl } = JSON.parse(responseText);

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

      onFilesUploaded(uploadedFiles);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-2/3 max-w-2xl dark:bg-darkbg">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        {Object.keys(fileUploads).length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
          >
            <input {...getInputProps()} />
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-200">
              Drag and drop files here, or click to select files
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2 dark:text-gray-200">Uploading Files:</h3>
            <ul className="space-y-4">
              {Object.entries(fileUploads).map(([fileName, upload]) => (
                <li key={fileName} className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{fileName}</span>
                    <span className="flex items-center">
                      {upload.status === 'completed' ? (
                        <span className="text-green-600">Ready to Upload</span>
                      ) : (
                        <span className="text-red-600">
                          {upload.status === 'file too large' && 'File exceeds 100MB limit'}
                          {upload.status === 'invalid filename' && 'Invalid filename - use only letters, numbers, spaces, dots, underscores, or hyphens'}
                          {upload.status === 'invalid file type' && 'Only PDF and Excel files are allowed'}
                          {upload.status === 'error' && 'Error'}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${upload.status === 'error'
                          ? 'bg-red-500'
                          : upload.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                      style={{ width: `${Math.max(0, upload.progress)}%` }}
                    ></div>
                  </div>
                </li>
              ))}
            </ul>
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