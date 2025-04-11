"use client"

import { useState, useCallback, memo, useEffect } from "react"
import { ChevronRight, Folder, File, MoreHorizontal } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useFolderTreeStore } from '@/components/services/treeStateStore';
import { FaFilePdf } from "react-icons/fa";
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
import React from "react"

type Node = {
    name: string
    nodes?: Node[]
    numbering?: string
    id?: string
    path?: string
    isFolder?: boolean
    draggedItem?: {
        id: string;
        name: string;
        isFolder: boolean;
        path?: string;
    }
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
    isSelected?: boolean
    onNodeSelect?: (node: Node | null) => void
}

export function FilesystemItem({
    node,
    animated = false,
    onSelect,
    isSelected = false,
    onNodeSelect
}: FilesystemItemProps) {
    const { isNodeOpen, toggleNode } = useFolderTreeStore();
    const isOpen = node.id ? isNodeOpen(node.id) : false;
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [showPopover, setShowPopover] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(node.name);
    const lastClickTimeRef = React.useRef<number>(0);
    const popoverTimeout = React.useRef<NodeJS.Timeout>();
    const pathname = usePathname();
    const bucketUuid = pathname?.split('/')[2] || '';
    
    // Track previous open state to determine if animation should play
    const [prevOpenState, setPrevOpenState] = useState(isOpen);
    const [shouldAnimate, setShouldAnimate] = useState(false);

    const handleMouseEnter = () => {
        if (!isRenaming) {  // Only show popover if not renaming
            popoverTimeout.current = setTimeout(() => {
                setShowPopover(true);
            }, 600);
        }
    };

    const handleMouseLeave = () => {
        if (popoverTimeout.current) {
            clearTimeout(popoverTimeout.current);
        }
        setShowPopover(false);
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
                setNewName(result.newName);
            }
        } catch (error) {
            console.error('Error renaming file:', error);
        } finally {
            setIsRenaming(false);
        }
    };

    const handleRenameSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const input = e.currentTarget;
            const newValue = input.value;
            if (newValue && newValue !== node.name) {
                handleRename(newValue);
            } else {
                setIsRenaming(false);
            }
        } else if (e.key === 'Escape') {
            setIsRenaming(false);
            setNewName(node.name);
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
            setShowContextMenu(true);
        }
    }, [node]);

    const closeContextMenu = useCallback(() => {
        setShowContextMenu(false);
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

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        e.preventDefault();
        e.stopPropagation();
        
        // If currently renaming, don't handle any clicks
        if (isRenaming) {
            return;
        }

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
        // Handle selection first

        console.log('NODE:', node);
        console.log('IS SELECTED:', isSelected);
        console.log('ON NODE SELECT:', onNodeSelect);
        if (onNodeSelect) {
            console.log('ON NODE SELECT:', onNodeSelect);
            onNodeSelect(isSelected ? null : node);
        }

        // Then handle folder open/close
        if ((node.isFolder || (node.nodes && node.nodes.length > 0)) && node.id) {
            toggleNode(node.id);
        }
    }, [node, onSelect, toggleNode, isRenaming, isSelected, onNodeSelect]);

    const handleOpenFolder = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
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

    const handleDragStart = useCallback((e: React.DragEvent) => {
        e.stopPropagation();
        // Set the data being dragged
        e.dataTransfer.setData('text/plain', JSON.stringify({
            id: node.id,
            name: node.name,
            isFolder: node.isFolder,
            path: node.path
        }));
        // Add visual feedback
        e.currentTarget.classList.add('opacity-50');
    }, [node]);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        e.stopPropagation();
        // Remove visual feedback
        e.currentTarget.classList.remove('opacity-50');
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Only show highlight when dragging over a file (to indicate its parent folder)
        if (!node.isFolder) {
            // Find the parent folder's container element
            const parentContainer = e.currentTarget.closest('li')?.parentElement;
            if (parentContainer) {
                parentContainer.classList.add('bg-slate-200', 'dark:bg-slate-700');
            }
        }
    }, [node]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.stopPropagation();
        // Remove highlight from all containers
        const containers = document.querySelectorAll('ul.pl-3');
        containers.forEach(container => {
            container.classList.remove('bg-slate-200', 'dark:bg-slate-700');
        });
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Clear any remaining highlights
        const containers = document.querySelectorAll('ul.pl-3');
        containers.forEach(container => {
            container.classList.remove('bg-slate-200', 'dark:bg-slate-700');
        });

        try {
            const draggedData = JSON.parse(e.dataTransfer.getData('text/plain')) as DraggedItem;
            
            // Find the nearest parent folder
            let targetNode = node;
            while (targetNode && !targetNode.isFolder) {
                if (!targetNode.parentFolderId || targetNode.parentFolderId === 'ROOT') break;
                targetNode = {
                    ...targetNode,
                    id: targetNode.parentFolderId,
                    isFolder: true
                };
            }

            // If we found a valid folder to drop into
            if (targetNode.isFolder) {
                // Don't allow dropping a folder into itself or its children
                if (draggedData.id === targetNode.id || targetNode.path?.startsWith(draggedData.path + '/')) {
                    return;
                }

                // Call the parent's onDrop handler with the target folder
                if (onSelect) {
                    onSelect({ ...targetNode, draggedItem: draggedData });
                }
            }
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    }, [node, onSelect]);

    const ChildrenList = useCallback(() => {
        const children = node.nodes?.map((childNode) => (
            <FilesystemItem
                node={childNode}
                key={childNode.name}
                animated={animated}
                onSelect={onSelect}
                isSelected={isSelected}
                onNodeSelect={onNodeSelect}
            />
        ));
    
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
                                // Reset animation flag after animation completes
                                setShouldAnimate(false);
                            }}
                        >
                            {children}
                        </motion.ul>
                    )}
                </AnimatePresence>
            );
        }
        
        // If not animating but still open, render without animation
        if (isOpen) {
            return <ul className="pl-3">{children}</ul>;
        }
        
        return null;
    }, [node.nodes, isOpen, animated, onSelect, isSelected, onNodeSelect, shouldAnimate]);

    return (
        <li key={node.name} className="mb-1">
            <ContextMenu>
                <ContextMenuTrigger>
                    <Popover open={showPopover && !isRenaming}>
                        <PopoverTrigger asChild>
                            <div
                                className={`group flex items-center gap-1.5 py-1 px-2 text-sm whitespace-nowrap rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 relative select-none overflow-hidden ${
                                    isSelected ? 'bg-blue-50 dark:bg-blue-900 border-r-2 border-blue-500' : ''
                                }`}
                                onClick={handleClick}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleMouseLeave}
                                draggable={true}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="flex-shrink-0 flex items-center gap-1.5">
                                    {node.name !== "Home" && node.nodes && node.nodes.length > 0 && (
                                        <ChevronIcon />
                                    )}

                                    {(node.isFolder) ? (
                                        <div></div>
                                    ) : node.name?.toLowerCase().endsWith('.pdf') ? (
                                        <FaFilePdf className={`ml-[22px] w-4 h-4 text-red-500 flex-shrink-0`} />
                                    ) : (
                                        <File className="ml-[22px] w-4 h-4 text-gray-900 flex-shrink-0" />
                                    )}
                                </div>

                                <span className="relative select-none min-w-0 flex-1">
                                    <div className="flex items-center overflow-hidden">
                                        {node.name !== "Home" && (
                                            <span className="text-gray-400 select-none flex-shrink-0">{node.numbering}</span>
                                        )}
                                        {isRenaming ? (
                                            <Input
                                                className="h-6 ml-1"
                                                value={newName.split('.')[0]} // Show name without extension
                                                onChange={(e) => setNewName(e.target.value)}
                                                onKeyDown={handleRenameSubmit}
                                                onBlur={() => {
                                                    setIsRenaming(false);
                                                    setNewName(node.name);
                                                }}
                                                autoFocus
                                            />
                                        ) : (
                                            <span className="ml-1 select-none truncate">
                                                {node.name}
                                            </span>
                                        )}
                                    </div>
                                </span>
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

            {/* Always show children for "Home" */}
            {node.name === "Home" ? (
                <ul className="pl-3">
                    {node.nodes?.map((childNode) => (
                        <FilesystemItem
                            node={childNode}
                            key={childNode.name}
                            animated={animated}
                            onSelect={onSelect}
                            isSelected={isSelected}
                            onNodeSelect={onNodeSelect}
                            
                        />
                    ))}
                </ul>
            ) : (
                <ChildrenList />
            )}
        </li>
    )
}