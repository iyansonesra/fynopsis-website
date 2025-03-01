import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { post, get } from 'aws-amplify/api';
import { Loader2, RotateCcw } from 'lucide-react';
import { FolderTreeEditor } from './FolderTreeEditor';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from './ui/use-toast';

// Add new imports
import { ScrollArea } from "./ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { FolderIcon, ChevronRightIcon, ChevronDownIcon, FileIcon, ArrowRight, Pencil, Check, X, Trash2 } from 'lucide-react';
import { useFileStore } from './HotkeyService';
import { Input } from './ui/input';

interface FileOrganizerDialogProps {
  bucketId: string;
  onOrganize: (changes: FileChange[]) => void;
  open: boolean;
  onClose: () => void;

}

export interface FileChange {
  originalPath: string;
  newPath: string;
}

interface ApplyOrganizationResponse {
  results: {
    successful: boolean;
  };
}

interface CancelOrganizationResponse {
  message: string;
}

interface UndoOrganizationResponse {
  message: string;
  results?: {
    successful: any[];
    failed: any[];
    summary?: {
      total: number;
      succeeded: number;
      failed: number;
    }
  }
}

type SchemaStatus = 'NO_SCHEMA' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'UNDO_BACKUP';

interface OrganizationResults {
  file_assignments: Record<string, string>;
  new_names: Record<string, string>;
  reasoning: string;
}

interface SchemaResponse {
  schemas: Array<{
    status: SchemaStatus;
    error?: string;
    results?: OrganizationResults;
    schemaId?: string;
    schema?: string;
  }>;
}

interface TreeViewProps {
  schema: string;
  fileAssignments: Record<string, string>;
  newNames: Record<string, string>;
}

interface InteractiveFileTreeProps {
  fileAssignments: Record<string, string>;
  newNames: Record<string, string>;
  onUpdateAssignments: (fileAssignments: Record<string, string>) => void;
  onUpdateNames: (newNames: Record<string, string>) => void;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children: TreeNode[];
  path: string;
  sourceFile?: string;
  originalName?: string;
  newName?: string;
  isExpanded?: boolean;
  isEditing?: boolean;
}

const TreeView: React.FC<TreeViewProps> = ({ schema, fileAssignments, newNames }) => {
  // Convert YAML-like schema to tree structure
  const parseSchema = (schemaText: string) => {
    const lines = schemaText.split('\n');
    const tree: any = {};
    let currentLevel = 0;
    let currentPath: string[] = [];

    lines.forEach(line => {
      const indent = line.search(/\S/);
      const level = Math.floor(indent / 2);
      const name = line.trim().replace(':', '');

      if (!name) return;

      while (currentLevel >= level) {
        currentPath.pop();
        currentLevel--;
      }

      currentPath[level] = name;
      currentLevel = level;

      let current = tree;
      for (let i = 0; i <= level; i++) {
        const pathPart = currentPath[i];
        if (!current[pathPart]) {
          current[pathPart] = {};
        }
        current = current[pathPart];
      }
    });

    return tree;
  };

  const renderTree = (node: any, path: string = '') => {
    return Object.entries(node).map(([key, value]) => {
      const currentPath = path ? `${path}/${key}` : key;
      const hasChildren = Object.keys(value as object).length > 0;

      return (
        <div key={currentPath} className="ml-4">
          <div className="flex items-center gap-2 py-1">
            {hasChildren ? <FolderIcon className="h-4 w-4 text-yellow-500" /> : <FileIcon className="h-4 w-4 text-gray-500" />}
            <span>{key}</span>
          </div>
          {hasChildren && (
            <div className="ml-4 border-l-2 border-gray-200 pl-2">
              {renderTree(value, currentPath)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
      <div className="space-y-2">
        {renderTree(parseSchema(schema))}
      </div>
  );
};

const InteractiveFileTree: React.FC<InteractiveFileTreeProps> = ({ 
  fileAssignments, 
  newNames, 
  onUpdateAssignments,
  onUpdateNames
}) => {
  const getFileName = useFileStore(state => state.getFileName);
  const searchableFiles = useFileStore(state => state.searchableFiles);
  const [treeData, setTreeData] = useState<TreeNode>({ 
    id: 'root', 
    name: 'Root', 
    type: 'folder', 
    children: [],
    path: '',
    isExpanded: true
  });

  // Function to get the real file name from the searchable files by ID
  const getFileNameById = useCallback((fileId: string): string => {
    // Try to find the file in searchableFiles
    const file = searchableFiles.find(f => f.fileId === fileId);
    
    // If found and fileName is not empty, return it
    if (file && file.fileName) {
      return file.fileName;
    }
    
    // Otherwise return the fileId as fallback
    return fileId;
  }, [searchableFiles]);

  // Build tree structure from file assignments
  const buildTreeStructure = useCallback(() => {
    const root: TreeNode = { 
      id: 'root', 
      name: 'Root', 
      type: 'folder', 
      children: [],
      path: '',
      isExpanded: true
    };

    // Helper function to remove 'Root/' from the beginning of paths
    const removeRootPrefix = (path: string): string => {
      if (path.startsWith('Root/')) {
        return path.substring(5); // Remove 'Root/'
      }
      return path;
    };

    // Sort paths to ensure parent folders are created first
    const sortedEntries = Object.entries(fileAssignments).sort(([, destA], [, destB]) => {
      const depthA = destA.split('/').length;
      const depthB = destB.split('/').length;
      return depthA - depthB;
    });

    sortedEntries.forEach(([source, dest]) => {
      // Remove Root/ prefix from destination path
      const cleanDest = removeRootPrefix(dest);
      const parts = cleanDest.split('/').filter(Boolean);
      let currentNode = root;
      let currentPath = '';

      // Create folder structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        let found = currentNode.children.find(child => child.name === part && child.type === 'folder');
        
        if (!found) {
          const newFolder: TreeNode = {
            id: `folder-${Math.random().toString(36).substr(2, 9)}`,
            name: part,
            type: 'folder',
            children: [],
            path: currentPath,
            isExpanded: true
          };
          currentNode.children.push(newFolder);
          found = newFolder;
        }
        
        currentNode = found;
      }

      // Add file
      const sourceFileId = source.split('/').pop() || '';
      
      // Get the proper filename from searchableFiles
      let originalName = getFileNameById(sourceFileId);
      
      // If we couldn't find it in searchableFiles, try the getFileName function
      if (!originalName || originalName === sourceFileId) {
        const fallbackName = getFileName(sourceFileId);
        if (fallbackName) {
          originalName = fallbackName;
        }
      }

      // Determine the file name to show in the tree:
      // 1. Use the new name if available from the newNames object
      // 2. Otherwise use the filename from the destination path
      // 3. If destination filename is empty, use the original name
      const fileName = parts[parts.length - 1] || originalName;
      const newName = newNames[source] || fileName;
      
      currentNode.children.push({
        id: `file-${Math.random().toString(36).substr(2, 9)}`,
        name: newName,
        type: 'file',
        children: [],
        path: cleanDest,
        sourceFile: source,
        originalName: originalName,
        newName: newName
      });
    });

    return root;
  }, [fileAssignments, newNames, getFileName, getFileNameById]);

  // Initialize tree when file assignments change
  useEffect(() => {
    setTreeData(buildTreeStructure());
  }, [fileAssignments, buildTreeStructure]);

  // Toggle folder expansion
  const toggleExpand = (nodeId: string) => {
    setTreeData(prevTree => {
      const updateNode = (node: TreeNode): TreeNode => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        
        if (node.children.length > 0) {
          return {
            ...node,
            children: node.children.map(updateNode)
          };
        }
        
        return node;
      };
      
      return updateNode(prevTree);
    });
  };

  // Enable editing mode for a file name
  const startEditing = (nodeId: string) => {
    setTreeData(prevTree => {
      const updateNode = (node: TreeNode): TreeNode => {
        if (node.id === nodeId) {
          return { ...node, isEditing: true };
        }
        
        if (node.children.length > 0) {
          return {
            ...node,
            children: node.children.map(updateNode)
          };
        }
        
        return node;
      };
      
      return updateNode(prevTree);
    });
  };

  // Update file name and stop editing
  const updateFileName = (nodeId: string, newFileName: string) => {
    setTreeData(prevTree => {
      const updateNode = (node: TreeNode): TreeNode => {
        if (node.id === nodeId) {
          const updatedNode = { 
            ...node, 
            name: newFileName, 
            isEditing: false 
          };
          
          // Update file assignments and new names
          if (node.type === 'file' && node.sourceFile) {
            const parentPath = node.path.split('/').slice(0, -1).join('/');
            const newPath = parentPath ? `${parentPath}/${newFileName}` : newFileName;
            
            // Update assignments
            const updatedAssignments = { ...fileAssignments };
            updatedAssignments[node.sourceFile] = newPath;
            onUpdateAssignments(updatedAssignments);
            
            // Update new names
            const updatedNames = { ...newNames };
            updatedNames[node.sourceFile] = newFileName;
            onUpdateNames(updatedNames);
            
            // Update node path
            updatedNode.path = newPath;
            updatedNode.newName = newFileName;
          }
          
          return updatedNode;
        }
        
        if (node.children.length > 0) {
          return {
            ...node,
            children: node.children.map(updateNode)
          };
        }
        
        return node;
      };
      
      return updateNode(prevTree);
    });
  };

  // Cancel editing without saving changes
  const cancelEditing = (nodeId: string) => {
    setTreeData(prevTree => {
      const updateNode = (node: TreeNode): TreeNode => {
        if (node.id === nodeId) {
          return { ...node, isEditing: false };
        }
        
        if (node.children.length > 0) {
          return {
            ...node,
            children: node.children.map(updateNode)
          };
        }
        
        return node;
      };
      
      return updateNode(prevTree);
    });
  };

  // Move a file to a different folder
  const moveFile = (fileId: string, targetFolderId: string) => {
    let sourceFile: string | undefined;
    let fileName: string | undefined;
    
    // Find the file node
    const findFile = (node: TreeNode): TreeNode | null => {
      if (node.id === fileId) return node;
      
      for (const child of node.children) {
        const found = findFile(child);
        if (found) return found;
      }
      
      return null;
    };
    
    // Find the target folder node
    const findFolder = (node: TreeNode): TreeNode | null => {
      if (node.id === targetFolderId) return node;
      
      for (const child of node.children) {
        if (child.type === 'folder') {
          const found = findFolder(child);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    const fileNode = findFile(treeData);
    const targetFolder = findFolder(treeData);
    
    if (fileNode && targetFolder && fileNode.sourceFile) {
      // Update file assignments
      const updatedAssignments = { ...fileAssignments };
      const newPath = targetFolder.path 
        ? `${targetFolder.path}/${fileNode.name}` 
        : fileNode.name;
      
      updatedAssignments[fileNode.sourceFile] = newPath;
      onUpdateAssignments(updatedAssignments);
      
      // Rebuild tree with updated assignments
      setTreeData(buildTreeStructure());
    }
  };

  // Render a tree node recursively
  const renderTreeNode = (node: TreeNode) => {
    if (node.type === 'folder') {
      return (
        <div key={node.id} className="text-sm">
          {/* Don't render the Root folder UI, but render its children directly */}
          {node.id === 'root' ? (
            // Directly render children of root without showing "Root" folder
            <>
              {node.children.length === 0 ? (
                <div className="text-gray-500 text-xs py-1 italic">No files to organize</div>
              ) : (
                node.children
                  .sort((a, b) => {
                    // Folders first, then files
                    if (a.type !== b.type) {
                      return a.type === 'folder' ? -1 : 1;
                    }
                    // Alphabetical within the same type
                    return a.name.localeCompare(b.name);
                  })
                  .map(child => renderTreeNode(child))
              )}
            </>
          ) : (
            // Normal folder rendering for non-root folders
            <>
              <div 
                className="flex items-center gap-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 cursor-pointer group"
                onClick={() => toggleExpand(node.id)}
              >
                {node.isExpanded 
                  ? <ChevronDownIcon className="h-4 w-4 text-gray-500" /> 
                  : <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                }
                <FolderIcon className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{node.name}</span>
              </div>
              
              {node.isExpanded && (
                <div className="ml-6 border-l dark:border-gray-700 pl-2 mt-1">
                  {node.children.length === 0 ? (
                    <div className="text-gray-500 text-xs py-1 italic">Empty folder</div>
                  ) : (
                    node.children
                      .sort((a, b) => {
                        // Folders first, then files
                        if (a.type !== b.type) {
                          return a.type === 'folder' ? -1 : 1;
                        }
                        // Alphabetical within the same type
                        return a.name.localeCompare(b.name);
                      })
                      .map(child => renderTreeNode(child))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      );
    } else { // File node
      return (
        <div key={node.id} 
          className="flex items-center gap-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 group"
        >
          <div className="w-4"></div> {/* Spacing for alignment */}
          <FileIcon className="h-4 w-4 text-gray-500" />
          
          {node.isEditing ? (
            <div className="flex items-center gap-1 flex-grow">
              <Input 
                id={`${node.id}-input`}
                className="h-6 py-0 text-sm"
                defaultValue={node.name}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateFileName(node.id, e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    cancelEditing(node.id);
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0"
                onClick={() => updateFileName(node.id, document.querySelector<HTMLInputElement>(`[id="${node.id}-input"]`)?.value || node.name)}
              >
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0"
                onClick={() => cancelEditing(node.id)}
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col">
                <span>{node.name}</span>
                {node.originalName && node.originalName !== node.name && (
                  <span className="text-xs text-gray-500">
                    (was: {node.originalName})
                  </span>
                )}
              </div>
              
              <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2"
                  onClick={() => startEditing(node.id)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>
      );
    }
  };

  return (
    <div className="space-y-2 px-2">
      <div className="text-sm mb-2 text-gray-500 dark:text-gray-400">
        Click on folder icons to expand/collapse. Hover over a file to rename it.
      </div>
      {renderTreeNode(treeData)}
    </div>
  );
};

export const FileOrganizerDialog: React.FC<FileOrganizerDialogProps> = ({ bucketId, onOrganize, open, onClose }) => {
  const [schema, setSchema] = useState<string>('');
  const shouldRename = true;
  const shouldReorder = true;
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus>('NO_SCHEMA');
  const [schemaError, setSchemaError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [schemaId, setSchemaId] = useState<string>();
  const [isPolling, setIsPolling] = useState(false);
  const [organizationResults, setOrganizationResults] = useState<OrganizationResults | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoSchemaId, setUndoSchemaId] = useState<string>();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [fileAssignments, setFileAssignments] = useState<Record<string, string>>({});
  const [fileNewNames, setFileNewNames] = useState<Record<string, string>>({});

  // Function to check schema status
  const checkSchemaStatus = async () => {
    try {
      const response = await get({
        apiName: 'S3_API',
        path: `/s3/${bucketId}/schema-status`,
      }).response;

      const data = (await response.body.json() as unknown) as SchemaResponse;

      console.log('data', data);
      
      // Find the active schema (one with IN_PROGRESS, COMPLETED, or FAILED status)
      const activeSchema = data.schemas.find(schema => 
        ['IN_PROGRESS', 'COMPLETED', 'FAILED'].includes(schema.status)
      );

      if (activeSchema) {
        setSchemaStatus(activeSchema.status);
        console.log("activeSchema", activeSchema.status);

        if (activeSchema.status === 'FAILED') {
          setSchemaError(activeSchema.error);
          toast({
            title: "Organization Failed",
            description: activeSchema.error || "Please try again",
            variant: "destructive",
          });
          setIsPolling(false);
        } else if (activeSchema.status === 'COMPLETED') {
          setIsPolling(false);
        }

        return activeSchema;
      } else {
        setSchemaStatus('NO_SCHEMA');
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Error checking schema status:', error);
      setIsPolling(false);
    }
  };

  // Start polling when needed
  // useEffect(() => {
  //   let pollInterval: NodeJS.Timeout;

  //   if (isPolling && schemaStatus === 'IN_PROGRESS') {
  //     pollInterval = setInterval(checkSchemaStatus, 5000);
  //   }

  //   return () => {
  //     if (pollInterval) {
  //       clearInterval(pollInterval);
  //     }
  //   };
  // }, [isPolling, schemaStatus]);

  // Initial schema check
  useEffect(() => {
    const fetchCurrentSchema = async () => {
      try {
        setIsInitialLoading(true);
        const response = await get({
          apiName: 'S3_API',
          path: `/s3/${bucketId}/get-schema`,
        }).response;

        const data = (await response.body.json() as unknown) as SchemaResponse;
        console.log('Current schemas:', data);
        
        // Find the completed schema and undo backup schema
        const completedSchema = data.schemas.find(schema => schema.status === 'COMPLETED');
        const activeSchema = data.schemas.find(schema => 
          ['IN_PROGRESS', 'COMPLETED', 'FAILED'].includes(schema.status)
        );
        const undoBackupSchema = data.schemas.find(schema => schema.status === 'UNDO_BACKUP');

        // console.log('completedSchema', completedSchema);
        // console.log('activeSchema', activeSchema);
        if (activeSchema) {
          setSchemaStatus(activeSchema.status);
          console.log("activeSchema", activeSchema.status);
        }
        
        if (completedSchema?.schemaId) {
          setSchema(completedSchema.schema || '');
          setSchemaId(completedSchema.schemaId);
          setSchemaStatus('COMPLETED');
          // Also set organization results if they exist
          if (completedSchema.results) {
            setOrganizationResults(completedSchema.results);
          }
        }

        // Set undo schema ID if available
        if (undoBackupSchema?.schemaId) {
          setUndoSchemaId(undoBackupSchema.schemaId);
        }
      } catch (error) {
        console.error('Error fetching current schema:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    if (bucketId) {
      fetchCurrentSchema();
    }
  }, [bucketId]);

  const handlePreview = async () => {
    setIsLoading(true);
   
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketId}/organize-dataroom-preview`,
        options: {
          body: {
            schema,
            should_rename: true,
            should_reorder: true,
          }
        }
      }).response;

      setSchemaStatus('IN_PROGRESS');

      const data = (await response.body.json() as unknown) as SchemaResponse;

      if (!data || !data.schemas[0].schemaId) {
        throw new Error('Failed to start organization preview');
      }

      console.log('Preview data:', data);
      if (data && data.schemas[0].schemaId) {
        setSchemaId(data.schemas[0].schemaId);
        setIsPolling(true);
        setIsPreviewOpen(true);
      }
    } catch (error) {
      console.error('Error previewing changes:', error);
      toast({
        title: "Error",
        description: "Failed to start organization preview",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAssignments = (updatedAssignments: Record<string, string>) => {
    setFileAssignments(updatedAssignments);
    // Update organization results
    if (organizationResults) {
      setOrganizationResults({
        ...organizationResults,
        file_assignments: updatedAssignments
      });
    }
  };

  const handleUpdateNames = (updatedNames: Record<string, string>) => {
    setFileNewNames(updatedNames);
    // Update organization results
    if (organizationResults) {
      setOrganizationResults({
        ...organizationResults,
        new_names: updatedNames
      });
    }
  };

  // When organization results are loaded, update the file assignments and names states
  useEffect(() => {
    if (organizationResults) {
      setFileAssignments(organizationResults.file_assignments || {});
      setFileNewNames(organizationResults.new_names || {});
    }
  }, [organizationResults]);

  const handleApplyChanges = async () => {
    setIsApplying(true);
    try {
      if (!schemaId || !organizationResults) {
        throw new Error('Missing schema ID or organization results');
      }

      // Helper function to remove 'Root/' from the beginning of paths
      const removeRootPrefix = (path: string): string => {
        if (path.startsWith('Root/')) {
          return path.substring(5); // Remove 'Root/'
        }
        return path;
      };

      // Helper function to add 'Root/' prefix if it doesn't exist
      const ensureRootPrefix = (path: string): string => {
        // Don't add Root/ to empty paths
        if (!path) return path;
        
        // If path doesn't start with Root/, add it
        if (!path.startsWith('Root/')) {
          return `Root/${path}`;
        }
        return path;
      };

      // Create file assignments with new names
      const file_assignments: Record<string, string> = {};
      Object.entries(fileAssignments).forEach(([sourceKey, destPath]) => {
        const sourceFileName = sourceKey.split('/').pop() || '';
        const newFileName = fileNewNames[sourceKey] || sourceFileName;
        
        // For UI display, we've removed Root/ prefix from paths
        // When preparing for API call, we keep the original logic for getting the destination folder
        const cleanDestPath = removeRootPrefix(destPath);
        const destFolder = cleanDestPath.split('/').slice(0, -1).join('/');

        // Ensure destFolder ends with '/' if it's not empty
        const formattedDestFolder = destFolder ? destFolder + '/' : '';

        // Combine destination path with new filename
        const newPath = formattedDestFolder + newFileName;
        
        // Add Root/ prefix back to paths for the API call
        file_assignments[sourceKey] = ensureRootPrefix(newPath);
      });

      console.log("Applying changes with:", file_assignments);

      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketId}/apply-organization`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            schemaId,
            changes: {
              file_assignments,
              new_names: fileNewNames,
              reasoning: organizationResults.reasoning
            }
          }
        }
      });

      const apiResponse = await response.response;
      const data = await apiResponse.body.json() as { results: { successful: boolean } };

      if (data.results?.successful) {
        toast({
          title: "Organization Applied",
          description: "Files have been reorganized successfully",
        });

        onOrganize(Object.entries(file_assignments)
          .map(([originalPath, newPath]) => ({
            originalPath,
            newPath
          }))
        );
        
        onClose();
      }
    } catch (error) {
      console.error('Error applying organization:', error);
      toast({
        title: "Error",
        description: "Failed to apply organization changes",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      console.log('trying to cancel organization');
      if (!schemaId) {
        console.log('no schema id');
        setSchemaStatus('NO_SCHEMA');
        setOrganizationResults(null);
        return;
      }

      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketId}/cancel-organization`,
        options: {
          body: {
            schemaId: schemaId
          }
        }
      }).response;

      const data = (await response.body.json() as unknown) as CancelOrganizationResponse;
      // Wait for the response and check if it was successful
      if (data && data.message === 'Organization cancelled successfully') {
        // Only update states after successful cancellation
        setSchemaStatus('NO_SCHEMA');
        setOrganizationResults(null);
        setSchemaId(undefined);

        toast({
          title: "Organization Cancelled",
          description: "The organization process has been cancelled",
        });
      } else {
        throw new Error('Failed to cancel organization');
      }
    } catch (error) {
      console.error('Error cancelling organization:', error);
      toast({
        title: "Error",
        description: "Failed to cancel organization",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUndo = async () => {
    if (!undoSchemaId) {
      toast({
        title: "Error",
        description: "No undo backup available",
        variant: "destructive",
      });
      return;
    }

    setIsUndoing(true);
    try {
      const response = await post({
        apiName: 'S3_API',
        path: `/s3/${bucketId}/undo-organization`,
        options: {
          body: {
            schemaId: undoSchemaId
          }
        }
      }).response;

      const data = (await response.body.json() as unknown) as UndoOrganizationResponse;
      
      if (data.message === 'Organization successfully undone') {
        toast({
          title: "Success",
          description: "Organization has been undone successfully",
        });
        // Reset states
        setSchemaStatus('NO_SCHEMA');
        setOrganizationResults(null);
        setSchemaId(undefined);
        setUndoSchemaId(undefined);
      } else {
        throw new Error('Failed to undo organization');
      }
    } catch (error) {
      console.error('Error undoing organization:', error);
      toast({
        title: "Error",
        description: "Failed to undo organization",
        variant: "destructive",
      });
    } finally {
      setIsUndoing(false);
    }
  };

  const renderContent = () => {
    if (isInitialLoading) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8 dark:bg-darkbg">
          <Loader2 className="h-8 w-8 animate-spin dark:text-gray-200" />
          <h3 className="text-lg font-semibold dark:text-gray-200">Loading</h3>
          <p className="text-sm text-gray-500 text-center">
            Please wait while we load...
          </p>
        </div>
      );
    }

    if (schemaStatus === 'IN_PROGRESS') {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8 dark:bg-darkbg">
          <Loader2 className="h-8 w-8 animate-spin dark:text-gray-200" />
          <h3 className="text-lg font-semibold dark:text-gray-200">Organizing Files</h3>
          <p className="text-sm text-gray-500 text-center">
            This could take up to a few minutes. Come back later.
          </p>
        </div>
      );
    }

    if (schemaStatus === 'FAILED') {
      return (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Organization Failed</AlertTitle>
            <AlertDescription>{schemaError}</AlertDescription>
          </Alert>
          <div className="flex-1 min-h-[400px] overflow-auto border rounded-md p-4">
            <DndProvider backend={HTML5Backend}>
              <FolderTreeEditor onSchemaChange={setSchema} />
            </DndProvider>
          </div>
          <Button onClick={handlePreview}>Try Again</Button>
        </div>
      );
    }

    if (schemaStatus === 'COMPLETED') {
      return (
        <div className="relative flex flex-col h-full">
          {/* Main content area with fixed height */}
          <div className="absolute inset-0 bottom-[64px]">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                <Accordion type="single" collapsible className="w-full dark:text-gray-200" defaultValue="fileTree">
                  <AccordionItem value="reasoning">
                    <AccordionTrigger>Organization Reasoning</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {organizationResults?.reasoning || 'No reasoning provided'}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
  
                  <AccordionItem value="fileTree">
                    <AccordionTrigger>Files Organization</AccordionTrigger>
                    <AccordionContent>
                      <InteractiveFileTree
                        fileAssignments={fileAssignments}
                        newNames={fileNewNames}
                        onUpdateAssignments={handleUpdateAssignments}
                        onUpdateNames={handleUpdateNames}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>
          </div>
    
          {/* Fixed button area at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-[64px] bg-white dark:bg-darkbg flex justify-between items-center gap-2 px-4">
            <div>
              {undoSchemaId && (
                <Button
                  variant="outline"
                  onClick={handleUndo}
                  disabled={isUndoing || isApplying || isCancelling}
                >
                  {isUndoing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Undoing...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Undo Last Organization
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isCancelling || isApplying || isUndoing}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel'
                )}
              </Button>
              <Button
                onClick={handleApplyChanges}
                disabled={!organizationResults || isApplying || isCancelling || isUndoing}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying Changes...
                  </>
                ) : (
                  'Apply Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // NO_SCHEMA or default case
    return (
      <div className="flex flex-col gap-4 h-full dark:bg-darkbg ">
        <div className="flex-1 h-full overflow-auto rounded-md p-4">
          <DndProvider backend={HTML5Backend}>
            <FolderTreeEditor onSchemaChange={setSchema} />
          </DndProvider>
        </div>
        <div className="flex items-center justify-between space-x-4 px-4">
          <div>
            {undoSchemaId && (
              <Button
                variant="outline"
                onClick={handleUndo}
                disabled={isUndoing || isApplying || isCancelling}
              >
                {isUndoing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Undoing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Undo Last Organization
                  </>
                )}
              </Button>
            )}
          </div>
          
          <Button onClick={handlePreview} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Preview
              </>
            ) : (
              'Preview Changes'
            )}
          </Button>
        </div>

      </div>
    );
  };

  return (

    <Dialog open={open} onOpenChange={onClose}>
      <div className="flex flex-col h-full">
        <DialogContent className="max-w-4xl h-[80vh] dark:bg-darkbg border-none select-none outline-none flex flex-col">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-200">Organize Files</DialogTitle>
          </DialogHeader>
          <div className="flex-1 grid gap-4">
            {renderContent()}
          </div>
        </DialogContent>
      </div>
    </Dialog>

  );
};
