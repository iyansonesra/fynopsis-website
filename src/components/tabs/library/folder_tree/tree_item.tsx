"use client"

import { useState, useCallback, memo, useEffect } from "react"
import { ChevronRight, Folder, File, MoreHorizontal } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useFolderTreeStore } from '@/components/services/treeStateStore';

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
}

interface FilesystemItemProps {
    node: Node
    animated?: boolean
    onSelect?: (node: Node) => void
}

// Extract context menu to a separate component
const ContextMenu = memo(({ 
    node, 
    handleOpenFolder,
    visible,
    onClose
}: { 
    node: Node, 
    handleOpenFolder: (e: React.MouseEvent) => void,
    visible: boolean,
    onClose: () => void
}) => {
    const contextMenuRef = React.useRef<HTMLDivElement>(null);
   


    // Handle clicking outside the context menu to close it
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as HTMLElement)) {
                onClose();
            }
        };
        
        if (visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [visible, onClose]);

    if (!visible || !(node.isFolder || node.nodes)) return null;

    return (
        <div 
            ref={contextMenuRef}
            className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-md shadow-md py-1"
        >
            <button 
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={handleOpenFolder}
            >
                Open
            </button>
            {/* Add more context menu options here */}
        </div>
    );
});

export function FilesystemItem({
    node,
    animated = false,
    onSelect
}: FilesystemItemProps) {
    const { isNodeOpen, toggleNode } = useFolderTreeStore();
    const isOpen = node.id ? isNodeOpen(node.id) : false;
    const [showContextMenu, setShowContextMenu] = useState(false);
    const lastClickTimeRef = React.useRef<number>(0);
    
    // Track previous open state to determine if animation should play
    const [prevOpenState, setPrevOpenState] = useState(isOpen);
    const [shouldAnimate, setShouldAnimate] = useState(false);

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
            
            // Close context menu after action
            setShowContextMenu(false);
        }, [node, onSelect, isOpen, toggleNode]);

        const ChildrenList = useCallback(() => {
            const children = node.nodes?.map((childNode) => (
                <FilesystemItem
                    node={childNode}
                    key={childNode.name}
                    animated={animated}
                    onSelect={onSelect}
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
        }, [node.nodes, isOpen, animated, onSelect, shouldAnimate]);

    return (
        <li key={node.name} className="mb-1">
               <div
            className="group flex items-center gap-1.5 py-1 px-2 text-sm whitespace-nowrap rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 relative select-none"
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        >
            {node.name !== "Home" && node.nodes && node.nodes.length > 0 && (
                <ChevronIcon />
            )}

            {(node.isFolder) ? (
                <Folder
                    className={`w-4 h-4 text-sky-500 fill-sky-500 ${!node.nodes || node.nodes.length === 0 ? "ml-[22px]" : ""}`}
                />
            ) : (
                <File className="ml-[22px] w-4 h-4 text-gray-900" />
            )}

            <span className="relative select-none text-xs">
                {node.name !== "Home" && (
                    <span className="text-gray-400 select-none">{node.numbering}</span>
                )}{"  "}
                <span className="ml-1 select-none">
                    {node.name}
                </span>

                <ContextMenu 
                    node={node}
                    handleOpenFolder={handleOpenFolder}
                    visible={showContextMenu}
                    onClose={closeContextMenu}
                />
            </span>
        </div>

            {/* Always show children for "Home" */}
            {node.name === "Home" ? (
                <ul className="pl-3">
                    {node.nodes?.map((childNode) => (
                        <FilesystemItem
                            node={childNode}
                            key={childNode.name}
                            animated={animated}
                            onSelect={onSelect}
                        />
                    ))}
                </ul>
            ) : (
                <ChildrenList />
            )}
        </li>
    )
}