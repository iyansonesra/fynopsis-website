import React, { useEffect, useState } from 'react';
import { Clock, Star } from 'lucide-react';
import { FileItem, Folder, useFileStore } from '@/components/services/HotkeyService';
import { useRouter, usePathname } from 'next/navigation';
import { post } from 'aws-amplify/api';

import { FilesystemItem } from './static-tree-item';
import { useTabStore } from '@/components/tabStore';
import { get } from 'aws-amplify/api';
import PDFViewer from '@/components/tabs/library/table/PDFViewer';
import { useFolderTreeStore } from '@/components/services/treeStateStore';

interface FolderTreeProps {
    onNodeSelect?: (node: Node) => void;
}

export type Node = {
    name: string;
    nodes?: Node[];
    numbering?: string;
    id?: string;     // Add ID for file/folder
    path?: string;   // Add path information
    isFolder?: boolean; // Indicate if it's a folder
    parentFolderId?: string; // Add parent folder ID
    // File attributes
    fileId?: string;
    fileName?: string;
    fullPath?: string;
    parentFolderName?: string;
    size?: string;
    batchStatus?: string;
    contentType?: string;
    lastModified?: string;
    uploadedBy?: string;
    uploadedByEmail?: string;
};

type MoveResponse = {
    message: string;
    results: {
        failed: any[];
        successful: Array<{
            itemId: string;
            itemName: string;
            oldParentId: string;
            oldParentName: string;
            newParentId: string;
        }>;
        summary: {
            failed: number;
            succeeded: number;
            total: number;
        };
    };
};

// Function to build folder structure from folders and files
const buildFolderStructure = (folders: Folder[], files: FileItem[]): Node[] => {
    const root: Record<string, Node> = {};

    // First, build the folder structure
    folders.forEach((folder) => {
        const pathParts = folder.fullPath.split('/').filter(part => part !== 'Root' && part !== '');
        let currentLevel = root;
        let parentId = 'ROOT'; // Start with ROOT as parent

        pathParts.forEach((part, index) => {
            if (!currentLevel[part]) {
                currentLevel[part] = {
                    name: part,
                    nodes: [],
                    id: index === pathParts.length - 1 ? folder.id : undefined,
                    path: pathParts.slice(0, index + 1).join('/'),
                    isFolder: true,
                    parentFolderId: parentId
                };
            }

            if (index < pathParts.length - 1) {
                parentId = currentLevel[part].id || parentId; // Update parent ID for next level
                currentLevel = currentLevel[part].nodes as unknown as Record<string, Node>;
            }
        });
    });

    // Then, add files to their parent folders
    files.forEach((file) => {
        // Skip files with empty names
        if (!file.fileName || file.fileName.trim() === '') {
            return;
        }

        const pathParts = file.fullPath.split('/').filter(part => part !== 'Root' && part !== '');
        let currentLevel = root;
        let parentId = 'ROOT';

        // Navigate to the parent folder
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!currentLevel[part]) {
                // Create parent folder if it doesn't exist
                currentLevel[part] = {
                    name: part,
                    nodes: [],
                    path: pathParts.slice(0, i + 1).join('/'),
                    isFolder: true,
                    parentFolderId: parentId
                };
            }
            parentId = currentLevel[part].id || parentId;
            currentLevel = currentLevel[part].nodes as unknown as Record<string, Node>;
        }

        // Add the file to the current level
        const fileName = pathParts[pathParts.length - 1];
        if (!currentLevel[fileName]) {
            currentLevel[fileName] = {
                name: fileName,
                nodes: [],
                id: file.fileId,
                path: file.fullPath,
                isFolder: false,
                parentFolderId: file.parentFolderId || parentId,
                // Add all file attributes
                fileId: file.fileId,
                fileName: file.fileName,
                fullPath: file.fullPath,
                parentFolderName: file.parentFolderName,
                size: file.size,
                batchStatus: file.batchStatus,
                contentType: file.contentType,
                lastModified: file.lastModified,
                uploadedBy: file.uploadedBy,
                uploadedByEmail: file.uploadedByEmail
            };
        }
    });

    // Add numbering to nodes recursively
    const addNumbering = (nodes: Node[], prefix: string): Node[] => {
        return nodes.map((node, index) => {
            const currentNumber = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
            return {
                ...node,
                numbering: currentNumber,
                nodes: node.nodes ? addNumbering(node.nodes, currentNumber) : [],
            };
        });
    };

    // Convert the root object to an array and add numbering
    const convertToArray = (obj: Record<string, Node>): Node[] => {
        return addNumbering(
            Object.values(obj)
                .sort((a, b) => {
                    // First sort by type (folders before files)
                    if (a.isFolder !== b.isFolder) {
                        return a.isFolder ? -1 : 1;
                    }
                    // Then sort alphabetically within each group
                    return a.name.localeCompare(b.name);
                })
                .map((node) => ({
                    name: node.name,
                    id: node.id,
                    path: node.path,
                    isFolder: node.isFolder,
                    parentFolderId: node.parentFolderId,
                    nodes: node.nodes ? convertToArray(node.nodes as unknown as Record<string, Node>) : [],
                })),
            ''
        );
    };

    // Wrap everything under "Home"
    return [{
        name: 'Home',
        id: 'ROOT',
        path: '/',
        isFolder: true,
        parentFolderId: undefined,
        nodes: convertToArray(root),
    }];
};

const FolderTree: React.FC<FolderTreeProps> = ({ onNodeSelect }) => {
    const [folderStructure, setFolderStructure] = useState<Node[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname() || '';
    const pathArray = pathname.split('/');
    const bucketUuid = pathArray[2] || '';

    const searchableFiles = useFileStore((state) => state.searchableFiles);
    const searchableFolders = useFileStore((state) => state.searchableFolders);
    const setSelectedFile = useFileStore((state) => state.setSelectedFile);
    const setShowDetailsView = useFileStore((state) => state.setShowDetailsView);
    const { addTab, setActiveTabId, tabs } = useTabStore();
    const { openNode } = useFolderTreeStore();

    // Function to get all node IDs (recursive)
    const getAllNodeIds = (node: Node): string[] => {
        const ids: string[] = [];
        // Use node.id if available, otherwise generate a consistent ID
        const nodeId = node.id || (node.path ? `${node.path}/${node.name}` : node.name);
        ids.push(nodeId);
        
        if (node.nodes) {
            node.nodes.forEach(child => {
                ids.push(...getAllNodeIds(child));
            });
        }
        return ids;
    };

    // Function to get parent IDs (recursive)
    const getParentIds = (node: Node, targetId: string): string[] => {
        if (!node.nodes) return [];
        
        const nodeId = node.id || (node.path ? `${node.path}/${node.name}` : node.name);
        
        for (const child of node.nodes) {
            const childId = child.id || (child.path ? `${child.path}/${child.name}` : child.name);
            if (childId === targetId) {
                return nodeId ? [nodeId] : [];
            }
            const parentIds = getParentIds(child, targetId);
            if (parentIds.length > 0) {
                return nodeId ? [...parentIds, nodeId] : parentIds;
            }
        }
        return [];
    };

    useEffect(() => {
        openNode('ROOT');
        const folderTree = buildFolderStructure(searchableFolders, searchableFiles);
        setFolderStructure(folderTree);

        // Select all nodes by default
        const allNodeIds = folderTree.flatMap(node => getAllNodeIds(node));
        setSelectedItems(new Set(allNodeIds));
    }, [openNode, searchableFiles, searchableFolders]);

    // Function to handle checkbox selection (with children and parents)
    const handleCheckboxSelect = (node: Node, isSelected: boolean) => {
        console.log("Checkbox selected:", node.name, isSelected);
        const newSelectedItems = new Set(selectedItems);
        const childIds = getAllNodeIds(node);
        const nodeId = node.id || (node.path ? `${node.path}/${node.name}` : node.name);
        
        if (isSelected) {
            // Add the node and its children
            childIds.forEach(id => newSelectedItems.add(id));
            
            // Check and add parents if needed
            const parentIds = getParentIds(folderStructure[0], nodeId);
            parentIds.forEach(parentId => {
                if (!newSelectedItems.has(parentId)) {
                    newSelectedItems.add(parentId);
                }
            });

            // Also update parent nodes' visibility
            parentIds.forEach(parentId => {
                // Find the parent node
                const findNode = (searchNode: Node, targetId: string): Node | null => {
                    const searchNodeId = searchNode.id || (searchNode.path ? `${searchNode.path}/${searchNode.name}` : searchNode.name);
                    if (searchNodeId === targetId) return searchNode;
                    if (!searchNode.nodes) return null;
                    for (const child of searchNode.nodes) {
                        const found = findNode(child, targetId);
                        if (found) return found;
                    }
                    return null;
                };

                const parentNode = findNode(folderStructure[0], parentId);
                if (parentNode) {
                    const updatedParent = {
                        ...parentNode,
                        show: true
                    };
                    onNodeSelect?.(updatedParent);
                }
            });
        } else {
            // Remove the node and its children
            childIds.forEach(id => newSelectedItems.delete(id));
        }
        
        setSelectedItems(newSelectedItems);

        // Update permissions for the node and its children
        if (onNodeSelect) {
            // Create a new node with updated visibility
            const updatedNode = {
                ...node,
                show: isSelected
            };
            onNodeSelect(updatedNode);

            // If it's a folder, update all children recursively
            if (node.isFolder && node.nodes) {
                const updateChildrenVisibility = (childNode: Node) => {
                    const updatedChild = {
                        ...childNode,
                        show: isSelected
                    };
                    onNodeSelect(updatedChild);
                    if (childNode.nodes) {
                        childNode.nodes.forEach(updateChildrenVisibility);
                    }
                };
                node.nodes.forEach(updateChildrenVisibility);
            }
        }
    };

    // Function to handle node selection (single node only)
    const handleNodeClick = (node: Node) => {
        if (node.id) {
            setSelectedNodeId(node.id);
            // Call onNodeSelect if provided
            if (onNodeSelect) {
                onNodeSelect(node);
            }
        }
    };

    // Function to check if a node is selected by checkbox
    const isNodeCheckboxSelected = (node: Node): boolean => {
        if (!node.id) {
            // Generate consistent ID for nodes without explicit ID
            const generatedId = node.path ? `${node.path}/${node.name}` : node.name;
            return selectedItems.has(generatedId);
        }
        return selectedItems.has(node.id);
    };

    const handleFileView = async (node: Node) => {
        if (!node.isFolder && node.id) {
            try {
                // Fetch file details from backend
                const downloadResponse = await get({
                    apiName: 'S3_API',
                    path: `/s3/${bucketUuid}/view-url`,
                    options: {
                        withCredentials: true,
                        queryParams: { fileId: node.id }
                    }
                });
                const { body } = await downloadResponse.response;
                const responseText = await body.text();
                const { signedUrl } = JSON.parse(responseText);

                // Process file for viewing
                handleFileSelect(signedUrl, node);
            } catch (error) {
                console.error('Error fetching file details:', error);
            }
        }
    };

    const handleFileSelect = (s3Url:string, file: any) => {
        setSelectedFile(file);
        setShowDetailsView(true);

        if (file.id && file.name && s3Url) {
            const newTabId = `file-${file.id}`;
            const existingTab = tabs.find(tab => tab.id === newTabId);

            if (existingTab) {
                // Just activate the existing tab
                setActiveTabId(existingTab.id);
            } else {
                console.log('Adding new tab:', newTabId);
                addTab({
                    id: newTabId,
                    title: file.name,
                    content: (
                        <PDFViewer
                            documentUrl={s3Url}
                            containerId={`pdf-viewer-${file.id}`}
                            tabId={newTabId}
                            name={file.name}
                            boundingBoxes={[]} />
                    )
                });
            }
        }
    };

    return (
        <div className="h-full flex flex-col p-3">
            {/* Folder tree structure */}
            <div className="flex-1 overflow-auto">
                <ul>
                    {folderStructure.map((node) => (
                        <FilesystemItem
                            node={node}
                            key={node.id}
                            onSelect={handleNodeClick}
                            onCheckboxSelect={handleCheckboxSelect}
                            isCheckboxSelected={isNodeCheckboxSelected(node)}
                            isNodeSelected={node.id === selectedNodeId}
                            selectedItems={selectedItems}
                            selectedNodeId={selectedNodeId}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FolderTree;