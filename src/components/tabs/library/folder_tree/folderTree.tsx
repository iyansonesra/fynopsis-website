import React, { useEffect, useState } from 'react';
import { Clock, Star } from 'lucide-react';
import { FileItem, Folder, useFileStore } from '@/components/services/HotkeyService';
import { useRouter, usePathname } from 'next/navigation';
import { post } from 'aws-amplify/api';

import { FilesystemItem } from './tree-item';
import { useTabStore } from '@/components/tabStore';
import { get } from 'aws-amplify/api';
import PDFViewer from '../table/PDFViewer';
import { useFolderTreeStore } from '@/components/services/treeStateStore';

interface FolderTreeProps { }

type Node = {
    name: string;
    nodes?: Node[];
    numbering?: string;
    id?: string;     // Add ID for file/folder
    path?: string;   // Add path information
    isFolder?: boolean; // Indicate if it's a folder
    parentFolderId?: string; // Add parent folder ID
    draggedItem?: {
        id: string;
        name: string;
        isFolder: boolean;
        path?: string;
    };
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
                parentFolderId: file.parentFolderId || parentId
            };
        }
    });

    // Add numbering to nodes recursively
    const addNumbering = (nodes: Node[], prefix: string): Node[] => {
        return nodes.map((node, index) => {
            const currentNumber = `${prefix}${index + 1}`;
            return {
                ...node,
                numbering: currentNumber,
                nodes: node.nodes ? addNumbering(node.nodes, `${currentNumber}.`) : [],
            };
        });
    };

    // Convert the root object to an array and add numbering
    const convertToArray = (obj: Record<string, Node>): Node[] => {
        return addNumbering(
            Object.values(obj).map((node) => ({
                name: node.name,
                id: node.id,
                path: node.path,
                isFolder: node.isFolder,
                parentFolderId: node.parentFolderId,
                nodes: node.nodes ? convertToArray(node.nodes as unknown as Record<string, Node>) : [],
            })),
            '1.'
        );
    };

    // Wrap everything under "Home"
    return [{
        name: 'Home',
        numbering: '1',
        id: 'ROOT',
        path: '/',
        isFolder: true,
        parentFolderId: undefined,
        nodes: convertToArray(root),
    }];
};

const FolderTree: React.FC<FolderTreeProps> = () => {
    const [folderStructure, setFolderStructure] = useState<Node[]>([]);
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

    useEffect(() => {
        openNode('ROOT');
        const folderTree = buildFolderStructure(searchableFolders, searchableFiles);
        setFolderStructure(folderTree);
    }, [openNode, searchableFiles, searchableFolders]);

    const handleNodeSelect = async (node: Node) => {
        if (node.isFolder && node.id) {
            // If this is a drop event (contains draggedItem)
            if (node.draggedItem) {
                console.log('Moving item:', node.draggedItem);
                const draggedItem = node.draggedItem;
                console.log('Moving item:', draggedItem);
                console.log('Moving item:', node.id);
                try {
                    // Call the API to move the item
                    const response = await post({
                        apiName: 'S3_API',
                        path: `/s3/${bucketUuid}/move-url`,
                        options: {
                            withCredentials: true,
                            body: {
                                fileIds: [draggedItem.id],
                                newParentFolderId: node.id,
                                
                            }
                        }
                    });

                    const { body } = await response.response;
                    const result = await body.json() as MoveResponse;
                    console.log('Moving item:', result);
                    if (result.results.successful.length > 0) {
                        // Function to remove a node from its current location
                        const removeNode = (nodes: Node[], targetId: string): { updatedNodes: Node[], removedNode: Node | null } => {
                            for (let i = 0; i < nodes.length; i++) {
                                if (nodes[i].id === targetId) {
                                    const removedNode = nodes[i];
                                    nodes.splice(i, 1);
                                    return { updatedNodes: nodes, removedNode };
                                }
                                if (nodes[i].nodes) {
                                    const { updatedNodes, removedNode } = removeNode(nodes[i].nodes!, targetId);
                                    if (removedNode) {
                                        nodes[i].nodes = updatedNodes;
                                        return { updatedNodes: nodes, removedNode };
                                    }
                                }
                            }
                            return { updatedNodes: nodes, removedNode: null };
                        };

                        // Function to add a node to its new location
                        const addNode = (nodes: Node[], targetFolderId: string, nodeToAdd: Node): Node[] => {
                            return nodes.map(node => {
                                if (node.id === targetFolderId) {
                                    return {
                                        ...node,
                                        nodes: [...(node.nodes || []), nodeToAdd]
                                    };
                                }
                                if (node.nodes) {
                                    return {
                                        ...node,
                                        nodes: addNode(node.nodes, targetFolderId, nodeToAdd)
                                    };
                                }
                                return node;
                            });
                        };

                        // Remove the node from its current location
                        const { updatedNodes, removedNode } = removeNode(folderStructure, draggedItem.id);
                        
                        if (removedNode) {
                            // Add the node to its new location
                            const updatedStructure = addNode(updatedNodes, node.id || 'ROOT', {
                                ...removedNode,
                                parentFolderId: node.id || 'ROOT'
                            });
                            
                            setFolderStructure(updatedStructure);
                        }
                    }
                } catch (error) {
                    console.error('Error moving item:', error);
                }
                return;
            }

            // Original folder navigation code
            const segments = pathname.split('/');
            segments.pop();  // Remove the last segment
            segments.push(node.id === 'ROOT' ? 'home' : node.id); // Add the new folder ID
            router.push(segments.join('/'));
        } else if (!node.isFolder && node.id) {
            // Handle file selection
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

                console.log('Signed URL:', signedUrl);

                // const { body } = await response.response;
                // const fileDetails = await body.json();

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
            <h2 className="text-base font-semibold mb-1 font-gray-700 ml-1">Folders</h2>

            <div className="mb-1">
                <div className="flex items-center py-2 px-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer">
                    <Clock className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm">Recent files</span>
                </div>
                <div className="flex items-center py-2 px-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer">
                    <Star className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm">Favorites</span>
                </div>
            </div>

            {/* Folder tree structure */}
            <div className="flex-1 overflow-auto">
                <ul>
                    {folderStructure.map((node) => (
                        <FilesystemItem
                            node={node}
                            key={node.name}
                            onSelect={handleNodeSelect}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FolderTree;