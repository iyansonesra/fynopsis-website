import React, { useRef, useState, useEffect } from "react";
import { Tree } from "react-arborist";
import Node from "./Node";
import { TbFolderPlus } from "react-icons/tb";
import { AiOutlineFileAdd } from "react-icons/ai";
import { fetchAuthSession } from 'aws-amplify/auth';
import { S3Client } from "@aws-sdk/client-s3";
import { usePathname } from 'next/navigation';
import { get } from "aws-amplify/api";
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
  metadata?: any;
}

const S3_BUCKET_NAME = 'vdr-documents';
const REGION = 'us-east-1';

const transformS3DataToTree = (headObjects: S3Object[]): TreeNode[] => {
  const root: TreeNode = { id: 'root', name: 'root', children: [] };
  const pathMap = new Map<string, TreeNode>();
  pathMap.set('', root);

  // Sort to ensure folders come before files
  const sortedObjects = headObjects.sort((a, b) => a.key.localeCompare(b.key));

  sortedObjects.forEach((obj) => {
    // Remove the UUID prefix and trailing slash for folders
    const keyWithoutPrefix = obj.key.split('/').slice(1).join('/');
    const paths = keyWithoutPrefix.split('/');
    let currentPath = '';

    paths.forEach((segment, index) => {
      if (!segment && index === paths.length - 1) return; // Skip empty segments at the end

      const prevPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      
      if (!pathMap.has(currentPath)) {
        const isFolder = index < paths.length - 1 || obj.key.endsWith('/');
        const newNode: TreeNode = {
          id: currentPath,
          name: segment,
          children: isFolder ? [] : undefined,
          isFolder: isFolder,
          metadata: obj.metadata
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
};

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

  const handleNodeClick = (node: any) => {
    if (!node.isFolder) {
      onFileSelect(node.data);
    }
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
          onClick={() => treeRef.current?.createInternal()}
          title="New Folder..."
          className="p-2 hover:bg-gray-100 rounded"
        >
          <TbFolderPlus />
        </button>
        <button 
          onClick={() => treeRef.current?.createLeaf()}
          title="New File..."
          className="p-2 hover:bg-gray-100 rounded"
        >
          <AiOutlineFileAdd />
        </button>
      </div>
      <div className="tree-container">
        {treeData.length > 0 ? (
          <Tree
            ref={treeRef}
            initialData={treeData}
            width="100%"
            indent={24}
            rowHeight={32}
            searchTerm={term}
            searchMatch={(node, term) =>
              node.data.name.toLowerCase().includes(term.toLowerCase())
            }
            onActivate={handleNodeClick}
          >
            {Node}
          </Tree>
        ) : (
          <div className="text-center text-gray-500 mt-4 font-montserrat">
            No files or folders found
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default TreeFolder;