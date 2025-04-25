import React, { useEffect } from 'react';
import { Clock, Star } from 'lucide-react';
import { FileItem, Folder, useFileStore } from '@/components/services/HotkeyService';
import { useRouter, usePathname } from 'next/navigation';
import { post } from 'aws-amplify/api';

import { FilesystemItem } from './static-tree-item';
import { useTabStore } from '@/components/tabStore';
import { get } from 'aws-amplify/api';
import PDFViewer from '@/components/tabs/library/table/PDFViewer';
import { useFolderTreeStore } from '@/components/services/treeStateStore';
import { useFolderStructureStore, DEFAULT_FOLDER_PERMISSIONS, DEFAULT_FILE_PERMISSIONS, FolderPermissions, FilePermissions } from '@/components/tabs/user_management/utils/folderStructureStore';
import { Checkbox } from '@/components/ui/checkbox';
import { FaFolder, FaFile } from 'react-icons/fa';
import { handleCheckboxSelect } from '../utils/folderTreeUtils';

interface FolderTreeProps {
    onNodeSelect?: (node: Node) => void;
    deviators?: string[]; // Add deviators prop
}

export type Node = {
    name: string;
    nodes?: Node[];
    numbering?: string;
    id?: string;     // Add ID for file/folder
    path?: string;   // Add path information
    isFolder?: boolean; // Indicate if it's a folder
    parentFolderId?: string; // Add parent folder ID
    // Add visibility property
    show?: boolean;
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
    isCustomized?: boolean; // Add isCustomized property
    permissions?: FolderPermissions | FilePermissions;
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
    const { setFolderPermissions, setFilePermissions } = useFolderStructureStore.getState();
    const folderPermissionsMap = new Map<string, FolderPermissions>();
    const filePermissionsMap = new Map<string, FilePermissions>();

    // First, build the folder structure
    folders.forEach((folder) => {
        console.log('FOLDEEEERRR:', folder);
        const pathParts = folder.fullPath.split('/').filter(part => part !== 'Root' && part !== '');
        let currentLevel = root;
        let parentId = 'ROOT';
        console.log('PATH PARTS:', pathParts);
        
        const folderIdMap = new Map();
        folders.forEach(f => {
            const fPath = f.fullPath.split('/').filter(part => part !== 'Root' && part !== '').join('/');
            folderIdMap.set(fPath, f.id);
        });

        pathParts.forEach((part, index) => {
            const currentPath = pathParts.slice(0, index + 1).join('/');
            const folderId = folderIdMap.get(currentPath);

            if (!currentLevel[part]) {
                currentLevel[part] = {
                    name: part,
                    nodes: [],
                    id: folderId,
                    path: currentPath,
                    isFolder: true,
                    parentFolderId: parentId
                };
                if (folderId) {
                    folderPermissionsMap.set(folderId, { ...DEFAULT_FOLDER_PERMISSIONS });
                }
            } else if (folderId) {
                currentLevel[part].id = folderId;
                folderPermissionsMap.set(folderId, { ...DEFAULT_FOLDER_PERMISSIONS });
            }

            if (index < pathParts.length - 1) {
                parentId = currentLevel[part].id || parentId;
                currentLevel = currentLevel[part].nodes as unknown as Record<string, Node>;
            }
        });
    });

    // Then, add files to their parent folders
    files.forEach((file) => {
        if (!file.fileName || file.fileName.trim() === '') {
            return;
        }

        const pathParts = file.fullPath.split('/').filter(part => part !== 'Root' && part !== '');
        let currentLevel = root;
        let parentId = 'ROOT';

        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!currentLevel[part]) {
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

        const fileName = pathParts[pathParts.length - 1];
        if (!currentLevel[fileName]) {
            currentLevel[fileName] = {
                name: fileName,
                nodes: [],
                id: file.fileId,
                path: file.fullPath,
                isFolder: false,
                parentFolderId: file.parentFolderId || parentId,
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
            if (file.fileId) {
                filePermissionsMap.set(file.fileId, { ...DEFAULT_FILE_PERMISSIONS });
            }
        }
    });

    // Update the store with the new permissions maps
    setFolderPermissions(folderPermissionsMap);
    setFilePermissions(filePermissionsMap);

    console.log('FOLDER PERMISSIONS:', folderPermissionsMap);
    console.log('FILE PERMISSIONS:', filePermissionsMap);

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

const FolderTree: React.FC<FolderTreeProps> = ({ onNodeSelect, deviators = [] }) => {
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

    // Use the folder structure store
    const {
        folderStructure,
        setFolderStructure,
        selectedItems,
        setSelectedItems,
        selectedNodeId,
        setSelectedNodeId
    } = useFolderStructureStore();

    useEffect(() => {
        openNode('ROOT');
        const folderTree = buildFolderStructure(searchableFolders, searchableFiles);
        setFolderStructure(folderTree);

        // Create a set of visible items (those with show: true)
        const getVisibleNodeIds = (node: Node): string[] => {
            const ids: string[] = [];
            const nodeId = node.id || (node.path ? `${node.path}/${node.name}` : node.name);
            
            // If node has a show property and it's true, add its ID
            // Default to true if no show property is found
            if (node.show !== false) {
                ids.push(nodeId);
            }
            
            if (node.nodes) {
                node.nodes.forEach(child => {
                    ids.push(...getVisibleNodeIds(child));
                });
            }
            return ids;
        };

        // Initialize selectedItems with all visible node IDs
        const visibleNodeIds = folderTree.flatMap(node => getVisibleNodeIds(node));
        setSelectedItems(new Set(visibleNodeIds));
    }, [openNode, searchableFiles, searchableFolders, setFolderStructure, setSelectedItems]);

    // Function to handle checkbox selection (with children and parents)
    const handleCheckboxSelectWrapper = (node: Node, isSelected: boolean) => {
        const newSelectedItems = handleCheckboxSelect(
            node,
            isSelected,
            selectedItems,
            setSelectedItems,
            setSelectedNodeId,
            folderStructure,
            onNodeSelect
        );
        
        // Update the folder structure to trigger re-render with new visibility
        setFolderStructure([...folderStructure]);
    };

    // Function to handle node selection (single node only)
    const handleNodeClick = (node: Node) => {
        // Set the selected node ID for highlighting purposes
        const nodeId = node.id || (node.path ? `${node.path}/${node.name}` : node.name);
        setSelectedNodeId(nodeId);
        
        // Pass the complete node (including its current visibility state) to the item permissions panel
        if (onNodeSelect) {
            // Ensure we pass the current visibility state and custom permissions flag
            const nodeToPass = {
                ...node,
                show: node.show !== undefined ? node.show : isNodeCheckboxSelected(node),
                isCustomized: node.isCustomized, // Preserve the custom permissions flag
                isFolder: node.isFolder || (node.nodes && node.nodes.length > 0) // Make sure isFolder is properly set
            };
            onNodeSelect(nodeToPass);
        }
    };

    // Function to check if a node is selected by checkbox - directly tied to visibility
    const isNodeCheckboxSelected = (node: Node): boolean => {
        // If the node has explicit visibility properties, prioritize those values
        if (node.hasOwnProperty('show') || node.hasOwnProperty('isVisible')) {
            // Check both show and isVisible properties where available
            const showValue = node.hasOwnProperty('show') ? (node as any).show : true;
            const isVisibleValue = node.hasOwnProperty('isVisible') ? (node as any).isVisible : true;
            
            // Consider a node visible if both show and isVisible are true
            // or if only one property exists and it's true
            return showValue && isVisibleValue;
        }
        
        // Otherwise fall back to the selectedItems set
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
        <div className="h-full flex flex-col p-3 overflow-hidden border rounded-md">
            {/* Header with labels */}
            <div className="flex justify-between items-center pb-2 mb-2 border-b">
                <span className="font-medium text-sm text-gray-700">Folders/Files</span>
                <span className="font-medium text-sm text-gray-700 mr-1">Show</span>
            </div>
            
            {/* Folder tree structure */}
            <div className="flex-1 overflow-auto">
                <ul>
                    {folderStructure.map((node) => (
                        <FilesystemItem
                            node={node}
                            key={node.id}
                            onSelect={handleNodeClick}
                            onCheckboxSelect={handleCheckboxSelectWrapper}
                            isCheckboxSelected={isNodeCheckboxSelected(node)}
                            isNodeSelected={node.id === selectedNodeId}
                            selectedItems={selectedItems}
                            selectedNodeId={selectedNodeId}
                            deviators={deviators}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FolderTree;