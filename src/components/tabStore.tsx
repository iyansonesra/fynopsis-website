import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Tab {
  id: string;
  title: string;
  content: React.ReactElement;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  setTabs: (tabs: Tab[]) => void;
  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

export const useTabStore = create<TabStore>()(
  persist(
    (set) => ({
      tabs: [],
      activeTabId: '',
      setActiveTabId: (id) => set({ activeTabId: id }),
      setTabs: (tabs) => set({ tabs }),
      addTab: (newTab) => 
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        })),
      removeTab: (id) =>
        set((state) => {
          const newTabs = state.tabs.filter((tab) => tab.id !== id);
          return {
            tabs: newTabs,
            activeTabId: state.activeTabId === id ? newTabs[0]?.id || '' : state.activeTabId,
          };
        }),
      reorderTabs: (fromIndex, toIndex) =>
        set((state) => {
          const newTabs = [...state.tabs];
          const [movedTab] = newTabs.splice(fromIndex, 1);
          newTabs.splice(toIndex, 0, movedTab);
          return { tabs: newTabs };
        }),
    }),
    {
      name: 'tab-storage',
      skipHydration: true, // Important for handling React elements
      partialize: (state) => ({
        tabs: state.tabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          // Exclude content as React elements can't be serialized
        })),
        activeTabId: state.activeTabId,
      }),
    }
  )
);