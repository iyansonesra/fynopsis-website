import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FolderTreeState {
  // Keep track of which nodes are open by their IDs
  openNodes: Set<string>;
  
  // Actions
  toggleNode: (nodeId: string) => void;
  openNode: (nodeId: string) => void;
  closeNode: (nodeId: string) => void;
  isNodeOpen: (nodeId: string) => boolean;
  resetState: () => void;
}

export const useFolderTreeStore = create<FolderTreeState>()(
  persist(
    (set, get) => ({
      openNodes: new Set(['ROOT']), // Start with root node open
      
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
      
      resetState: () => set({ openNodes: new Set(['ROOT']) })
    }),
    {
      name: 'folder-tree-storage',
      // Custom storage with serialization for Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              openNodes: new Set(parsed.state.openNodes)
            }
          };
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              openNodes: Array.from(value.state.openNodes)
            }
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
);