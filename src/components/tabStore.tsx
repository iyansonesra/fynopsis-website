
// tabStore.ts
import { create } from 'zustand';
import { FileSystem } from './ElevatedTable';

interface Tab {
  id: string;
  title: string;
  content: React.ReactElement; // Changed from ReactNode
}

interface TabStore {
  currentTabs: Tab[];
  setCurrentTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  initializeDefaultTab: (handleFileSelect: (file: any) => void) => void;
}

export const useTabStore = create<TabStore>((set) => ({
  currentTabs: [],
  setCurrentTabs: (value) => set((state) => ({ 
      currentTabs: typeof value === 'function' ? value(state.currentTabs) : value 
  })),
  activeTabId: '1',
  setActiveTabId: (id) => set({ activeTabId: id }),
  initializeDefaultTab: (handleFileSelect) => set((state) => ({
      currentTabs: [{
          id: '1',
          title: 'All Files',
          content: <FileSystem onFileSelect={handleFileSelect} />
      }],
      activeTabId: '1'
  }))
}));

