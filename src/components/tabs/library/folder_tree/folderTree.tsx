import React, { useEffect, useState } from 'react';
import { Clock, Star } from 'lucide-react';
import { Files, useFileStore } from '@/components/services/HotkeyService';
import { useRouter, usePathname } from 'next/navigation';
import { get, post } from 'aws-amplify/api';

import { FilesystemItem } from './tree_item';
import { useTabStore } from '@/components/tabStore';
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
};

const FolderTree: React.FC<FolderTreeProps> = () => {
    const [folderStructure, setFolderStructure] = useState<Node[]>([]);
    const router = useRouter();
    const pathname = usePathname() || '';
    const pathArray = pathname.split('/');
    const bucketUuid = pathArray[2] || '';

    const searchableFiles = useFileStore((state) => state.searchableFiles);
    const setSelectedFile = useFileStore((state) => state.setSelectedFile);
    const setShowDetailsView = useFileStore((state) => state.setShowDetailsView);
    const { addTab, setActiveTabId, tabs } = useTabStore();
    const { openNode, folderTree, setFolderTree, reorderItems } = useFolderTreeStore();

    const buildFolderStructure = (files: Files[]): Node[] => {
        const root: Record<string, Node> = {};

        files.forEach((file) => {
            const pathParts = file.fullPath.split('/');
            
            let currentLevel = root;
        
            pathParts.forEach((part, index) => {
                if (part === 'Root') return;
                
                if (!currentLevel[part]) {
                    const isFile = part.includes('.') && index === pathParts.length - 1;
                    
                    currentLevel[part] = {
                        name: part,
                        nodes: [],
                        id: isFile ? file.fileId : undefined,
                        path: pathParts.slice(0, index + 1).join('/'),
                        isFolder: !isFile
                    };
                }
        
                if (index === pathParts.length - 1) {
                    currentLevel[part].nodes = currentLevel[part].nodes || [];
                    currentLevel[part].id = file.fileId;
                    currentLevel[part].isFolder = false;
                } else {
                    if (file.parentFolderId && pathParts[index] === part) {
                        currentLevel[part].id = file.parentFolderId;
                    }
                    currentLevel = currentLevel[part].nodes as unknown as Record<string, Node>;
                }
            });
        });

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

        const convertToArray = (obj: Record<string, Node>): Node[] => {
            return addNumbering(
                Object.values(obj).map((node) => ({
                    name: node.name,
                    id: node.id,
                    path: node.path,
                    isFolder: node.isFolder,
                    nodes: node.nodes ? convertToArray(node.nodes as unknown as Record<string, Node>) : [],
                })),
                '1.'
            );
        };

        return [
            {
                name: 'Home',
                numbering: '1',
                id: 'ROOT',
                path: '/',
                isFolder: true,
                nodes: convertToArray(root),
            },
        ];
    };

    useEffect(() => {
        if (folderTree.length > 0) {
            setFolderStructure(folderTree);
            return;
        }

        openNode('ROOT');
        const newFolderTree = buildFolderStructure(searchableFiles);
        setFolderStructure(newFolderTree);
        setFolderTree(newFolderTree);
    }, [openNode, searchableFiles, folderTree, setFolderTree]);

    const handleNodeSelect = async (node: Node & { draggedItem?: any }) => {
        // If this is a drop event
        if (node.draggedItem) {
            try {
                // Call the backend API to move the file/folder
                const response = await post({
                    apiName: 'S3_API',
                    path: `/s3/${bucketUuid}/move-url`,
                    options: {
                        withCredentials: true,
                        body: {
                            fileIds: [node.draggedItem.id],
                            newParentFolderId: node.id
                        } as Record<string, any>
                    }
                });

                const { body } = await response.response;
                const result = await body.json() as { success: boolean };
                if (!result || !result.success) {
                    throw new Error('Failed to move item');
                }

                // Update the local tree structure
                reorderItems(node.draggedItem.id, node.id!, node.isFolder || false);

                // Refresh the folder structure
                const newFolderTree = buildFolderStructure(searchableFiles);
                setFolderStructure(newFolderTree);
                setFolderTree(newFolderTree);
            } catch (error) {
                console.error('Error moving item:', error);
            }
            return;
        }

        // Original node selection logic
        if (node.isFolder && node.id) {
            // Navigate to the folder
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