import React, { useRef, useState, useEffect } from "react";
import { CreateHandler, Tree } from "react-arborist";
import Node from "./Node";
import { TbFolderPlus } from "react-icons/tb";
import { AiOutlineFileAdd } from "react-icons/ai";
import { fetchAuthSession } from 'aws-amplify/auth';
import { S3Client } from "@aws-sdk/client-s3";
import { usePathname } from 'next/navigation';
import { get, post } from "aws-amplify/api";
import { ScrollArea } from "../ui/scroll-area";

interface TreeFolderProps {
  onFileSelect: (file: any) => void;
}

interface S3Object {
  key: string;
  metadata: any;
}

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  isFolder?: boolean;
  metadata?: {
    ContentLength?: number;
    LastModified?: string;
    uploadedby?: string;
    [key: string]: any;
  };
}


const S3_BUCKET_NAME = 'vdr-documents';
const REGION = 'us-east-1';

const transformS3DataToTree = (headObjects: S3Object[]): TreeNode[] => {
  const root: TreeNode = { id: 'root', name: 'root', children: [] };
  const pathMap = new Map<string, TreeNode>();
  pathMap.set('', root);

  const sortedObjects = headObjects.sort((a, b) => a.key.localeCompare(b.key));

  sortedObjects.forEach((obj) => {
    const keyWithoutPrefix = obj.key.split('/').slice(1).join('/');
    const paths = keyWithoutPrefix.split('/');
    let currentPath = '';

    paths.forEach((segment, index) => {
      if (!segment && index === paths.length - 1) return;

      const prevPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!pathMap.has(currentPath)) {
        const isFolder = index < paths.length - 1 || obj.key.endsWith('/');
        const newNode: TreeNode = {
          id: currentPath,
          name: segment,
          children: isFolder ? [] : undefined,
          isFolder: isFolder,
          metadata: isFolder ? undefined : obj.metadata
        };

        const parentNode = pathMap.get(prevPath);
        if (parentNode && parentNode.children) {
          parentNode.children.push(newNode);
        }
        pathMap.set(currentPath, newNode);
      }
    });
  });

  return root.children || [];
}


const TreeFolder: React.FC<TreeFolderProps> = ({ onFileSelect }) => {
  const [term, setTerm] = useState<string>("");
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const treeRef = useRef(null);
  const pathname = usePathname();
  const bucketUuid = pathname.split('/').pop() || '';

  const getS3Client = async () => {
    try {
      const { credentials } = await fetchAuthSession();
      if (!credentials) throw new Error('No credentials available');
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

  const listS3Objects = async () => {
    setIsLoading(true);
    try {
      await getS3Client();
      const restOperation = get({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/head-objects-for-bucket`,
        options: { withCredentials: true }
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);

      if (response.headObjects) {
        console.log('S3 objects:', response.headObjects);
        const transformedData = transformS3DataToTree(response.headObjects);
        console.log('Transformed tree data:', transformedData);
        setTreeData(transformedData);
      }
    } catch (error) {
      console.error('Error listing S3 objects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    listS3Objects();
  }, [bucketUuid]);

  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedNode, setLastClickedNode] = useState<any>(null);

  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [treeKey, setTreeKey] = useState(0);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);


  const handleCreateFolder = () => {
    setShowFolderInput(true);
  };

  const handleFolderNameSubmit = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    setFolderError(null);

    try {
      await createFolder(`${newFolderName.trim()}/`);

      const newFolder: TreeNode = {
        id: `${newFolderName.trim()}`,
        name: newFolderName.trim(),
        children: [],
        isFolder: true
      };

      setTreeData(prevData => [...prevData, newFolder]);
      setTreeKey(prev => prev + 1);
      setNewFolderName('');
      setShowFolderInput(false);
      await listS3Objects();
    } catch (error) {
      setFolderError('Failed to create folder. Please try again.');
      console.error('Error creating folder:', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const createFolder = async (folderPath: string) => {
    console.log('Creating folder:', folderPath);
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/create-folder`,
        options: {
          withCredentials: true,
          body: {
            folderPath: folderPath  // e.g. 'documents/subfolder/'
          }
        }
      });

      const { body } = await response.response;
      const result = await body.json();

      console.log('Folder created successfully:', result);
      return result;

    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };

  const moveFile = async (sourceKey: string, destinationKey: string) => {
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/move-url`,
        options: {
          withCredentials: true,
          body: {
            sourceKey: sourceKey,      // e.g. 'folder1/oldfile.pdf'
            destinationKey: destinationKey  // e.g. 'folder2/newfile.pdf'
          }
        }
      });
  
      const { body } = await response.response;
      const result = await body.json();
      
      console.log('File moved successfully:', result);
      return result;
  
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  };

  const findAndRemoveItem = (items: TreeNode[], id: string): TreeNode | null => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        return items.splice(i, 1)[0];
      }
      if (items[i].children) {
        const found = findAndRemoveItem(items[i].children!, id);
        if (found) return found;
      }
    }
    return null;
  };

  const findItem = (items: TreeNode[], id: string): TreeNode | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItem(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };


  const handleMove = async ({ dragIds, parentId, index }: any) => {
    try {
      setTreeData(prevData => {
        const newData = [...prevData];
        const draggedItems = dragIds.map((id: string) => {
          const item = findAndRemoveItem(newData, id);
          return item;
        }).filter(Boolean);
  
        // Handle S3 file movement
        draggedItems.forEach(async (item: TreeNode) => {
          if (!item.isFolder) {
            const sourceKey = item.id;
            const destinationKey = parentId 
              ? `${parentId}/${item.name}`
              : item.name;
  
            try {
              console.log('Moving file:', sourceKey, 'to', destinationKey);
              await moveFile(sourceKey, destinationKey);
            } catch (error) {
              console.error('Error moving file:', error);
              // Optionally handle the error UI feedback here
            }
          }
        });
  
        // Update local tree structure
        if (parentId) {
          const parent = findItem(newData, parentId);
          if (parent && parent.children) {
            parent.children.splice(index, 0, ...draggedItems);
          }
        } else {
          newData.splice(index, 0, ...draggedItems);
        }
  
        return newData;
      });
    } catch (error) {
      console.error('Error in handleMove:', error);
      // Optionally add error handling UI feedback
    }
  };

  const deleteItem = async (key: string) => {
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/delete-url`,
        options: {
          withCredentials: true,
          queryParams: {
            key: key // e.g. 'documents/file.pdf' or 'documents/subfolder/'
          }
        }
      });
  
      const { body } = await response.response;
      const result = await body.json();
      
      console.log('Item deleted successfully:', result);
      return result;
  
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  };
  

  // Replace your handleTest function with this
  const handleTest = () => {
    handleCreateFolder();
  };

  // Define the proper return type for created nodes
  interface IdObj {
    id: string;
    name: string;
    children?: IdObj[];
  }

  // Modify the folder creation handler

  const handleNodeClick = async (node: any) => {
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastClickTime;

    // Check if same node was clicked within 300ms
    if (timeDiff < 300 && lastClickedNode?.data.id === node.data.id) {
      // Double click detected
      if (!node.isFolder) {
        try {
          const s3Key = `${bucketUuid}/${node.data.id}`;

          const downloadResponse = await get({
            apiName: 'S3_API',
            path: `/s3/${bucketUuid}/download-url`,
            options: {
              withCredentials: true,
              queryParams: { path: s3Key }
            }
          });

          const { body } = await downloadResponse.response;
          const responseText = await body.text();
          const { signedUrl } = JSON.parse(responseText);

          const fileObject = {
            id: node.data.id,
            name: node.data.name,
            s3Url: signedUrl,
            type: node.data.name.split('.').pop()?.toUpperCase() || 'Unknown',
            size: node.data.metadata?.ContentLength || 0,
            status: "success" as const,
            date: node.data.metadata?.LastModified?.split('T')[0] || '',
            uploadedBy: node.data.metadata?.uploadedby || 'Unknown',
            s3Key: s3Key
          };

          onFileSelect(fileObject);
        } catch (error) {
          console.error('Error getting signed URL:', error);
        }
      }
    }

    // Update last click time and node
    setLastClickTime(currentTime);
    setLastClickedNode(node);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <ScrollArea className="overflow-hidden w-full h-full font-montserrat px-3">
      <input
        type="text"
        placeholder="Search..."
        className="search-input w-full p-2 mb-2 border rounded font-montserrat"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <div className="ml-2 folderFileActions mb-2">
        <button
          onClick={() => handleTest()}
          title="New Folder..."
          className="p-1 hover:bg-gray-100 rounded"
        >
          <TbFolderPlus />
        </button>
        <button
          onClick={() => treeRef.current?.createLeaf()}
          title="New File..."
          className="p-1 hover:bg-gray-100 rounded"
        >
          <AiOutlineFileAdd />
        </button>
      </div>
      <div className="tree-container">
        {treeData.length > 0 ? (
         <Tree
         ref={treeRef}
         data={treeData}
         width="100%"
         indent={24}
         rowHeight={32}
         searchTerm={term}
         searchMatch={(node, term) => node.data.name.toLowerCase().includes(term.toLowerCase())}
         onActivate={handleNodeClick}
         key={treeKey}
         onMove={handleMove}
         onDelete={async (key) => {
           try {
             await deleteItem(key);
             setTreeData(prevData => {
               const newData = [...prevData];
               findAndRemoveItem(newData, key.replace('/', ''));
               return newData;
             });
           } catch (error) {
             console.error('Error deleting item:', error);
           }
         }}
       >
            {Node}
          </Tree>
        ) : (
          <div className="text-center text-gray-500 mt-4 font-montserrat">
            No files or folders found
          </div>
        )}
      </div>

      {showFolderInput && (
  <div className="mb-2">
    <div className="flex gap-2">
      <input
        type="text"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        placeholder="Enter folder name"
        className="p-2 border rounded font-montserrat flex-1"
        disabled={isCreatingFolder}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleFolderNameSubmit();
          }
        }}
        autoFocus
      />
      <button
        onClick={handleFolderNameSubmit}
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        disabled={isCreatingFolder}
      >
        {isCreatingFolder ? 'Creating...' : 'Add'}
      </button>
      <button
        onClick={() => {
          setShowFolderInput(false);
          setNewFolderName('');
          setFolderError(null);
        }}
        className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
        disabled={isCreatingFolder}
      >
        Cancel
      </button>
    </div>
    {folderError && (
      <div className="text-red-500 text-sm mt-1">{folderError}</div>
    )}
  </div>
)}

    </ScrollArea>
  );
};

export default TreeFolder;