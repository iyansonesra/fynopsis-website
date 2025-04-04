"use client"

import { useState, useCallback, memo } from "react"
import { ChevronRight, Folder, File, FileText, FileSpreadsheet, Image, Code, FileAudio2, FileVideo2 } from "lucide-react"
import { FaFilePdf } from "react-icons/fa"
import { useFolderTreeStore } from '@/components/services/treeStateStore';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { get, post } from 'aws-amplify/api';
import {
    ContextMenu as ShadcnContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { usePathname } from 'next/navigation';
import { Input } from "@/components/ui/input";

// Import shadcn components
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React from "react"

type Node = {
    name: string
    nodes?: Node[]
    numbering?: string
    id?: string
    path?: string
    isFolder?: boolean
    draggedItem?: {
        id: string
        name: string
        isFolder: boolean
        path: string
    }
}

interface FilesystemItemProps {
    node: Node
    onSelect?: (node: Node) => void
}

const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf':
            return <FaFilePdf className="ml-[22px] w-4 h-4 text-red-500" />;
        case 'xlsx':
        case 'xls':
        case 'csv':
            return <FileSpreadsheet className="ml-[22px] w-4 h-4 text-green-500" />;
        case 'docx':
        case 'doc':
        case 'txt':
        case 'rtf':
            return <FileText className="ml-[22px] w-4 h-4 text-blue-500" />;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'svg':
            return <Image className="ml-[22px] w-4 h-4 text-purple-500" />;
        case 'mp3':
        case 'wav':
        case 'ogg':
            return <FileAudio2 className="ml-[22px] w-4 h-4 text-yellow-500" />;
        case 'mp4':
        case 'mov':
        case 'avi':
            return <FileVideo2 className="ml-[22px] w-4 h-4 text-pink-500" />;
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
        case 'html':
        case 'css':
        case 'json':
            return <Code className="ml-[22px] w-4 h-4 text-orange-500" />;
        default:
            return <File className="ml-[22px] w-4 h-4 text-gray-500" />;
    }
};

export function FilesystemItem({
    node,
    onSelect
}: FilesystemItemProps) {
    const { isNodeOpen, toggleNode, startDrag, endDrag, setDropTarget, clearDropTarget, reorderItems } = useFolderTreeStore();
    const isOpen = node.id ? isNodeOpen(node.id) : false;
    const [isDragging, setIsDragging] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(node.name);
    const [isDropTarget, setIsDropTarget] = useState(false);
    const lastClickTimeRef = React.useRef<number>(0);
    const pathname = usePathname() || '';
    const pathArray = pathname.split('/');
    const bucketUuid = pathArray[2] || '';

    const handleDownload = async () => {
        if (!node.isFolder && node.id) {
            try {
                const downloadResponse = await get({
                    apiName: 'S3_API',
                    path: `/s3/${bucketUuid}/download-url`,
                    options: {
                        withCredentials: true,
                        queryParams: { fileId: node.id }
                    }
                });
                const { body } = await downloadResponse.response;
                const responseText = await body.text();
                const { signedUrl } = JSON.parse(responseText);

                // Create temporary link and trigger download
                const link = document.createElement('a');
                link.href = signedUrl;
                link.download = node.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error('Error getting presigned URL:', error);
            }
        }
    };

    const handleRename = async () => {
        if (!node.id) return;

        try {
            const response = await post({
                apiName: 'S3_API',
                path: `/s3/${bucketUuid}/rename-file`,
                options: {
                    withCredentials: true,
                    body: {
                        fileId: node.id,
                        newName: newName
                    }
                }
            });

            const { body } = await response.response;
            const result = await body.json() as { success: boolean };

            if (result?.success) {
                setIsRenaming(false);
                // Update the node's name
                node.name = newName;
            }
        } catch (error) {
            console.error('Error renaming file:', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setIsRenaming(false);
            setNewName(node.name);
        }
    };

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        e.stopPropagation();
        const currentTime = new Date().getTime();
        const timeSinceLastClick = currentTime - lastClickTimeRef.current;
        
        // Update the last click time
        lastClickTimeRef.current = currentTime;
        
        // Check if this is a double click (typically within 300ms)
        if (timeSinceLastClick < 300) {
            // Double click detected
            if (!node.isFolder && onSelect) {
                onSelect(node);
                return;
            }
        }
        
        // Single click behavior
        // Only toggle open/close state for folders
        if ((node.isFolder || (node.nodes && node.nodes.length > 0)) && node.id) {
            toggleNode(node.id);
        }
    }, [node, onSelect, toggleNode]);

    const handleOpenFolder = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();

        // For folders, call onSelect WITHOUT toggling isOpen
        if ((node.isFolder || node.nodes) && onSelect) {
            // Force open the folder if it's not already open
            if (!isOpen && node.id) {
                toggleNode(node.id);
            }
            onSelect(node);
        }
    }, [node, onSelect, isOpen, toggleNode]);

    const handleDragStart = useCallback((e: React.DragEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        // Set the data being dragged
        e.dataTransfer.setData('application/json', JSON.stringify({
            id: node.id,
            name: node.name,
            isFolder: node.isFolder,
            path: node.path
        }));
        // Set the drag image to be the element itself
        e.dataTransfer.effectAllowed = 'move';
    }, [node]);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Allow dropping on folders or their children area
        if (node.isFolder || (node.nodes && node.nodes.length > 0)) {
            e.dataTransfer.dropEffect = 'move';
        }
    }, [node.isFolder, node.nodes]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only allow dropping on folders or their children area
        if (!node.isFolder && (!node.nodes || node.nodes.length === 0)) return;

        try {
            const draggedData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (draggedData.id === node.id) return; // Can't drop on itself

            // Call the parent's onDrop handler if it exists
            if (onSelect) {
                onSelect({ ...node, draggedItem: draggedData });
            }
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    }, [node, onSelect]);

    return (
        <li key={node.name} className="mb-1">
            <ShadcnContextMenu>
                <ContextMenuTrigger>
                    <div
                        className={`group flex items-center gap-1.5 py-1 px-2 text-sm whitespace-nowrap rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 relative select-none overflow-hidden ${isDragging ? 'opacity-50' : ''}`}
                        onClick={handleClick}
                        draggable={true}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        {/* Hide Chevron for "Home" */}
                        {node.name !== "Home" && node.nodes && node.nodes.length > 0 && (
                            <ChevronRight className={`size-4 text-gray-500 ${isOpen ? "rotate-90" : ""}`} />
                        )}

                        {(node.isFolder) ? (
                            <div></div>
                        ) : (
                            getFileIcon(node.name)
                        )}

                        <span className="relative select-none min-w-0 flex-1 pr-2 flex items-center">
                            {node.name !== "Home" && (
                                <span className="text-gray-400 select-none shrink-0">{node.numbering}</span>
                            )}{"  "}
                            {isRenaming ? (
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleRename}
                                    autoFocus
                                    className="ml-1 h-6 text-sm"
                                />
                            ) : (
                                <HoverCard>
                                    <HoverCardTrigger asChild>
                                        <span className="ml-1 select-none truncate cursor-default">
                                            {node.name}
                                        </span>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-auto">
                                        <div className="text-sm">
                                            {node.name}
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            )}
                        </span>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    {!node.isFolder && (
                        <>
                            <ContextMenuItem onClick={handleDownload}>
                                Download
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => setIsRenaming(true)}>
                                Rename
                            </ContextMenuItem>
                        </>
                    )}
                    {node.isFolder && (
                        <ContextMenuItem onClick={handleOpenFolder}>
                            Open
                        </ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ShadcnContextMenu>

            {/* Always show children for "Home" */}
            {node.name === "Home" ? (
                <ul className="pl-2" onDragOver={handleDragOver} onDrop={handleDrop}>
                    {node.nodes?.map((childNode) => (
                        <FilesystemItem
                            node={childNode}
                            key={childNode.name}
                            onSelect={onSelect}
                        />
                    ))}
                </ul>
            ) : (
                isOpen && (
                    <ul className="pl-2" onDragOver={handleDragOver} onDrop={handleDrop}>
                        {node.nodes?.map((childNode) => (
                            <FilesystemItem
                                node={childNode}
                                key={childNode.name}
                                onSelect={onSelect}
                            />
                        ))}
                    </ul>
                )
            )}
        </li>
    );
}