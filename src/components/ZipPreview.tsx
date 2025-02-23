import React from 'react';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import Particles from './ui/particles';
import { ScrollArea } from './ui/scroll-area';

interface ZipPreviewProps {
    items: ProcessedItem[];
    onUpload: () => void;
    onCancel: () => void;
}

interface ProcessedItem {
    path: string;
    file: File;
    isDirectory: boolean;
    level: number;
    parentPath: string;
}

interface TreeNode {
    name: string;
    isDirectory: boolean;
    children: TreeNode[];
    level: number;
    path: string;
}

const ZipPreview: React.FC<ZipPreviewProps> = ({ items, onUpload, onCancel }) => {
    const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

    const buildTree = (items: ProcessedItem[]): TreeNode[] => {
        const root: TreeNode = { name: 'root', isDirectory: true, children: [], level: 0, path: '/' };
        const nodeMap = new Map<string, TreeNode>();
        nodeMap.set('/', root);

        // Sort items by path to ensure parent folders are processed first
        const sortedItems = [...items].sort((a, b) => a.path.localeCompare(b.path));

        sortedItems.forEach(item => {
            const pathParts = item.path.split('/').filter(part => part !== '');
            let currentPath = '';

            pathParts.forEach((part, index) => {
           
                const newPath = currentPath ? `${currentPath}/${part}` : part;

                if (!nodeMap.has(newPath)) {
                    const newNode: TreeNode = {
                        name: part,
                        isDirectory: index === pathParts.length - 1 ? item.isDirectory : true,
                        children: [],
                        level: index + 1,
                        path: newPath,
                    };

                    const parentPath = currentPath || '/';
                    const parentNode = nodeMap.get(parentPath);
                    if (parentNode) {
                        parentNode.children.push(newNode);
                    }

                    nodeMap.set(newPath, newNode);
                }

                currentPath = newPath;
            });
        });

        return root.children;
    };

    const toggleFolder = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const renderTreeNode = (node: TreeNode) => {
        const isExpanded = expandedFolders.has(node.path);
        const paddingLeft = `${node.level * 20}px`;

        return (
            <div key={node.path}>
                <div
                    className="flex items-center py-1 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer dark:text-gray-200"
                    style={{ paddingLeft }}
                    onClick={() => node.isDirectory && toggleFolder(node.path)}
                >
                    {node.isDirectory ? (
                        <>
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Folder className="w-4 h-4 ml-1 text-blue-500" />
                        </>
                    ) : (
                        <>
                            <span className="w-4" />
                            <File className="w-4 h-4 ml-1 text-gray-500" />
                        </>
                    )}
                    <span className="ml-2">{node.name}</span>
                </div>
                {node.isDirectory && isExpanded && node.children.map(child => renderTreeNode(child))}
            </div>
        );
    };

    const tree = buildTree(items);

    return (
        <div className="space-y-4 min-h-[400px] flex flex-col">
            <div className="rounded-lg max-h-[400px] overflow-y-auto flex-grow">
            <h3 className="text-lg font-semibold dark:text-gray-200 mb-2">ZIP Contents Preview</h3>

            <div className="h-[300px]">
                <ScrollArea className="h-full">
                    {tree.map(node => renderTreeNode(node))}
                </ScrollArea>
            </div>
            </div>

            <div className="flex justify-end items-center  p-4 mt-auto">
            <div className="space-x-2">
                <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border rounded"
                >
                Cancel
                </button>
                <button
                onClick={onUpload}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                Upload ZIP
                </button>
            </div>
            </div>
        </div>
    );
};

export default ZipPreview;