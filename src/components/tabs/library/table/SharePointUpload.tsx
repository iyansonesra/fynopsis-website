import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/config/authConfig';
import { usePathname } from 'next/navigation';
import { post } from 'aws-amplify/api';
import { Upload as UploadIcon, X, Folder, File } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from '../../../ui/alert';

interface SharePointUploadProps {
  onClose: () => void;
  onFilesUploaded: (files: File[], fileHashes: { [key: string]: string }) => void;
  folderId?: string;
  onRefreshNeeded?: () => void;
}

interface SharePointItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: string;
  webUrl?: string;
  parentReference?: {
    id: string;
  };
}

const SharePointUpload: React.FC<SharePointUploadProps> = ({
  onClose,
  onFilesUploaded,
  folderId,
  onRefreshNeeded
}) => {
  const { instance, accounts } = useMsal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<SharePointItem | null>(null);
  const [items, setItems] = useState<SharePointItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SharePointItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname() ?? '';
  const pathArray = pathname.split('/');
  const bucketUuid = pathArray[2] || '';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        });
        setIsAuthenticated(true);
        fetchRootItems();
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    if (accounts.length > 0) {
      checkAuth();
    }
  }, [accounts, instance]);

  const fetchRootItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch SharePoint items');
      }

      const data = await response.json();
      setItems(data.value);
      setCurrentFolder({
        id: 'root',
        name: 'Root',
        type: 'folder'
      });
    } catch (error) {
      setError('Failed to load SharePoint items');
      console.error('Error fetching SharePoint items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAccessToken = async () => {
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0]
    });
    return response.accessToken;
  };

  const fetchFolderItems = async (folderId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`, {
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch folder items');
      }

      const data = await response.json();
      setItems(data.value);
    } catch (error) {
      setError('Failed to load folder items');
      console.error('Error fetching folder items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folder: SharePointItem) => {
    setCurrentFolder(folder);
    fetchFolderItems(folder.id);
  };

  const handleFileSelect = (file: SharePointItem) => {
    setSelectedFiles(prev => {
      if (prev.some(f => f.id === file.id)) {
        return prev.filter(f => f.id !== file.id);
      }
      return [...prev, file];
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setIsLoading(true);
      const fileHashes: { [key: string]: string } = {};
      
      for (const file of selectedFiles) {
        // Get file content
        const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`, {
          headers: {
            'Authorization': `Bearer ${await getAccessToken()}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to download file: ${file.name}`);
        }

        const blob = await response.blob();
        const fileObj = new File([blob], file.name, { type: blob.type });

        // Upload to S3
        const uploadResponse = await post({
          apiName: 'S3_API',
          path: `/s3/${bucketUuid}/upload-url`,
          options: {
            withCredentials: true,
            body: {
              fileName: file.name,
              folderId: folderId || 'ROOT',
              contentType: blob.type,
            }
          }
        });

        const { body } = await uploadResponse.response;
        const responseText = await body.text();
        const { signedUrl, fileHash, fileName } = JSON.parse(responseText);

        const fileKey = `${fileName}-${file.size}`;
        fileHashes[fileKey] = fileHash;

        // Upload to S3 using presigned URL
        await fetch(signedUrl, {
          method: 'PUT',
          body: fileObj,
          headers: {
            'Content-Type': blob.type,
            'Content-Length': file.size?.toString() || '0',
          },
        });
      }

      onFilesUploaded(selectedFiles.map(f => new File([], f.name)), fileHashes);
      onClose();
      onRefreshNeeded?.();
    } catch (error) {
      setError('Failed to upload files');
      console.error('Error uploading files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentFolder?.parentReference?.id) {
      fetchFolderItems(currentFolder.parentReference.id);
    } else {
      fetchRootItems();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg w-4/5 max-w-4xl dark:bg-darkbg">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Connect to SharePoint</h2>
            <p className="mb-4">You need to sign in to your Microsoft account to access SharePoint files.</p>
            <Button
              onClick={() => instance.loginPopup(loginRequest)}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Sign in with Microsoft
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-4/5 max-w-4xl dark:bg-darkbg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Select Files from SharePoint</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[600px]">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center mb-4">
              {currentFolder && currentFolder.id !== 'root' && (
                <Button
                  onClick={handleBack}
                  variant="ghost"
                  className="mr-2"
                >
                  Back
                </Button>
              )}
              <span className="text-sm text-gray-600">
                Current folder: {currentFolder?.name}
              </span>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          selectedFiles.some(f => f.id === item.id) ? 'bg-blue-50 dark:bg-blue-900' : ''
                        }`}
                        onClick={() => item.type === 'folder' ? handleFolderClick(item) : handleFileSelect(item)}
                      >
                        {item.type === 'folder' ? (
                          <Folder className="h-5 w-5 text-blue-500 mr-2" />
                        ) : (
                          <File className="h-5 w-5 text-gray-500 mr-2" />
                        )}
                        <span className="flex-1">{item.name}</span>
                        {item.type === 'file' && item.size && (
                          <span className="text-sm text-gray-500">
                            {(item.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-4 flex justify-end space-x-4">
              <Button
                onClick={onClose}
                variant="outline"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isLoading}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                {isLoading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePointUpload; 