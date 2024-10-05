import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';

interface DragDropOverlayProps {
  onClose: () => void;
  onFilesUploaded: (files: File[]) => void;
}

const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ onClose, onFilesUploaded }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    simulateUpload();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prevProgress + 10;
      });
    }, 500);
  };

  const handleConfirmUpload = () => {
    onFilesUploaded(files);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-2/3 max-w-2xl">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        {files.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop files here, or click to select files
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Uploaded File:</h3>
            <ul>
              {files.map((file, index) => (
                <li key={index} className="text-sm text-gray-600">{file.name}</li>
              ))}
            </ul>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {isUploading ? 'Uploading...' : 'Upload complete'}
              </p>
            </div>
            <button
              onClick={handleConfirmUpload}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={isUploading}
            >
              Confirm Upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropOverlay;