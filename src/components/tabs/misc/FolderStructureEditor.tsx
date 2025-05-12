import React, { useState, useCallback, useEffect } from 'react';
import { FolderIcon, FileIcon, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

interface TreeItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: TreeItem[];
  number?: string;
}

interface TreeNodeProps {
  item: TreeItem;
  level: number;
  onDelete: (id: string) => void;
  onAdd: (parentId: string, type: 'folder' | 'file') => void;
  onNameChange: (id: string, newName: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ item, level, onDelete, onAdd, onNameChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(item.name);

  const handleNameSubmit = () => {
    if (newName.trim()) {
      onNameChange(item.id, newName.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 py-1" style={{ marginLeft: `${level * 20}px` }}>
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm text-gray-500 w-8">{item.number}</span>
        {item.type === 'folder' ? (
          <FolderIcon className="h-4 w-4 text-yellow-500" />
        ) : (
          <FileIcon className="h-4 w-4 text-gray-500" />
        )}
        {isEditing ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            className="h-6 w-40"
            autoFocus
          />
        ) : (
          <span
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 rounded"
            onClick={() => setIsEditing(true)}
          >
            {item.name}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {item.type === 'folder' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAdd(item.id, 'folder')}
              className="h-6 w-6 p-0"
            >
              <FolderIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAdd(item.id, 'file')}
              className="h-6 w-6 p-0"
            >
              <FileIcon className="h-4 w-4" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface FolderStructureEditorProps {
    onSchemaChange: (schema: string) => void;
    initialSchema?: string;
    isEditable?: boolean;
}

export const FolderStructureEditor: React.FC<FolderStructureEditorProps> = ({ onSchemaChange, initialSchema, isEditable = true }) => {
  const [tree, setTree] = useState<TreeItem[]>([
    {
      id: '1',
      name: 'Root',
      type: 'folder',
      children: [],
    },
  ]);

  useEffect(() => {
    if (initialSchema) {
      const parsedTree = parseSchema(initialSchema);
      setTree(parsedTree);
      onSchemaChange(initialSchema);
    }
  }, [initialSchema, onSchemaChange]);

  // Implement the parseSchema function to convert the schema string to TreeItem[]
  const parseSchema = (schema: string): TreeItem[] => {
    // Example parsing logic (you'll need to adjust this based on your schema format)
    // This is a placeholder; implement your actual parsing logic here

    console.log(schema);
    return [
      {
        id: '1',
        name: 'Root',
        type: 'folder',
        children: [],
      },
    ];
  };

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
    const addNumbers = (items: TreeItem[], parentNumber: string = ''): TreeItem[] => {
      return items.map((item, index) => {
        if (item.id === '1' && item.name === 'Root') {
          return {
            ...item,
            children: item.children ? addNumbers(item.children, '') : undefined,
          };
        }
        
        const currentNumber = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
        return {
          ...item,
          number: currentNumber,
          children: item.children ? addNumbers(item.children, currentNumber) : undefined,
        };
      });
    };

    const numberedTree = addNumbers(newTree);
    setTree(numberedTree);
    const schema = generateSchema(numberedTree);
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
        {item.id === '1' && item.name === 'Root' ? (
          item.children && renderTree(item.children, 0)
        ) : (
          <>
            <TreeNode
              item={item}
              level={level}
              onDelete={handleDelete}
              onAdd={isEditable ? handleAdd : () => {}}
              onNameChange={isEditable ? handleNameChange : () => {}}
            />
            {item.children && renderTree(item.children, level + 1)}
          </>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div className="p-4">
      {renderTree(tree)}
      {isEditable && (
        <div className="mt-4 flex gap-2">
          <Button
            className="dark:bg-slate-800 bg-white border-none text-black dark:text-white bg-slate-200 hover:bg-slate-300"
            onClick={() => handleAdd('1', 'folder')}
          >
            <FolderIcon className="h-4 w-4 mr-2 dark:text-gray-200 text-black" />
            Add Folder
          </Button>
          <Button
            className="dark:bg-slate-800 bg-white border-none text-black dark:text-white bg-slate-200 hover:bg-slate-300"
            onClick={() => handleAdd('1', 'file')}
          >
            <FileIcon className="h-4 w-4 mr-2 dark:text-gray-200 text-black" />
            Add File
          </Button>
        </div>
      )}
    </div>
  );
}; 