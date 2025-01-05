import React, { useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { X } from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  content: React.ReactElement; // Changed from ReactNode
}

interface TabSystemProps {
  tabs: Tab[];
  activeTabId: string;
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
}

const TabSystem: React.FC<TabSystemProps> = ({ tabs, activeTabId, setActiveTabId, setTabs }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const newTabs = Array.from(tabs);
    const [reorderedItem] = newTabs.splice(result.source.index, 1);
    newTabs.splice(result.destination.index, 0, reorderedItem);

    setTabs(newTabs);
  };

  function truncateString(str: string) {
    if (str.length > 20) {
        return str.slice(0, 17) + '...';
    }
    return str;
}

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]?.id || '');
    }
  };

  // Updated function to add or activate a tab
  const addOrActivateTab = (newTab: Tab) => {
    const existingTab = tabs.find(tab => tab.id === newTab.id);
    if (existingTab) {
      // If the tab already exists, just activate it
      setActiveTabId(existingTab.id);
    } else {
      // If it's a new tab, add it and activate it
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
    <div className="flex flex-col h-full">
      <div className="relative flex bg-gray-300">
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
                        className={`flex items-center px-4 py-2 cursor-pointer whitespace-nowrap ${
                          activeTabId === tab.id ? 'bg-white border-t-blue-500 border-r-0 border-l-0 border-b-0 border-t-2' : 'bg-gray-200'
                        }`}
                        onClick={() => setActiveTabId(tab.id)}
                      >
                        <span className="mr-2 text-sm">{truncateString(tab.title)}</span>
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
      
      <div className="flex-grow bg-white p-4 relative">
        {tabs.map(tab => (
          <div
            key={tab.id}
            style={{
              display: tab.id === activeTabId ? 'block' : 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'auto'
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