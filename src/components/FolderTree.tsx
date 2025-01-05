import React, { useState } from 'react';
import { Tree, NodeApi, NodeRendererProps } from 'react-arborist';
import { Folder, File, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { usePathname, useSearchParams } from 'next/navigation';
import { get } from "aws-amplify/api";


const S3_BUCKET_NAME = 'vdr-documents';
const REGION = 'us-east-1';

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const initialData: TreeNode[] = [
  { id: "1", name: "Unread" },
  { id: "2", name: "Threads" },
  {
    id: "3",
    name: "Chat Rooms",
    children: [
      { id: "c1", name: "General" },
      { id: "c2", name: "Random" },
      { id: "c3", name: "Open Source Projects" },
    ],
  },
  {
    id: "4",
    name: "Direct Messages",
    children: [
      { id: "d1", name: "Alice" },
      { id: "d2", name: "Bob" },
      { id: "d3", name: "Charlie" },
    ],
  },
];


const FolderTreeComponent: React.FC = () => {
  const [data, setData] = useState(initialData);

  const handleCreate = ({ parentId }: { parentId: string | null }) => {
    const newNode: TreeNode = {
      id: Math.random().toString(36).substr(2, 9),
      name: "New Folder",
    };

    setData((prevData) => {
      const addNodeToTree = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.id === parentId) {
            return {
              ...node,
              children: [...(node.children || []), newNode],
            };
          } else if (node.children) {
            return {
              ...node,
              children: addNodeToTree(node.children),
            };
          }
          return node;
        });
      };

      return parentId ? addNodeToTree(prevData) : [...prevData, newNode];
    });
  };

  const handleMove = (args: any) => {
    console.log('Move:', args);
    // Implement move logic here
  };

  const handleRename = ({ id, name }: { id: string; name: string }) => {
    setData((prevData) => {
      const renameNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.id === id) {
            return { ...node, name };
          } else if (node.children) {
            return { ...node, children: renameNode(node.children) };
          }
          return node;
        });
      };

      return renameNode(prevData);
    });
  };

  const Node: React.FC<NodeRendererProps<TreeNode>> = ({ node, style, dragHandle }) => {
    const Icon = node.isInternal ? Folder : File;
    const ArrowIcon = node.isOpen ? ChevronDown : ChevronRight;

    return (
      <div style={style} ref={dragHandle} className="flex items-center p-1">
        {node.isInternal && (
          <ArrowIcon
            className="w-4 h-4 mr-1 cursor-pointer"
            onClick={() => node.toggle()}
          />
        )}
        <Icon className="w-4 h-4 mr-2" />
        <span onDoubleClick={() => node.edit()}>{node.data.name}</span>
        <Plus
          className="w-4 h-4 ml-auto cursor-pointer"
          onClick={() => handleCreate({ parentId: node.id })}
        />
      </div>
    );
  };

  return (
    <div className="w-64 h-96 border border-gray-300 rounded">
      <Tree
        data={data}
        openByDefault={false}
        width={256}
        height={384}
        indent={24}
        rowHeight={32}
        onMove={handleMove}
        onRename={handleRename}
      >
        {Node}
      </Tree>
    </div>
  );
};

export default FolderTreeComponent;