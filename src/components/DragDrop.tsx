import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, X } from 'lucide-react';
import { post } from 'aws-amplify/api';
import { usePathname } from 'next/navigation';
interface DragDropOverlayProps {
  onClose: () => void;
  onFilesUploaded: (files: File[]) => void;
}

interface FileUpload {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

interface FileUploads {
  [key: string]: FileUpload;
}

const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ onClose, onFilesUploaded }) => {
  const [fileUploads, setFileUploads] = useState<FileUploads>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const pathname = usePathname();
  const bucketUuid = pathname.split('/').pop() || '';

  const uploadFile = async (file: File) => {
    try {
      // Get presigned URL from API
      const getUrlResponse = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/upload-url`,
        options: {
          withCredentials: true,
          body: JSON.stringify({
            filePath: file.name,
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

      // After successful S3 upload, trigger post-upload processing
      await post({
        apiName: 'S3_API', 
        path: `/s3/${bucketUuid}/post-upload`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            filePaths: [file.name]
          }
        }
      });

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
          status: 'error'
        }
      }));
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.reduce((acc, file) => {
      acc[file.name] = {
        file,
        progress: 0,
        status: 'uploading'
      };
      return acc;
    }, {} as FileUploads);

    setFileUploads(prev => ({
      ...prev,
      ...newUploads
    }));

    // Start uploads immediately
    for (const file of acceptedFiles) {
      await uploadFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleConfirmUpload = async () => {
    setIsConfirming(true);
    try {
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
      <div className="bg-white p-8 rounded-lg shadow-lg w-2/3 max-w-2xl">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        {Object.keys(fileUploads).length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop files here, or click to select files
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Uploading Files:</h3>
            <ul className="space-y-4">
              {Object.entries(fileUploads).map(([fileName, upload]) => (
                <li key={fileName} className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{fileName}</span>
                    <span className="flex items-center">
                      {upload.status === 'completed' ? (
                        <span className="text-green-600">Completed</span>
                      ) : upload.status === 'error' ? (
                        <span className="text-red-600">Error</span>
                      ) : (
                        'Uploading...'
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        upload.status === 'error' 
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

export default DragDropOverlay;