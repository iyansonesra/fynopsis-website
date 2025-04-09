import React, { useEffect, useState } from 'react';
import { Clock, Star } from 'lucide-react';
import { Files, useFileStore } from '@/components/services/HotkeyService';
import { useRouter, usePathname } from 'next/navigation';

import { FilesystemItem } from './tree_item';
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
};

const FolderTree: React.FC<FolderTreeProps> = () => {
    const [folderStructure, setFolderStructure] = useState<Node[]>([]);
    const router = useRouter();
    const pathname = usePathname() || '';
    const pathArray = pathname.split('/');
    const bucketUuid = pathArray[2] || '';

    const searchableFiles = useFileStore((state) => state.searchableFiles);
    console.log("searchable fules", searchableFiles);
    const setSelectedFile = useFileStore((state) => state.setSelectedFile);
    const setShowDetailsView = useFileStore((state) => state.setShowDetailsView);
    const { addTab, setActiveTabId, tabs } = useTabStore();
    const { openNode } = useFolderTreeStore();

    useEffect(() => {
        // Function to build folder structure from file paths
        openNode('ROOT');

        const buildFolderStructure = (files: Files[]): Node[] => {
            const root: Record<string, Node> = {};

            files.forEach((file) => {
                // Add logging to debug the path
                console.log('Processing file path:', file.fullPath);
                
                const pathParts = file.fullPath.split('/'); // Split path into parts
                
                // Log path parts to see what we're working with
                console.log('Path parts:', pathParts);
                
                let currentLevel = root;
            
                pathParts.forEach((part, index) => {
                    if (part === 'Root') return; // Skip "Root" during path processing
                    
                    // Log current part and index for debugging
                    console.log(`Processing part: "${part}" at index ${index} of ${pathParts.length-1}`);
            
                    if (!currentLevel[part]) {
                        // Check if this is a file by looking at the extension
                        const isFile = part.includes('.') && index === pathParts.length - 1;
                        
                        currentLevel[part] = {
                            name: part,
                            nodes: [],
                            id: isFile ? file.fileId : undefined,
                            path: pathParts.slice(0, index + 1).join('/'),
                            isFolder: !isFile // More reliable check for files
                        };
                    }
            
                    if (index === pathParts.length - 1) {
                        // Final part should be a file - force the correct properties
                        currentLevel[part].nodes = currentLevel[part].nodes || [];
                        currentLevel[part].id = file.fileId;
                        currentLevel[part].isFolder = false;
                        
                        // Log that we identified a file
                        console.log(`Marked "${part}" as a file with ID ${file.fileId}`);
                    } else {
                        // Otherwise, it's a folder
                        if (file.parentFolderId && pathParts[index] === part) {
                            currentLevel[part].id = file.parentFolderId;
                        }
                        currentLevel = currentLevel[part].nodes as unknown as Record<string, Node>;
                    }
                });
            });

            // Add numbering to nodes recursively
            const addNumbering = (nodes: Node[], prefix: string): Node[] => {
                return nodes.map((node, index) => {
                    const currentNumber = `${prefix}${index + 1}`;
                    return {
                        ...node,
                        numbering: currentNumber, // Add the numbering attribute
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
                        nodes: node.nodes ? convertToArray(node.nodes as unknown as Record<string, Node>) : [],
                    })),
                    '1.'
                );
            };

            // Wrap everything under "Home"
            return [
                {
                    name: 'Home',
                    numbering: '1',
                    id: 'ROOT', // Root folder ID
                    path: '/',
                    isFolder: true,
                    nodes: convertToArray(root),
                },
            ];
        };

        // Build folder structure and update state
        const folderTree = buildFolderStructure(searchableFiles);
        setFolderStructure(folderTree);
    }, [openNode, searchableFiles]);

    const handleNodeSelect = async (node: Node) => {
        console.log('Selected node:', node);
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
                            animated
                            onSelect={handleNodeSelect}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FolderTree;