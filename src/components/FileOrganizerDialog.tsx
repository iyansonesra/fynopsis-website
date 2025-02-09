import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { post, get } from 'aws-amplify/api';
import { Loader2 } from 'lucide-react';
import { FolderTreeEditor } from './FolderTreeEditor';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { toast } from './ui/use-toast';

// Add new imports
import { ScrollArea } from "./ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { FolderIcon, ChevronRightIcon, FileIcon, ArrowRight } from 'lucide-react';

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

type SchemaStatus = 'NO_SCHEMA' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

interface OrganizationResults {
  file_assignments: Record<string, string>;
  new_names: Record<string, string>;
  reasoning: string;
}

interface SchemaResponse {
  status: SchemaStatus;
  error?: string;
  results?: OrganizationResults;
  schemaId?: string;
  schema?: string;
}

interface TreeViewProps {
  schema: string;
  fileAssignments: Record<string, string>;
  newNames: Record<string, string>;
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
    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
      <div className="space-y-2">
        {renderTree(parseSchema(schema))}
      </div>
    </ScrollArea>
  );
};

interface FileMovementTreeProps {
  fileAssignments: Record<string, string>;
  newNames: Record<string, string>;

}

const FileMovementTree: React.FC<FileMovementTreeProps> = ({ fileAssignments, newNames }) => {
  const buildTreeStructure = () => {
    const tree: Record<string, any> = {
      id: 'root',
      name: 'Root',
      type: 'folder',
      children: {}
    };

    // Build tree from destination paths
    Object.entries(fileAssignments).forEach(([source, dest]) => {
      const parts = dest.split('/').filter(Boolean);
      let currentNode = tree;

      // Build folder structure
      parts.forEach((part, index) => {
        if (index === parts.length - 1) return; // Skip the last part (file name)

        if (!currentNode.children[part]) {
          currentNode.children[part] = {
            id: Math.random().toString(36).substr(2, 9),
            name: part,
            type: 'folder',
            children: {}
          };
        }
        currentNode = currentNode.children[part];
      });

      // Add file with its source info
      const fileName = source.split('/').pop() || '';
      const newName = newNames[source];

      currentNode.children[fileName] = {
        id: Math.random().toString(36).substr(2, 9),
        name: fileName,
        type: 'file',
        newName: newName,
        sourceFile: source
      };
    });

    return tree;
  };

  const renderTreeNode = (node: any, level = 0) => {
    const style = {
      marginLeft: `${level * 20}px`,
    };

    return (
      <div key={node.id}>
        <div className="flex items-center gap-2 py-1" style={style}>
          {node.type === 'folder' ? (
            <>
              <FolderIcon className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{node.name}</span>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <FileIcon className="h-4 w-4 text-gray-500" />
              <span>{node.name}</span>
              {node.newName && (
                <>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="text-blue-500">{node.newName}</span>
                </>
              )}
            </div>
          )}
        </div>
        {node.children && Object.values(node.children).map((child: any) =>
          renderTreeNode(child, level + 1)
        )}
      </div>
    );
  };

  const tree = buildTreeStructure();

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
      <div className="space-y-2">
        {renderTreeNode(tree)}
      </div>
    </ScrollArea>
  );
};

export const FileOrganizerDialog: React.FC<FileOrganizerDialogProps> = ({ bucketId, onOrganize, open, onClose }) => {
  const [schema, setSchema] = useState<string>('');
  const [shouldRename, setShouldRename] = useState(true);
  const [shouldReorder, setShouldReorder] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus>('NO_SCHEMA');
  const [schemaError, setSchemaError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [schemaId, setSchemaId] = useState<string>();
  const [isPolling, setIsPolling] = useState(false);
  const [organizationResults, setOrganizationResults] = useState<OrganizationResults | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApplying, setIsApplying] = useState(false);


  // Function to check schema status
  const checkSchemaStatus = async () => {
    try {
      const response = await get({
        apiName: 'S3_API',
        path: `/s3/${bucketId}/schema-status`,
      }).response;

      const data = (await response.body.json() as unknown) as SchemaResponse;
      setSchemaStatus(data.status);

      if (data.status === 'FAILED') {
        setSchemaError(data.error);
        toast({
          title: "Organization Failed",
          description: data.error || "Please try again",
          variant: "destructive",
        });
        setIsPolling(false);
      } else if (data.status === 'COMPLETED') {
        // console.log('Organization results:', data.results);
        // setOrganizationResults(data.results || null);
        setIsPolling(false);
      }

      return data;
    } catch (error) {
      console.error('Error checking schema status:', error);
      setIsPolling(false);
    }
  };

  // Start polling when needed
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isPolling && schemaStatus === 'IN_PROGRESS') {
      pollInterval = setInterval(checkSchemaStatus, 5000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isPolling, schemaStatus]);

  // Initial schema check
  useEffect(() => {
    const fetchCurrentSchema = async () => {
      try {
        const response = await get({
          apiName: 'S3_API',
          path: `/s3/${bucketId}/get-schema`,
        }).response;

        const data = (await response.body.json() as unknown) as SchemaResponse;
        console.log('Current schema:', data);
        if (data.schema) {
          setSchema(data.schema);
          setSchemaId(data.schemaId);
          setSchemaStatus('COMPLETED');
          // Also set organization results if they exist
          if (data.results) {
            setOrganizationResults(data.results);
          }
        }
      } catch (error) {
        console.error('Error fetching current schema:', error);
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

      const data = (await response.body.json() as unknown) as SchemaResponse;

      if (!data || !data.schemaId) {
        throw new Error('Failed to start organization preview');
      }

      console.log('Preview data:', data);
      if (data && data.schemaId) {
        setSchemaId(data.schemaId);
        setSchemaStatus('IN_PROGRESS');
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

  const handleApplyChanges = async () => {
    setIsApplying(true);
    try {
        if (!schemaId || !organizationResults) {
            throw new Error('Missing schema ID or organization results');
        }

        // Create file assignments with new names
        const file_assignments: Record<string, string> = {};
        Object.entries(organizationResults.file_assignments).forEach(([sourceKey, destPath]) => {
            const sourceFileName = sourceKey.split('/').pop() || '';
            const newFileName = organizationResults.new_names[sourceKey] || sourceFileName;
            const destFolder = destPath as string;
            
            // Ensure destFolder ends with '/' if it's not empty
            const formattedDestFolder = destFolder && !destFolder.endsWith('/') ? destFolder + '/' : destFolder;
            
            // Combine destination path with new filename
            file_assignments[sourceKey] = formattedDestFolder + newFileName;
        });

        console.log(file_assignments);

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
                        new_names: organizationResults.new_names,
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

        onOrganize(Object.entries(organizationResults.file_assignments || {})
          .map(([originalPath, newPath]) => ({
            originalPath,
            newPath: newPath as string
          }))
        );
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

  const renderContent = () => {
    if (schemaStatus === 'IN_PROGRESS') {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <h3 className="text-lg font-semibold">Organizing Files</h3>
          <p className="text-sm text-gray-500 text-center">
            This could take up to a few minutes. We&apos;ll notify you when it&apos;s ready.
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
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rename"
                checked={shouldRename}
                onCheckedChange={(checked: boolean | 'indeterminate') => setShouldRename(checked as boolean)}
              />
              <Label htmlFor="rename">Rename Files</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reorder"
                checked={shouldReorder}
                onCheckedChange={(checked) => setShouldReorder(checked as boolean)}
              />
              <Label htmlFor="reorder">Reorder Files</Label>
            </div>
          </div>
          <Button onClick={handlePreview}>Try Again</Button>
        </div>
      );
    }

    if (schemaStatus === 'COMPLETED') {
      return (
        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="schema">
              <AccordionTrigger>Folder Structure</AccordionTrigger>
              <AccordionContent>
                <TreeView
                  schema={schema}
                  fileAssignments={organizationResults?.file_assignments || {}}
                  newNames={organizationResults?.new_names || {}}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="moves">
              <AccordionTrigger>File Movements</AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original Location</TableHead>
                      <TableHead>New Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(organizationResults?.file_assignments || {}).map(([from, to]) => (
                      <TableRow key={from}>
                        <TableCell className="text-xs">{from}</TableCell>
                        <TableCell className="text-xs">{to as string}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="renames">
              <AccordionTrigger>File Renames</AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original Name</TableHead>
                      <TableHead>New Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(organizationResults?.new_names || {}).map(([path, newName]) => (
                      <TableRow key={path}>
                        <TableCell className="text-xs">{path.split('/').pop()}</TableCell>
                        <TableCell className="text-xs">{newName as string}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reasoning">
              <AccordionTrigger>Organization Reasoning</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {organizationResults?.reasoning || 'No reasoning provided'}
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fileTree">
              <AccordionTrigger>File Movement Tree</AccordionTrigger>
              <AccordionContent>
                <FileMovementTree
                  fileAssignments={organizationResults?.file_assignments || {}}
                  newNames={organizationResults?.new_names || {}}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling || isApplying}
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
              disabled={!organizationResults || isApplying || isCancelling}
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
      );
    }

    // NO_SCHEMA or default case
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="flex-1 min-h-[400px] overflow-auto border rounded-md p-4">
          <DndProvider backend={HTML5Backend}>
            <FolderTreeEditor onSchemaChange={setSchema} />
          </DndProvider>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rename"
              checked={shouldRename}
              onCheckedChange={(checked: boolean | 'indeterminate') => setShouldRename(checked as boolean)}
            />
            <Label htmlFor="rename">Rename Files</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="reorder"
              checked={shouldReorder}
              onCheckedChange={(checked) => setShouldReorder(checked as boolean)}
            />
            <Label htmlFor="reorder">Reorder Files</Label>
          </div>
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
    );
  };

  return (

    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Organize Files</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 h-full">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>

  );
};
