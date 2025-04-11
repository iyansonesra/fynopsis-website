"use client"

import { useState, useCallback, memo, useEffect } from "react"
import { ChevronRight, Folder, File, MoreHorizontal, FolderOpen } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useFolderTreeStore } from '@/components/services/treeStateStore';
import { FaFilePdf, FaFileWord, FaFileExcel, FaFileImage, FaFilePowerpoint, FaFileAlt, FaFileCode, FaFileArchive, FaFileVideo, FaFileAudio } from "react-icons/fa";
import { get, post } from 'aws-amplify/api';
import { usePathname } from 'next/navigation';

// Import shadcn components
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import React from "react"

type Node = {
    name: string
    nodes?: Node[]
    numbering?: string
    id?: string
    path?: string
    isFolder?: boolean
    parentFolderId?: string
}

type DraggedItem = {
    id: string;
    name: string;
    isFolder: boolean;
    path?: string;
}

interface FilesystemItemProps {
    node: Node
    animated?: boolean
    onSelect?: (node: Node) => void
    onCheckboxSelect?: (node: Node, isSelected: boolean) => void
    isCheckboxSelected?: boolean
    isNodeSelected?: boolean
    selectedItems?: Set<string>
    selectedNodeId?: string | null
}

export function FilesystemItem({
    node,
    animated = false,
    onSelect,
    onCheckboxSelect,
    isCheckboxSelected = false,
    isNodeSelected = false,
    selectedItems = new Set(),
    selectedNodeId = null
}: FilesystemItemProps) {
    const { isNodeOpen, toggleNode } = useFolderTreeStore();
    const pathname = usePathname();
    const bucketUuid = pathname?.split('/')[2] || '';
    
    // Track previous open state to determine if animation should play
    const [prevOpenState, setPrevOpenState] = useState(false);
    const [shouldAnimate, setShouldAnimate] = useState(false);

    // Generate a reliable ID for nodes that might not have one
    const nodeId = node.id || (node.path ? `${node.path}/${node.name}` : node.name);
    const isOpen = nodeId ? isNodeOpen(nodeId) : false;
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [showPopover, setShowPopover] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(node.name);
    const lastClickTimeRef = React.useRef<number>(0);
    const popoverTimeout = React.useRef<NodeJS.Timeout>();

    const handleMouseEnter = () => {
        // No need to implement handleMouseEnter as it's not used in the new ChildrenList component
    };

    const handleMouseLeave = () => {
        // No need to implement handleMouseLeave as it's not used in the new ChildrenList component
    };

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

    const handleRename = async (newFileName: string) => {
        if (!node.id) return;

        // Get file extension if it exists
        const lastDotIndex = node.name.lastIndexOf('.');
        const extension = lastDotIndex !== -1 ? node.name.slice(lastDotIndex) : '';
        const finalName = extension ? newFileName + extension : newFileName;

        try {
            const response = await post({
                apiName: 'S3_API',
                path: `/s3/${bucketUuid}/rename-object`,
                options: {
                    withCredentials: true,
                    body: {
                        fileId: node.id,
                        newName: finalName
                    }
                }
            });

            const { body } = await response.response;
            const result = await body.json() as { newName: string };

            if (result && result.newName) {
                // Update the node name in the tree
                node.name = result.newName;
            }
        } catch (error) {
            console.error('Error renaming file:', error);
        }
    };

    const handleRenameSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const input = e.currentTarget;
            const newValue = input.value;
            if (newValue && newValue !== node.name) {
                handleRename(newValue);
            }
        } else if (e.key === 'Escape') {
            // No need to handle blur event as it's not used in the new ChildrenList component
        }
    };

    useEffect(() => {
        // Only trigger animation if the state actually changed
        if (prevOpenState !== isOpen) {
            setShouldAnimate(true);
            setPrevOpenState(isOpen);
        }
    }, [isOpen, prevOpenState]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (node.isFolder || node.nodes) {
            // No need to implement handleContextMenu as it's not used in the new ChildrenList component
        }
    }, [node]);

    const closeContextMenu = useCallback(() => {
        // No need to implement closeContextMenu as it's not used in the new ChildrenList component
    }, []);

    const ChevronIcon = useCallback(() =>
        animated ? (
            <motion.span
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="flex"
            >
                <ChevronRight className="size-4 text-gray-500" />
            </motion.span>
        ) : (
            <ChevronRight
                className={`size-4 text-gray-500 ${isOpen ? "rotate-90" : ""}`}
            />
        ), [isOpen, animated]);

    const handleCheckboxChange = useCallback((checked: boolean) => {
        if (onCheckboxSelect) {
            onCheckboxSelect(node, checked);
        }
    }, [node, onCheckboxSelect]);

    const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    const handleChevronClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        // Use the nodeId for toggling, which works for nodes with or without an ID
        toggleNode(nodeId);
        console.log("Toggling folder:", node.name, "with ID:", nodeId);
    }, [node, nodeId, toggleNode]);

    const handleItemClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        // If currently renaming, don't handle any clicks
        if (isRenaming) {
            return;
        }

        // Select the node when clicking anywhere on it
        if (onSelect) {
            onSelect(node);
        }
    }, [node, onSelect, isRenaming]);

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
        
        // Close context menu after action
        setShowContextMenu(false);
    }, [node, onSelect, isOpen, toggleNode]);

    // Define the icon based on node type and state
    const ItemIcon = () => {
        if (node.isFolder) {
            return isOpen ? <FolderOpen className="size-4 mr-1 text-sky-500" /> : <Folder className="size-4 mr-1 text-sky-500" />;
        } else {
            // Use specific icons for different file types
            const fileName = node.name.toLowerCase();
            
            // Document types
            if (fileName.endsWith('.pdf')) {
                return <FaFilePdf className="size-4 mr-1 text-red-500" />;
            } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
                return <FaFileWord className="size-4 mr-1 text-blue-600" />;
            } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
                return <FaFileExcel className="size-4 mr-1 text-green-600" />;
            } else if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
                return <FaFilePowerpoint className="size-4 mr-1 text-orange-600" />;
            } 
            // Image types
            else if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].some(ext => fileName.endsWith(ext))) {
                return <FaFileImage className="size-4 mr-1 text-purple-500" />;
            }
            // Code/text types
            else if (['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.py', '.java', '.c', '.cpp'].some(ext => fileName.endsWith(ext))) {
                return <FaFileCode className="size-4 mr-1 text-gray-600" />;
            }
            // Archive types
            else if (['.zip', '.rar', '.tar', '.gz', '.7z'].some(ext => fileName.endsWith(ext))) {
                return <FaFileArchive className="size-4 mr-1 text-yellow-600" />;
            }
            // Video types
            else if (['.mp4', '.avi', '.mov', '.wmv', '.mkv'].some(ext => fileName.endsWith(ext))) {
                return <FaFileVideo className="size-4 mr-1 text-indigo-500" />;
            }
            // Audio types
            else if (['.mp3', '.wav', '.ogg', '.flac'].some(ext => fileName.endsWith(ext))) {
                return <FaFileAudio className="size-4 mr-1 text-pink-500" />;
            }
            // Text files
            else if (['.txt', '.md', '.rtf'].some(ext => fileName.endsWith(ext))) {
                return <FaFileAlt className="size-4 mr-1 text-gray-500" />;
            }
            // Default file icon for other types
            return <File className="size-4 mr-1 text-gray-500" />;
        }
    };

    const ChildrenList = useCallback(() => {
        const children = node.nodes?.map((childNode) => {
            // Generate a reliable ID for the child node
            const childNodeId = childNode.id || (childNode.path ? `${childNode.path}/${childNode.name}` : childNode.name);
            return (
                <FilesystemItem
                    node={childNode}
                    key={childNodeId} // Use a reliable unique key
                    animated={animated}
                    onSelect={onSelect}
                    onCheckboxSelect={onCheckboxSelect}
                    isCheckboxSelected={selectedItems.has(childNodeId)}
                    isNodeSelected={childNodeId === selectedNodeId}
                    selectedItems={selectedItems}
                    selectedNodeId={selectedNodeId}
                />
            );
        });
    
        if (animated && shouldAnimate) {
            return (
                <AnimatePresence>
                    {isOpen && (
                        <motion.ul
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="pl-3 overflow-hidden flex flex-col justify-end"
                            onAnimationComplete={() => {
                                setShouldAnimate(false);
                            }}
                        >
                            {children}
                        </motion.ul>
                    )}
                </AnimatePresence>
            );
        }
        
        if (isOpen) {
            return <ul className="pl-3">{children}</ul>;
        }
        
        return null;
    }, [node.nodes, isOpen, animated, onSelect, shouldAnimate, onCheckboxSelect, selectedItems, selectedNodeId]);

    return (
        <ContextMenu>
            <ContextMenuTrigger disabled={!node.isFolder && !node.nodes} >
                <li
                    className="ml-3 list-none cursor-pointer select-none"
                    onContextMenu={handleContextMenu}
                >
                    <div
                        className={`flex items-center py-0.5 px-1 rounded-md text-sm font-medium justify-between ${isNodeSelected ? "bg-blue-100" : "hover:bg-gray-100"
                            }`}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onClick={handleItemClick}
                    >
                        <div className="flex items-center flex-grow min-w-0">
                            {onCheckboxSelect && (
                                <Checkbox
                                    className="mr-2 size-4"
                                    checked={isCheckboxSelected}
                                    onCheckedChange={handleCheckboxChange}
                                    onClick={handleCheckboxClick}
                                />
                            )}
                            <div className="flex items-center flex-grow min-w-0">
                                {(node.nodes && node.nodes.length > 0 || node.isFolder) && (
                                    <div onClick={handleChevronClick} className="pr-1 cursor-pointer">
                                        <ChevronIcon />
                                    </div>
                                )}
                                <ItemIcon />
                                {isRenaming ? (
                                    <Input
                                        type="text"
                                        value={node.name}
                                        onChange={(e) => {
                                            node.name = e.target.value;
                                        }}
                                        onKeyDown={handleRenameSubmit}
                                        onBlur={() => setIsRenaming(false)}
                                        autoFocus
                                        className="h-6 px-1 py-0 text-sm"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="truncate" title={node.name}>
                                        {node.numbering && <span className="mr-1 text-gray-400 text-xs">{node.numbering}</span>}
                                        {node.name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <Popover open={showPopover} onOpenChange={setShowPopover}>
                            <PopoverTrigger asChild>
                                <div
                                    className="flex items-center gap-1.5 py-1 px-2 text-sm whitespace-nowrap rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 relative select-none overflow-hidden"
                                    onClick={handleItemClick}
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <div className="flex-shrink-0 flex items-center gap-1.5">
                                        <div onClick={handleCheckboxClick}>
                                            <Checkbox
                                                checked={isCheckboxSelected}
                                                onCheckedChange={handleCheckboxChange}
                                                className="mr-2"
                                            />
                                        </div>
                                        {node.name !== "Home" && node.nodes && node.nodes.length > 0 && (
                                            <div onClick={handleChevronClick} className="cursor-pointer">
                                                <ChevronIcon />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent 
                                className="p-2 text-sm w-fit min-w-[100px]" 
                                side="top" 
                                align="center"
                                alignOffset={0}
                                sideOffset={5}
                                onMouseEnter={() => setShowPopover(true)}
                                onMouseLeave={() => setShowPopover(false)}
                            >
                                <div className="break-keep whitespace-nowrap">
                                    {node.name || 'No ID'}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    {/* Render child nodes */}
                    <ChildrenList />
                </li>
            </ContextMenuTrigger>
            {!node.isFolder && (
                <ContextMenuContent className="w-48">
                    <ContextMenuItem onClick={handleDownload}>
                        Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setIsRenaming(true)}>
                        Rename
                    </ContextMenuItem>
                </ContextMenuContent>
            )}
        </ContextMenu>
    )
}