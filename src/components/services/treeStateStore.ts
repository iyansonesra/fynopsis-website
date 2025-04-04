import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Node {
    name: string;
    nodes?: Node[];
    numbering?: string;
    id?: string;
    path?: string;
    isFolder?: boolean;
}

interface DragState {
    isDragging: boolean;
    draggedItem?: {
        id: string;
        name: string;
        isFolder: boolean;
        path: string;
    };
    dropTarget?: {
        id: string;
        isFolder: boolean;
    };
}

interface FolderTreeState {
    // Keep track of which nodes are open by their IDs
    openNodes: Set<string>;
    // Store the entire folder tree structure
    folderTree: Node[];
    // Drag and drop state
    dragState: DragState;
    
    // Actions
    toggleNode: (nodeId: string) => void;
    openNode: (nodeId: string) => void;
    closeNode: (nodeId: string) => void;
    isNodeOpen: (nodeId: string) => boolean;
    setFolderTree: (tree: Node[]) => void;
    resetState: () => void;
    
    // Drag and drop actions
    startDrag: (item: DragState['draggedItem']) => void;
    endDrag: () => void;
    setDropTarget: (target: DragState['dropTarget']) => void;
    clearDropTarget: () => void;
    reorderItems: (sourceId: string, targetId: string, isFolder: boolean) => void;
}

export const useFolderTreeStore = create<FolderTreeState>()(
    persist(
        (set, get) => ({
            openNodes: new Set(['ROOT']), // Start with root node open
            folderTree: [],
            dragState: {
                isDragging: false
            },
            
            toggleNode: (nodeId: string) => set((state) => {
                const newOpenNodes = new Set(state.openNodes);
                if (newOpenNodes.has(nodeId)) {
                    newOpenNodes.delete(nodeId);
                } else {
                    newOpenNodes.add(nodeId);
                }
                return { openNodes: newOpenNodes };
            }),
            
            openNode: (nodeId: string) => set((state) => {
                const newOpenNodes = new Set(state.openNodes);
                newOpenNodes.add(nodeId);
                return { openNodes: newOpenNodes };
            }),
            
            closeNode: (nodeId: string) => set((state) => {
                const newOpenNodes = new Set(state.openNodes);
                newOpenNodes.delete(nodeId);
                return { openNodes: newOpenNodes };
            }),
            
            isNodeOpen: (nodeId: string) => {
                return get().openNodes.has(nodeId);
            },

            setFolderTree: (tree: Node[]) => set({ folderTree: tree }),
            
            resetState: () => set({ 
                openNodes: new Set(['ROOT']),
                folderTree: [],
                dragState: { isDragging: false }
            }),

            startDrag: (item) => set((state) => ({
                dragState: {
                    isDragging: true,
                    draggedItem: item
                }
            })),

            endDrag: () => set((state) => ({
                dragState: {
                    isDragging: false
                }
            })),

            setDropTarget: (target) => set((state) => ({
                dragState: {
                    ...state.dragState,
                    dropTarget: target
                }
            })),

            clearDropTarget: () => set((state) => ({
                dragState: {
                    ...state.dragState,
                    dropTarget: undefined
                }
            })),

            reorderItems: (sourceId, targetId, isFolder) => {
                const state = get();
                const updateTree = (nodes: Node[]): Node[] => {
                    return nodes.map(node => {
                        if (node.id === targetId && node.nodes) {
                            // Find the source item
                            const sourceItem = findItemById(state.folderTree, sourceId);
                            if (!sourceItem) return node;

                            // Remove the source item from its current location
                            const newNodes = removeItemById(state.folderTree, sourceId);

                            // Add the source item to the target location
                            return {
                                ...node,
                                nodes: [...(node.nodes || []), sourceItem]
                            };
                        }
                        if (node.nodes) {
                            return {
                                ...node,
                                nodes: updateTree(node.nodes)
                            };
                        }
                        return node;
                    });
                };

                const newTree = updateTree(state.folderTree);
                set({ folderTree: newTree });
            }
        }),
        {
            name: 'folder-tree-storage',
            storage: {
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;
                    const parsed = JSON.parse(str);
                    return {
                        ...parsed,
                        state: {
                            ...parsed.state,
                            openNodes: new Set(parsed.state.openNodes),
                            folderTree: parsed.state.folderTree || [],
                            dragState: { isDragging: false }
                        }
                    };
                },
                setItem: (name, value) => {
                    const serialized = {
                        ...value,
                        state: {
                            ...value.state,
                            openNodes: Array.from(value.state.openNodes),
                            folderTree: value.state.folderTree,
                            dragState: { isDragging: false }
                        }
                    };
                    localStorage.setItem(name, JSON.stringify(serialized));
                },
                removeItem: (name) => localStorage.removeItem(name)
            }
        }
    )
);

// Helper functions for tree manipulation
function findItemById(nodes: Node[], id: string): Node | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.nodes) {
            const found = findItemById(node.nodes, id);
            if (found) return found;
        }
    }
    return null;
}

function removeItemById(nodes: Node[], id: string): Node[] {
    return nodes.filter(node => {
        if (node.id === id) return false;
        if (node.nodes) {
            node.nodes = removeItemById(node.nodes, id);
        }
        return true;
    });
}