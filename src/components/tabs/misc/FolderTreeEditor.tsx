import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FolderIcon, FileIcon, GripVertical, X, Plus } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '../../ui/button';

export interface TreeItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: TreeItem[];
}

interface TreeNodeProps {
  item: TreeItem;
  level: number;
  onDelete: (id: string) => void;
  onAdd: (parentId: string, type: 'folder' | 'file') => void;
  onMove: (dragId: string, hoverId: string) => void;
  onNameChange: (id: string, newName: string) => void;
}

interface FolderTreeEditorProps {
  onSchemaChange: (schema: string) => void;
  initialTree?: TreeItem[];
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, level, onDelete, onAdd, onMove, onNameChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);

  const [{ isDragging }, drag] = useDrag({
    type: 'TREE_ITEM',
    item: { id: item.id, type: item.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'TREE_ITEM',
    hover: (draggedItem: { id: string }) => {
      if (draggedItem.id !== item.id) {
        onMove(draggedItem.id, item.id);
      }
    },
  });

  // Fix: Create a ref and combine drag and drop refs
  const ref = useRef<HTMLDivElement>(null);
  drag(drop(ref));

  const handleNameSubmit = () => {
    onNameChange(item.id, name);
    setIsEditing(false);
  };

  return (
    <div
      ref={ref}  // Use the combined ref here
      style={{
        marginLeft: `${level * 20}px`,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 py-1 group"
    >
      <GripVertical className="h-4 w-4 cursor-move opacity-0 group-hover:opacity-100 dark:text-gray-200" />
      {item.type === 'folder' ? (
        <FolderIcon className="h-4 w-4 text-yellow-500" />
      ) : (
        <FileIcon className="h-4 w-4 text-gray-500" />
      )}
      
      {isEditing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
          className="px-1 text-sm dark:bg-darkbg dark:text-gray-200 select-none outline-none"
          autoFocus
        />
      ) : (
        <span
          onDoubleClick={() => setIsEditing(true)}
          className="text-sm cursor-text dark:text-gray-200"
        >
          {item.name}
        </span>
      )}

      <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-1">
        {item.type === 'folder' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 dark:text-gray-200"
              onClick={() => onAdd(item.id, 'folder')}
            >
              <Plus className="h-3 w-3" />
              Folder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 dark:text-gray-200"
              onClick={() => onAdd(item.id, 'file')}
            >
              <Plus className="h-3 w-3" />
              File
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-red-600 hover:text-red-700"
          onClick={() => onDelete(item.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export const FolderTreeEditor: React.FC<FolderTreeEditorProps> = ({ onSchemaChange, initialTree }) => {
  const [tree, setTree] = useState<TreeItem[]>(initialTree || [
    {
      id: '1',
      name: 'Root',
      type: 'folder',
      children: [],
    },
  ]);

  // Add useEffect to update tree when initialTree changes
  useEffect(() => {
    if (initialTree) {
      setTree(initialTree);
      const schema = generateSchema(initialTree);
      onSchemaChange(schema);
    }
  }, [initialTree, onSchemaChange]);

  const generateSchema = useCallback((items: TreeItem[]): string => {
    const buildYaml = (items: TreeItem[], level: number = 0): string => {
      return items.map(item => {
        const indent = '  '.repeat(level);
        if (item.type === 'folder') {
          const childrenYaml = item.children ? buildYaml(item.children, level + 1) : '';
          return `${indent}${item.name}:\n${childrenYaml}`;
        }
        return `${indent}- ${item.name}`;
      }).join('\n');
    };

    return buildYaml(items);
  }, []);

  const updateTree = useCallback((newTree: TreeItem[]) => {
    setTree(newTree);
    const schema = generateSchema(newTree);
    onSchemaChange(schema);
  }, [generateSchema, onSchemaChange]);

  const handleDelete = (id: string) => {
    const deleteItem = (items: TreeItem[]): TreeItem[] => {
      return items.filter(item => {
        if (item.id === id) return false;
        if (item.children) {
          item.children = deleteItem(item.children);
        }
        return true;
      });
    };

    const newTree = deleteItem(tree);
    updateTree(newTree);
  };

  const handleAdd = (parentId: string, type: 'folder' | 'file') => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newName = type === 'folder' ? 'New Folder' : 'New File';

    const addItem = (items: TreeItem[]): TreeItem[] => {
      return items.map(item => {
        if (item.id === parentId) {
          return {
            ...item,
            children: [
              ...(item.children || []),
              {
                id: newId,
                name: newName,
                type,
                ...(type === 'folder' ? { children: [] } : {}),
              },
            ],
          };
        }
        if (item.children) {
          return {
            ...item,
            children: addItem(item.children),
          };
        }
        return item;
      });
    };

    const newTree = addItem(tree);
    updateTree(newTree);
  };

  const handleMove = (dragId: string, hoverId: string) => {
    // Implement drag and drop logic here
  };

  const handleNameChange = (id: string, newName: string) => {
    const updateName = (items: TreeItem[]): TreeItem[] => {
      return items.map(item => {
        if (item.id === id) {
          return { ...item, name: newName };
        }
        if (item.children) {
          return { ...item, children: updateName(item.children) };
        }
        return item;
      });
    };

    const newTree = updateName(tree);
    updateTree(newTree);
  };

  const renderTree = (items: TreeItem[], level: number = 0) => {
    return items.map(item => (
      <React.Fragment key={item.id}>
        {/* Skip rendering the Root folder itself, but render its children */}
        {item.id === '1' && item.name === 'Root' ? (
          // Only render children of Root, not Root itself
          item.children && renderTree(item.children, 0)
        ) : (
          // Render normally for all other nodes
          <>
            <TreeNode
              item={item}
              level={level}
              onDelete={handleDelete}
              onAdd={handleAdd}
              onMove={handleMove}
              onNameChange={handleNameChange}
            />
            {item.children && renderTree(item.children, level + 1)}
          </>
        )}
      </React.Fragment>
    ));
  };

  // Get the root node
  const rootNode = tree[0];

  return (
    <div className="h-full">
      {renderTree(tree)}
      <Button
        className="mt-4 dark:bg-slate-800 bg-white border-none text-black dark:text-white bg-slate-200 hover:bg-slate-300"
        onClick={() => handleAdd('1', 'folder')}
      >
        <Plus className="h-4 w-4 mr-2 dark:text-gray-200 text-black" />
        Add Folder
      </Button>
    </div>
  );
};
