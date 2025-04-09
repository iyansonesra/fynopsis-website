import React from 'react';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import Particles from '../../../ui/particles';
import { ScrollArea } from '../../../ui/scroll-area';

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
                    <span className="ml-2 truncate" title={node.name}>{node.name}</span>
                </div>
                {node.isDirectory && isExpanded && node.children.map(child => renderTreeNode(child))}
            </div>
        );
    };

    const tree = buildTree(items);

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold dark:text-gray-200 mb-2">ZIP Contents Preview</h3>
            <ScrollArea className="flex-1">
                <div className="pr-4">
                    {tree.map(node => renderTreeNode(node))}
                </div>
            </ScrollArea>
        </div>
    );
};

export default ZipPreview;