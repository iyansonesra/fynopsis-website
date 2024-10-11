import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { X } from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface TabSystemProps {
  initialTabs: Tab[];
}

const TabSystem: React.FC<TabSystemProps> = ({ initialTabs }) => {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialTabs[0]?.id || '');

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

  return (
    <div className="flex flex-col h-full">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tabs" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex bg-gray-300 text-black"
            >
              {tabs.map((tab, index) => (
                <Draggable key={tab.id} draggableId={tab.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center px-4 py-2 cursor-pointer ${
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
                        className="text-gray-400 hover:text-white"
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
      <div className="flex-grow bg-white p-4">
        {tabs.find(tab => tab.id === activeTabId)?.content}
      </div>
    </div>
  );
};

export default TabSystem;