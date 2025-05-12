import React from 'react';
import { File, FolderIcon } from 'lucide-react';

interface ZipUploadProgressProps {
  progress: number;
}

const ZipUploadProgress: React.FC<ZipUploadProgressProps> = ({ progress }) => {
  return (
    <div className="space-y-6 p-4">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold dark:text-gray-200">Uploading ZIP Contents</h3>
        <div className="flex justify-center space-x-4">
          <div className="animate-bounce delay-100">
            <FolderIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="animate-bounce delay-200">
            <File className="h-8 w-8 text-blue-500" />
          </div>
          <div className="animate-bounce delay-300">
            <FolderIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Processing and uploading files...
        </p>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-center text-sm text-gray-600">
        {progress}% Complete
      </div>
    </div>
  );
};

export default ZipUploadProgress;