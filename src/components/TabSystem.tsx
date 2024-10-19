import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface TabSystemProps {
  tabs: Tab[];
  activeTabId: string;
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>;
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
}

const TabSystem: React.FC<TabSystemProps> = ({ tabs, activeTabId, setActiveTabId, setTabs }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setShowLeftScroll(container.scrollLeft > 0);
      setShowRightScroll(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }
  };

  useEffect(() => {
    checkScrollButtons();
    window.addEventListener('resize', checkScrollButtons);
    return () => window.removeEventListener('resize', checkScrollButtons);
  }, [tabs]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const newTabs = Array.from(tabs);
    const [reorderedItem] = newTabs.splice(result.source.index, 1);
    newTabs.splice(result.destination.index, 0, reorderedItem);

    setTabs(newTabs);
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]?.id || '');
    }
  };

  // Scroll active tab into view when it changes
  useEffect(() => {
    const activeTab = document.querySelector(`[data-tab-id="${activeTabId}"]`);
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex bg-gray-300">
        {/* {showLeftScroll && (
          <button
            onClick={() => scroll('left')}
            className="sticky left-0 z-10 px-1 bg-gray-300 hover:bg-gray-400 flex items-center"
          >
            <ChevronLeft size={20} />
          </button>
        )} */}
        
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="tabs" direction="horizontal">
            {(provided) => (
              <div
                ref={(element) => {
                  provided.innerRef(element);
                  if (scrollContainerRef) {
                    scrollContainerRef.current = element;
                  }
                }}
                {...provided.droppableProps}
                className="flex overflow-x-auto hide-scrollbar"
                onScroll={checkScrollButtons}
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
                          activeTabId === tab.id ? 'bg-white' : 'bg-gray-200'
                        }`}
                        onClick={() => setActiveTabId(tab.id)}
                      >
                        <span className="mr-2">{tab.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.id);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* {showRightScroll && (
          <button
            onClick={() => scroll('right')}
            className="sticky right-0 z-10 px-1 bg-gray-300 hover:bg-gray-400 flex items-center"
          >
            <ChevronRight size={20} />
          </button>
        )} */}
      </div>
      
      <div className="flex-grow bg-white p-4">
        {tabs.find(tab => tab.id === activeTabId)?.content}
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