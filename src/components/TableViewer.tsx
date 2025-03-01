import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  FileText, 
  Plus, 
  Search,
  Trash2, 
  X,
  Info,
  Copy,
  Download,
  Loader2
} from 'lucide-react';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Checkbox 
} from '@/components/ui/checkbox';
import { 
  Textarea 
} from '@/components/ui/textarea';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFileStore } from './HotkeyService';
import { useToast } from '@/components/ui/use-toast';

// Add interfaces from HotkeyService.tsx that we need
interface FileNode {
  parentId: string;
  name: string;
  uploadedBy: string;
  type: string;
  size: string;
  id: string;
  isFolder: boolean;
  createByEmail: string;
  createByName: string;
  lastModified: string;
  tags: DocumentTags | null;
  summary: string;
  status: string;
  s3Url?: string;
}

interface DateInfo {
  date: string;
  type: string;
  description: string;
}

interface DocumentTags {
  document_type: string;
  relevant_project: string;
  involved_parties: string[];
  key_topics: string[];
  dates: DateInfo[];
  deal_phase: string;
  confidentiality: string;
}

interface Files {
  fileId: string;
  fileName: string;
  fullPath: string;
  parentFolderId: string;
  parentFolderName: string;
  size: string;
}

interface FileInfo {
  id: string;
  name: string;
  type?: string;
  selected: boolean;
}

interface ColumnDefinition {
  id: string;
  title: string;
}

interface CellData {
  content: string;
  sourceFileId?: string;
  sourcePageNumber?: number;
  status?: 'loading' | 'complete' | 'empty';
}

interface TableData {
  [fileId: string]: {
    [columnId: string]: CellData;
  };
}

export const TableViewer: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [tableData, setTableData] = useState<TableData>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isFileSelectOpen, setIsFileSelectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [fileFilter, setFileFilter] = useState('');
  const [editingCell, setEditingCell] = useState<{fileId: string, columnId: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get all files from the fileStore - using the correct properties
  const { searchableFiles, getFile, setSelectedFile } = useFileStore();

  // Initialize columns
  useEffect(() => {
    setColumns([
      { id: 'col1', title: 'Entity Name' },
      { id: 'col2', title: 'Role' },
      { id: 'col3', title: 'Contact Info' }
    ]);
  }, []);

  // Load files from storage
  useEffect(() => {
    // Convert searchableFiles to our internal format
    const fileInfos = searchableFiles
      .map((file) => ({
        id: file.fileId,
        name: file.fileName,
        type: file.fileName.split('.').pop() || '',
        selected: false
      }));
    
    setFiles(fileInfos);
  }, [searchableFiles]);

  const handleAddColumn = () => {
    const newColumnId = `col${columns.length + 1}`;
    setColumns([...columns, { id: newColumnId, title: `Column ${columns.length + 1}` }]);
  };

  const handleRemoveColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId));
    
    // Update table data to remove this column from all rows
    const updatedTableData = { ...tableData };
    Object.keys(updatedTableData).forEach(fileId => {
      const { [columnId]: removed, ...rest } = updatedTableData[fileId];
      updatedTableData[fileId] = rest;
    });
    
    setTableData(updatedTableData);
  };

  const handleUpdateColumnTitle = (columnId: string, newTitle: string) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, title: newTitle } : col
    ));
  };

  const handleToggleFileSelect = (fileId: string) => {
    const updatedFiles = files.map(file => 
      file.id === fileId ? { ...file, selected: !file.selected } : file
    );
    
    setFiles(updatedFiles);
    
    // Update selectAll checkbox state based on selection
    const allSelected = updatedFiles.every(file => file.selected);
    const someSelected = updatedFiles.some(file => file.selected);
    setSelectAllChecked(allSelected ? true : someSelected ? false : false);
  };

  const handleSelectAll = () => {
    const newSelectAllState = !selectAllChecked;
    
    // Either select all filtered files or deselect all files
    const updatedFiles = files.map(file => {
      // Only apply to files matching the filter
      if (fileFilter && !file.name.toLowerCase().includes(fileFilter.toLowerCase())) {
        return file;
      }
      return { ...file, selected: newSelectAllState };
    });
    
    setFiles(updatedFiles);
    setSelectAllChecked(newSelectAllState);
  };

  const handleFileSelectionConfirm = () => {
    setIsFileSelectOpen(false);
  };

  const handleSendQuery = async () => {
    setIsLoading(true);
    
    // Get selected files
    const selectedFileIds = files
      .filter(file => file.selected)
      .map(file => file.id);
      
    if (selectedFileIds.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to analyze.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    // First, update all selected files with loading state cells
    const initialTableData = { ...tableData };
    
    selectedFileIds.forEach(fileId => {
      initialTableData[fileId] = {};
      columns.forEach(col => {
        initialTableData[fileId][col.id] = { 
          content: '', 
          status: 'loading'
        };
      });
    });
    
    setTableData(initialTableData);
    
    try {
      // Mock async process - in real implementation, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update with result data
      const mockResponse: TableData = {};
      selectedFileIds.forEach(fileId => {
        mockResponse[fileId] = {};
        columns.forEach(col => {
          mockResponse[fileId][col.id] = { 
            content: `Result for ${col.title} from file ${files.find(f => f.id === fileId)?.name}`,
            sourceFileId: fileId,
            sourcePageNumber: Math.floor(Math.random() * 10) + 1,
            status: 'complete'
          };
        });
      });
      
      setTableData(mockResponse);
      
      toast({
        title: "Analysis complete",
        description: "The table has been populated with extracted information.",
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error analyzing documents",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive"
      });
      
      // Reset loading states on error
      const resetTableData = { ...tableData };
      selectedFileIds.forEach(fileId => {
        if (resetTableData[fileId]) {
          columns.forEach(col => {
            if (resetTableData[fileId][col.id]) {
              resetTableData[fileId][col.id].status = 'empty';
            }
          });
        }
      });
      
      setTableData(resetTableData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellClick = (fileId: string, columnId: string) => {
    const cellData = tableData[fileId]?.[columnId];
    if (cellData?.status === 'complete') {
      // Start editing this cell
      setEditingCell({ fileId, columnId });
      setEditValue(cellData.content);
      
      // Focus the input when it renders
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  };

  const handleViewSource = (fileId: string, columnId: string) => {
    const cellData = tableData[fileId]?.[columnId];
    if (cellData?.sourceFileId && cellData.status === 'complete') {
      const file = getFile(cellData.sourceFileId);
      if (file) {
        // Create a FileNode from Files for setSelectedFile
        const fileNode: FileNode = {
          id: file.fileId,
          name: file.fileName,
          parentId: file.parentFolderId,
          uploadedBy: '',
          type: '',
          size: file.size,
          isFolder: false,
          createByEmail: '',
          createByName: '',
          lastModified: '',
          tags: null,
          summary: '',
          status: '',
          s3Url: ''
        };
        
        setSelectedFile(fileNode);
      }
    }
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    
    const { fileId, columnId } = editingCell;
    
    // Update the table data with the edited value
    setTableData(prev => {
      const newData = { ...prev };
      if (newData[fileId] && newData[fileId][columnId]) {
        newData[fileId] = {
          ...newData[fileId],
          [columnId]: {
            ...newData[fileId][columnId],
            content: editValue
          }
        };
      }
      return newData;
    });
    
    // Exit edit mode
    setEditingCell(null);
    
    toast({
      title: "Cell updated",
      description: "The cell content has been updated.",
      duration: 2000
    });
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };
  
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const exportTableToCSV = () => {
    const selectedRows = files.filter(file => file.selected);
    if (selectedRows.length === 0) {
      toast({
        title: "No data to export",
        description: "Please select files and run analysis first.",
        variant: "destructive"
      });
      return;
    }

    // Create CSV content
    const headers = ['Document', ...columns.map(col => col.title)];
    const rows = selectedRows.map(file => {
      const rowData = [file.name];
      columns.forEach(col => {
        const cellContent = tableData[file.id]?.[col.id]?.content || '';
        rowData.push(cellContent);
      });
      return rowData;
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create a Blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'table_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export complete",
      description: "Table data has been exported to CSV.",
    });
  };

  // Filter files based on search input
  const filteredFiles = fileFilter 
    ? files.filter(file => file.name.toLowerCase().includes(fileFilter.toLowerCase()))
    : files;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold">Information Extraction</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsFileSelectOpen(true)}
            className="whitespace-nowrap"
          >
            <FileText className="h-4 w-4 mr-2" />
            Select Files
          </Button>
          <Button 
            variant="default" 
            onClick={handleSendQuery}
            disabled={isLoading}
            className="whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Processing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Analyze Documents
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={exportTableToCSV}
            className="whitespace-nowrap"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="p-4">
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Textarea 
                placeholder="Describe what information you're looking for from these documents..." 
                className="flex-1 min-h-[80px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Analysis Query</h4>
                    <p className="text-sm text-muted-foreground">
                      Describe what information you&apos;re looking for in these documents. 
                      For example: &quot;Extract all parties mentioned in these agreements and 
                      their respective roles and contact information.&quot;
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="min-w-full relative">
            <Table className="w-full border-collapse">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="border-b border-border">
                  <TableHead className="w-[200px] min-w-[200px] border-r border-border bg-background sticky left-0 z-20">Document</TableHead>
                  {columns.map((column) => (
                    <TableHead key={column.id} className="w-[180px] min-w-[180px] border-r border-border bg-background">
                      <div className="flex items-center gap-1">
                        <Input
                          value={column.title}
                          onChange={(e) => handleUpdateColumnTitle(column.id, e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Column name"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveColumn(column.id)}
                          className="h-7 w-7 flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[50px] min-w-[50px] sticky right-0 z-20">
                    <div className="relative flex justify-center">
                      <div className="absolute inset-0 backdrop-blur-sm bg-background/80 z-0"></div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddColumn}
                        className="h-8 w-8 rounded-full p-0 shadow-sm z-10 relative"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.filter(file => file.selected).map((file, index, array) => {
                  const isLastRow = index === array.length - 1;
                  return (
                    <TableRow 
                      key={file.id} 
                      className={`border-b border-border hover:bg-transparent`}
                    >
                      <TableCell className="font-medium truncate border-r border-border bg-background sticky left-0 z-10 hover:bg-transparent">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {file.name}
                          </span>
                        </div>
                      </TableCell>
                      {columns.map((column) => (
                        <TableCell 
                          key={column.id}
                          className={`truncate border-r border-border relative overflow-visible hover:bg-transparent ${tableData[file.id]?.[column.id]?.status === 'complete' ? 'cursor-pointer' : ''}`}
                          onClick={() => handleCellClick(file.id, column.id)}
                        >
                          {tableData[file.id]?.[column.id]?.status === 'loading' ? (
                            <div className="flex justify-center items-center h-6">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : tableData[file.id]?.[column.id]?.status === 'complete' ? (
                            editingCell?.fileId === file.id && editingCell?.columnId === column.id ? (
                              <div className="relative flex w-full items-center pr-6">
                                <Input
                                  ref={inputRef}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleEditKeyDown}
                                  onBlur={handleSaveEdit}
                                  className="h-7 text-sm w-full"
                                  autoFocus
                                />
                                <div className="absolute right-0 flex gap-1 h-full">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-5 w-5 rounded-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveEdit();
                                    }}
                                  >
                                    <span className="sr-only">Save</span>
                                    ✓
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-5 w-5 rounded-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }}
                                  >
                                    <span className="sr-only">Cancel</span>
                                    ✕
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="relative group">
                                <div className="pr-8 text-sm truncate hover:bg-muted/30 rounded p-1 transition-colors">
                                  {tableData[file.id][column.id].content}
                                </div>
                                <div className="absolute top-0 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 bg-background shadow-sm rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(tableData[file.id][column.id].content);
                                        toast({
                                          title: "Copied to clipboard",
                                          description: "Cell content has been copied.",
                                          duration: 2000
                                        });
                                      }}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 bg-background shadow-sm rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewSource(file.id, column.id);
                                      }}
                                    >
                                      <FileText className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="h-6"></div> // Empty cell
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="sticky right-0 z-10 bg-background hover:bg-transparent" />
                    </TableRow>
                  );
                })}
                {files.filter(file => file.selected).length === 0 && (
                  <TableRow className="border-b border-border">
                    <TableCell colSpan={columns.length + 2} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2" />
                        <p>No documents selected</p>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            variant="link" 
                            onClick={() => setIsFileSelectOpen(true)}
                          >
                            Select documents
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsFileSelectOpen(true)}
                            className="rounded-full h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Add documents button below table but not part of it */}
            {files.filter(file => file.selected).length > 0 && (
              <div className="py-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFileSelectOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add More Documents
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* File Selection Dialog */}
      <Dialog open={isFileSelectOpen} onOpenChange={setIsFileSelectOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Select Documents</DialogTitle>
            <DialogDescription>
              Choose the documents you want to include in your analysis.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2 px-1 flex-shrink-0">
            <Input
              placeholder="Filter files..."
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              className="mb-2"
            />
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox
                id="select-all"
                checked={selectAllChecked}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm cursor-pointer">
                Select {fileFilter ? "filtered" : "all"} documents
              </label>
            </div>
          </div>
          
          <ScrollArea className="flex-grow overflow-y-auto pr-4 mb-4">
            <div className="space-y-1">
              {filteredFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center space-x-2 rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <Checkbox 
                    checked={file.selected} 
                    onCheckedChange={() => handleToggleFileSelect(file.id)}
                    id={`file-${file.id}`}
                  />
                  <label 
                    htmlFor={`file-${file.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {file.name}
                      </span>
                    </div>
                  </label>
                </div>
              ))}
              {filteredFiles.length === 0 && (
                <div className="py-2 text-center text-muted-foreground">
                  No files match your filter.
                </div>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex-shrink-0 border-t pt-2">
            <Button variant="outline" onClick={() => setIsFileSelectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFileSelectionConfirm}>
              Confirm Selection ({files.filter(file => file.selected).length} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableViewer; 