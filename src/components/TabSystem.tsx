import React, { useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { X } from 'lucide-react';
import { useTabStore } from './tabStore';


interface Tab {
  id: string;
  title: string;
  content: React.ReactElement; // Changed from ReactNode
}

interface TabSystemProps {
  tabs: Tab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
}

const TabSystem: React.FC<TabSystemProps> = ({ tabs, setTabs }) => {
  const { activeTabId, setActiveTabId, reorderTabs } = useTabStore();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);


  // Add effect to manage focus when switching tabs
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus();
    }
  }, [activeTabId]);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    
    reorderTabs(result.source.index, result.destination.index);
    setTabs(useTabStore.getState().tabs);
  };

  const closeTab = (tabId: string) => {
    useTabStore.getState().removeTab(tabId);
    setTabs(useTabStore.getState().tabs);
  };

  function truncateString(str: string) {
    if (str.length > 20) {
      return str.slice(0, 17) + '...';
    }
    return str;
  }

  // const closeTab = (tabId: string) => {
  //   const newTabs = tabs.filter(tab => tab.id !== tabId);
  //   setTabs(newTabs);

  //   if (activeTabId === tabId) {
  //     setActiveTabId(newTabs[0]?.id || '');
  //   }
  // };

  // // Updated function to add or activate a tab
  // const addOrActivateTab = (newTab: Tab) => {
  //   const existingTab = tabs.find(tab => tab.id === newTab.id);
  //   if (existingTab) {
  //     // If the tab already exists, just activate it
  //     setActiveTabId(existingTab.id);
  //   } else {
  //     // If it's a new tab, add it and activate it
  //     setTabs([...tabs, newTab]);
  //     setActiveTabId(newTab.id);
  //   }
  // };

  const findTabByTitle = (tabs: Tab[], title: string): Tab | undefined => {
    return tabs.find(tab => tab.title === title);
  };

  // useEffect(() => {
  //   useTabStore.getState().setCurrentTabs(tabs);
  // }, [tabs]);

  // Update the addOrActivateTab function
  const addOrActivateTab = (newTab: Tab) => {
    const existingTab = findTabByTitle(tabs, newTab.title);
    if (existingTab) {
      // If a tab with the same title exists, just activate it
      setActiveTabId(existingTab.id);
    } else {
      // If no tab with this title exists, add it and activate it
      setTabs([...tabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  useEffect(() => {
    const activeTab = document.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  return (
    <div className="flex flex-col h-full dark:bg-darkbg outline-none">
      <div className="relative flex bg-gray-300 dark:bg-gray-950 outline-none">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="tabs" direction="horizontal">
            {(provided) => (
              <div
                ref={(element) => {
                  provided.innerRef(element);
                  if (scrollContainerRef) {
                    if (scrollContainerRef.current !== element) {
                      scrollContainerRef.current = element;
                    }
                  }
                }}
                {...provided.droppableProps}
                className="flex overflow-x-auto hide-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {tabs.map((tab, index) => (
                  <Draggable key={tab.id} draggableId={tab.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        data-tab-id={tab.id}
                        className={`flex items-center px-4 py-2 cursor-pointer whitespace-nowrap ${activeTabId === tab.id ? 'bg-white dark:bg-darkbg border-t-blue-500 border-r-0 border-l-0 border-b-0 border-t-2' : 'bg-gray-200 dark:bg-gray-900'
                          }`}
                        onClick={() => setActiveTabId(tab.id)}
                      >
                        <span className="mr-2 text-sm dark:text-white">{truncateString(tab.title)}</span>
                        {tab.title == "All Files" ?
                          null : <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(tab.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={16} />
                          </button>
                        }

                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div className="flex-grow bg-white relative outline-none">
        {tabs.map(tab => (
          <div
            key={tab.id}
            ref={tab.id === activeTabId ? contentRef : null}
            // tabIndex={tab.id === activeTabId ? 0 : -1}
            aria-hidden={tab.id !== activeTabId}
            style={{
              visibility: tab.id === activeTabId ? 'visible' : 'hidden',
              opacity: tab.id === activeTabId ? 1 : 0,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'auto',
              pointerEvents: tab.id === activeTabId ? 'auto' : 'none'
            }}
          >
            {tab.content}
          </div>
        ))}
      </div>


      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default TabSystem;