import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { v4 as uuidv4 } from 'uuid';

const S3_BUCKET_NAME = 'vdr-documents';
const REGION = 'us-east-1';

interface DragDropOverlayProps {
  onClose: () => void;
  onFilesUploaded: (files: Payment[]) => void;
}

interface FileWithProgress extends File {
  progress: number;
}

interface Payment {
  id: string;
  type: string;
  name: string;
  status: "pending" | "processing" | "success" | "failed";
  size: string;
  date: string;
  uploadedBy: string;
  s3Key?: string;
}

const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ onClose, onFilesUploaded }) => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');

  React.useEffect(() => {
    getCurrentUser().then(userInfo => setCurrentUser(userInfo.username));
  }, []);

  const getS3Client = async () => {
    try {
      const { credentials } = await fetchAuthSession();
      
      if (!credentials) {
        throw new Error('No credentials available');
      }

      return new S3Client({
        region: REGION,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });
    } catch (error) {
      console.error('Error getting credentials:', error);
      throw error;
    }
  };

  const getUserPrefix = async () => {
    try {
      const { identityId } = await fetchAuthSession();
      if (!identityId) {
        throw new Error('No identity ID available');
      }
      return `${identityId}/`;
    } catch (error) {
      console.error('Error getting user prefix:', error);
      throw error;
    }
  };

  const uploadToS3WithProgress = async (
    file: File | undefined, 
    onProgress: (progress: number) => void
  ): Promise<string> => {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    const fileExtension = getFileExtension(file.name);
    const userPrefix = await getUserPrefix();
    const s3Key = `${userPrefix}files/${uuidv4()}.${fileExtension}`;

    try {
      const s3Client = await getS3Client();
      
      // Create a wrapper that can track progress
      const upload = async () => {
        let uploadedBytes = 0;
        const fileStream = file.stream();
        const reader = fileStream.getReader();
        const totalBytes = file.size;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          uploadedBytes += value.length;
          const progress = Math.round((uploadedBytes / totalBytes) * 100);
          onProgress(progress);
        }

        // Combine all chunks
        const combinedChunks = new Uint8Array(uploadedBytes);
        let position = 0;
        for (const chunk of chunks) {
          combinedChunks.set(chunk, position);
          position += chunk.length;
        }

        const command = new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: combinedChunks,
          ContentType: file.type,
          Metadata: {
            uploadedBy: currentUser,
            originalName: file.name
          }
        });

        await s3Client.send(command);
      };

      await upload();
      return s3Key;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filesWithProgress = acceptedFiles.map(file => ({
      ...file,
      progress: 0
    }));
    setFiles(filesWithProgress);
    handleUpload(filesWithProgress);
  }, [currentUser]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const getFileExtension = (fileName: string | undefined): string => {
    if (!fileName) return 'Unknown';
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() || 'Unknown' : 'Unknown';
  };

  const formatFileSize = (size: number | undefined): string => {
    if (typeof size !== 'number') return '0 MB';
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };


  const handleUpload = async (filesToUpload: FileWithProgress[]) => {
    setIsUploading(true);
    const uploadResults: Payment[] = [];

    try {
      for (const file of filesToUpload) {
        try {
          const s3Key = await uploadToS3WithProgress(file, (progress) => {
            setFiles(currentFiles => 
              currentFiles.map(f => 
                f === file ? { ...f, progress } : f
              )
            );
          });

          uploadResults.push({
            id: uuidv4(),
            type: getFileExtension(file?.name),
            name: file?.name || 'Unknown File',
            status: "success",
            size: formatFileSize(file?.size),
            date: new Date().toISOString().split('T')[0],
            uploadedBy: currentUser,
            s3Key: s3Key
          });
        } catch (error) {
          console.error(`Error uploading file:`, error);
          uploadResults.push({
            id: uuidv4(),
            type: getFileExtension(file?.name),
            name: file?.name || 'Unknown File',
            status: "failed",
            size: formatFileSize(file?.size),
            date: new Date().toISOString().split('T')[0],
            uploadedBy: currentUser
          });
        }
      }
    } finally {
      setIsUploading(false);
    }

    return uploadResults;
  };

  const handleConfirmUpload = async () => {
    const results = await handleUpload(files);
    onFilesUploaded(results);
    onClose();
  };

  const getTotalProgress = () => {
    if (files.length === 0) return 0;
    const totalProgress = files.reduce((sum, file) => sum + file.progress, 0);
    return Math.round(totalProgress / files.length);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-2/3 max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Files</h2>
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
            <h3 className="text-lg font-semibold mb-2">Uploading Files:</h3>
            <ul className="space-y-4">
              {files.map((file, index) => (
                <li key={index} className="text-sm text-gray-600">
                  <div className="flex justify-between mb-1">
                    <span>{file.name}</span>
                    <span>{file.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                </li>
              ))}
            </ul>
            
            <div className="mt-6">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-semibold">Total Progress</span>
                <span className="text-sm font-semibold">{getTotalProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${getTotalProgress()}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isUploading || getTotalProgress() < 100}
              >
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropOverlay;