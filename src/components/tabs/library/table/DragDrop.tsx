import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, X, Info, HelpCircle, Archive, ChevronRight, Circle, CheckCircle2, Share2 } from 'lucide-react';
import { post } from 'aws-amplify/api';
import { usePathname } from 'next/navigation';
import { useS3Store, TreeNode } from "../../../services/fileService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { TbChevronsDownLeft } from 'react-icons/tb';
import JSZip from 'jszip';
import { Alert, AlertDescription } from '../../../ui/alert';
import ZipPreview from './ZipPreview';
import ZipUploadProgress from './ZipUploadProgress';
import { Button } from "@/components/ui/button";
import { useMicrosoftAuth } from '@/hooks/useMicrosoftAuth';
import { useMsal } from '@azure/msal-react';

declare global {
  interface Window {
    OneDrive: {
      Picker: new (options: any) => any;
    };
  }
}

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
  isZip: boolean;
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
  currentPath = [],
  folderId,
  onRefreshNeeded
}) => {
  const { isAuthenticated, signIn, signOut, user, isLoading: isAuthLoading } = useMicrosoftAuth();
  const { instance } = useMsal();
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
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
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
    const folderIds: FolderMapping = { '/': folderId || 'ROOT' };
    
    try {
      const zipContent = await zip.loadAsync(zipFile);
      
      // First, create all the necessary folders to avoid race conditions
      // Process each file path to ensure folder structure is created
      const filePaths: {path: string, file: JSZip.JSZipObject}[] = [];
      
      for (const [path, file] of Object.entries(zipContent.files)) {
        if (path === '') continue;
        
        // Skip __MACOSX directories and macOS metadata files
        if (path.includes('__MACOSX') || path.startsWith('._') || path.includes('.DS_Store')) continue;
        
        filePaths.push({path, file});
        
        if (!file.dir) {
          const parts = path.split('/').filter(part => part !== '');
          let currentPath = '';
          let parentFolderId = folderId || 'ROOT';
          
          // Process each folder in the path
          const folderParts = parts.slice(0, -1); // All parts except the filename
          
          for (const part of folderParts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            
            // Check if we've already created this folder
            if (!folderIds[currentPath]) {
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
        }
      }
      
      // Now process and upload all the files in parallel
      const fileUploadPromises = filePaths
        .filter(({file}) => !file.dir) // Only process files, not directories
        .map(async ({path, file}) => {
          const parts = path.split('/').filter(part => part !== '');
          const fileName = parts[parts.length - 1];
          const parentPath = parts.slice(0, -1).join('/') || '/';
          const parentFolderId = folderIds[parentPath] || 'ROOT';
          
          try {
            const fileContent = await createFileFromZip(file, path);
            
            // Upload the file to the correct folder
            await uploadFile(fileContent, parentFolderId, bucketUuid);
            
            // Add to extracted items
            extractedItems.push({
              path,
              file: fileContent,
              isDirectory: false,
              level: parts.length,
              parentPath: parentPath
            });
            
            return true;
          } catch (error) {
            console.error(`Error processing ZIP file item ${path}:`, error);
            return false;
          }
        });
      
      // Wait for all file uploads to complete
      await Promise.all(fileUploadPromises);
      
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
  
      if (!selectedZipFile) {
        throw new Error('No ZIP file to process');
      }
      // Process the ZIP file
      await processZipFile(selectedZipFile, bucketUuid);
      
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
    const validFileNameRegex = /^[a-zA-Z0-9\s._()-]+$/;
    return validFileNameRegex.test(fileName);
  };

  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setZipProcessingError(null);
    
    const processFiles = async (files: File[]) => {
      const newUploads: FileUploads = {};
      const processedFiles: File[] = [];
      
      for (const file of files) {
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
          status,
          isZip: file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
        };
        
        if (status === 'completed') {
          processedFiles.push(file);
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

  const handleZipPreview = async (file: File) => {
    setIsProcessingZip(true);
    setSelectedZipFile(file);
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      const validEntries = Object.entries(zipContent.files)
        .filter(([path, _]) => {
          if (path === '') return false;
          if (path.includes('__MACOSX') || path.startsWith('._') || path.includes('.DS_Store')) return false;
          return true;
        });
      
      const itemPromises = validEntries.map(async ([path, zipEntry]) => {
        return {
          path,
          file: await createFileFromZip(zipEntry, path),
          isDirectory: zipEntry.dir,
          level: path.split('/').length,
          parentPath: path.split('/').slice(0, -1).join('/') || '/'
        };
      });
      
      const items = await Promise.all(itemPromises);
      setZipPreviewItems(items);
      setShowZipPreview(true);
    } catch (error) {
      console.error('ZIP processing error:', error);
      setZipProcessingError('Failed to process ZIP file. Please ensure it contains supported file types.');
    } finally {
      setIsProcessingZip(false);
    }
  };

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
    },
    noClick: Object.keys(fileUploads).length > 0 // Disable click when files exist
  });
  const handleConfirmUpload = async () => {
    setIsConfirming(true);
    try {
      // Check if there are any ZIP files
      const zipFiles = pendingFiles.filter(file => 
        file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
      );
      const regularFiles = pendingFiles.filter(file => 
        file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed'
      );

      // Set all pending files to uploading state with 0 progress
      setFileUploads(prev => {
        const updated = { ...prev };
        pendingFiles.forEach(file => {
          updated[file.name] = {
            ...updated[file.name],
            status: 'uploading',
            progress: 0,
            isZip: file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
          };
        });
        return updated;
      });

      // Handle ZIP files first
      for (const zipFile of zipFiles) {
        setSelectedZipFile(zipFile);
        await handleZipUploadConfirm();
      }

      // Handle regular files
      const uploadPromises = regularFiles.map(async (file) => {
        const updateProgress = (progress: number) => {
          setFileUploads(prev => ({
            ...prev,
            [file.name]: {
              ...prev[file.name],
              progress
            }
          }));
        };

        try {
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
          
          return { success: true, file };
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          
          setFileUploads(prev => ({
            ...prev,
            [file.name]: {
              ...prev[file.name],
              status: 'error'
            }
          }));
          
          return { success: false, file };
        }
      });
      
      // Wait for all regular file uploads to complete
      await Promise.all(uploadPromises);

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
    <li key={fileName} className="space-y-2 group relative z-10">
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>{fileName}</span>
        <div className="flex items-center ">
          {upload.isZip && (
            <button
              onClick={() => handleZipPreview(upload.file)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700 flex gap-2 "
            >
              <Archive className="h-4 w-4" />
              <span>Show structure</span>
            </button>
          )}
          <div className="relative">
            {upload.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 transition-opacity duration-300" style={{ opacity: upload.progress === 100 ? 1 : 0 }} />
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
          </div>
        </div>
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

  const handleSharePointUpload = async () => {
    if (!isAuthenticated) {
      try {
        await signIn();
      } catch (error: any) {
        console.error('Sign in error:', error);
        alert('Failed to sign in. Please try again.');
        return;
      }
      return;
    }

    try {
      const accounts = instance.getAllAccounts();
      const account = instance.getActiveAccount() || accounts[0];
      
      if (!account) {
        if (accounts.length > 0) {
          instance.setActiveAccount(accounts[0]);
        } else {
          throw new Error('No active account');
        }
      }

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ['Files.Read', 'Files.Read.All', 'Sites.Read.All'],
        account: account || accounts[0]
      });

      // Fetch files from OneDrive for Business
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/items/root/children?$select=id,name,size,file,folder,webUrl&$filter=folder eq null', {
        headers: {
          'Authorization': `Bearer ${tokenResponse.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OneDrive API Error:', errorData);
        throw new Error(`Failed to fetch files from OneDrive: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const files = data.value;

      // Create a simple file picker UI
      const selectedFiles = await new Promise<any[]>((resolve) => {
        const dialog = document.createElement('div');
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.backgroundColor = 'white';
        dialog.style.padding = '20px';
        dialog.style.borderRadius = '8px';
        dialog.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        dialog.style.zIndex = '1000';
        dialog.style.maxHeight = '80vh';
        dialog.style.overflowY = 'auto';

        const fileList = document.createElement('div');
        fileList.style.marginBottom = '20px';
        fileList.style.maxHeight = '60vh';
        fileList.style.overflowY = 'auto';

        files.forEach((file: any) => {
          const fileItem = document.createElement('div');
          fileItem.style.padding = '10px';
          fileItem.style.borderBottom = '1px solid #eee';
          fileItem.style.cursor = 'pointer';
          fileItem.style.display = 'flex';
          fileItem.style.alignItems = 'center';
          fileItem.style.gap = '10px';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.style.marginRight = '10px';

          const fileName = document.createElement('span');
          fileName.textContent = file.name;

          fileItem.appendChild(checkbox);
          fileItem.appendChild(fileName);
          fileList.appendChild(fileItem);
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';

        const selectButton = document.createElement('button');
        selectButton.textContent = 'Select';
        selectButton.style.padding = '8px 16px';
        selectButton.style.backgroundColor = '#0078d4';
        selectButton.style.color = 'white';
        selectButton.style.border = 'none';
        selectButton.style.borderRadius = '4px';
        selectButton.style.cursor = 'pointer';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.backgroundColor = '#f3f2f1';
        cancelButton.style.border = '1px solid #d1d1d1';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.cursor = 'pointer';

        selectButton.onclick = () => {
          const selectedFiles = Array.from(fileList.querySelectorAll('input[type="checkbox"]:checked'))
            .map((checkbox, index) => files[index]);
          document.body.removeChild(dialog);
          resolve(selectedFiles);
        };

        cancelButton.onclick = () => {
          document.body.removeChild(dialog);
          resolve([]);
        };

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(selectButton);

        dialog.appendChild(fileList);
        dialog.appendChild(buttonContainer);
        document.body.appendChild(dialog);
      });

      if (selectedFiles.length === 0) {
        return;
      }

      const newUploads: FileUploads = {};
      const processedFiles: File[] = [];

      for (const file of selectedFiles) {
        try {
          // Download file content
          const downloadResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`, {
            headers: {
              'Authorization': `Bearer ${tokenResponse.accessToken}`
            }
          });

          if (!downloadResponse.ok) {
            throw new Error(`Failed to download file: ${downloadResponse.statusText}`);
          }

          const blob = await downloadResponse.blob();
          const fileObj = new File([blob], file.name, { type: file.file?.mimeType || 'application/octet-stream' });

          let status: FileUpload['status'] = 'completed';
          
          if (fileObj.size > MAX_FILE_SIZE) {
            status = 'file too large';
          } else if (!isValidFileType(fileObj)) {
            status = 'invalid file type';
          } else if (!isValidFileName(fileObj.name)) {
            status = 'invalid filename';
          }

          newUploads[fileObj.name] = {
            file: fileObj,
            progress: 0,
            status,
            isZip: false
          };

          if (status === 'completed') {
            processedFiles.push(fileObj);
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          newUploads[file.name] = {
            file: new File([], file.name),
            progress: 0,
            status: 'error',
            isZip: false
          };
        }
      }

      // Update state with new files
      if (Object.keys(newUploads).length > 0) {
        setFileUploads(prev => ({
          ...prev,
          ...newUploads
        }));
        
        setPendingFiles(prev => [...prev, ...processedFiles]);
      }

    } catch (error) {
      console.error('Error in SharePoint upload:', error);
    }
  };

  const renderDropzoneContent = () => (
    <div
      {...getRootProps()}
      className={`rounded-lg p-8 text-center transition-all duration-200
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${Object.keys(fileUploads).length > 0 ? 'absolute inset-0 bg-transparent border-0 cursor-default' : 'cursor-pointer'}`}
    >
      <input {...getInputProps()} />
      {isProcessingZip ? (
        <div className="space-y-4">
          {/* <Archive className="mx-auto h-12 w-12 text-blue-500 animate-pulse" />
          <p className="text-sm text-gray-600">Processing ZIP file...</p> */}
        </div>
      ) : Object.keys(fileUploads).length === 0 ? (
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
          <div className="mt-4">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleSharePointUpload}
              disabled={isAuthLoading}
            >
              <Share2 className="h-4 w-4" />
              {isAuthenticated ? `Upload from SharePoint (${user?.name})` : 'Sign in with Microsoft'}
            </Button>
            {isAuthenticated && (
              <Button
                variant="ghost"
                className="mt-2 text-sm text-gray-500"
                onClick={signOut}
              >
                Sign out
              </Button>
            )}
          </div>
        </>
      ) : null}
      {zipProcessingError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{zipProcessingError}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white p-8 rounded-lg shadow-lg w-4/5 max-w-4xl dark:bg-darkbg">
        <div className="absolute top-4 right-4 z-20">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6 dark:text-gray-200" />
          </button>
        </div>
        
        <div className="flex flex-col h-[600px]">
          {/* Title */}
          <h3 className="text-lg font-semibold mb-4 dark:text-gray-200">File Uploading:</h3>
          
          {/* Scrollable file list area */}
          <div className="flex-1 overflow-auto relative">
            {Object.keys(fileUploads).length === 0 ? (
              <div className="h-full">
                {renderDropzoneContent()}
              </div>
            ) : (
              <ScrollArea className="h-full ">
                <div className="p-4 ">
                  <ul className="space-y-4">
                    {Object.entries(fileUploads).map(([fileName, upload]) => (
                      <FileItem key={fileName} fileName={fileName} upload={upload} />
                    ))}
                  </ul>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Fixed bottom buttons */}
          <div className="mt-4 flex justify-end space-x-4 border-t pt-4 relative z-20">
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

          {/* ZIP Preview Overlay */}
          {showZipPreview && (
            <div className="absolute inset-0 bg-white dark:bg-darkbg rounded-lg shadow-lg transform transition-transform duration-300 ease-in-out z-30 flex flex-col"
                 style={{ 
                   transform: showZipPreview ? 'translateX(0)' : 'translateX(-100%)',
                   left: '0',
                   right: 'auto',
                   width: '100%'
                 }}>
              <div className="flex justify-between items-center p-4 border-b">
                <button
                  onClick={() => setShowZipPreview(false)}
                  className="text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  <span>Back</span>
                </button>
              </div>
              <div className="flex-1 p-4 min-h-0">
                <ZipPreview
                  items={zipPreviewItems}
                  onUpload={() => {
                    setShowZipPreview(false);
                    handleZipUploadConfirm();
                  }}
                  onCancel={() => setShowZipPreview(false)}
                />
              </div>
            </div>
          )}
        </div>
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