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

// Import AWS Amplify for auth tokens
import { fetchAuthSession } from 'aws-amplify/auth';

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
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
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

  // Cleanup WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [wsConnection]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Received WebSocket message:', message);
      
      if (message.type === 'cell_update') {
        // Get the file ID and content from the message
        const { file_key, content } = message;
        
        // Update table data for this file
        setTableData(prevData => {
          const newData = { ...prevData };
          
          // If this file doesn't have an entry yet, initialize it
          if (!newData[file_key]) {
            newData[file_key] = {};
          }
          
          // Check if response contains delimited values
          if (content && content.includes('<DELIMITER>')) {
            // Split the content by delimiter
            const values = content.split('<DELIMITER>');
            
            // Assign each value to the corresponding column
            columns.forEach((col, index) => {
              const value = index < values.length ? values[index] : 'N/A';
              
              newData[file_key][col.id] = {
                content: value,
                status: 'complete'
              };
            });
          } else {
            // If not delimited (old format or error), assign to first column and leave others empty
            if (columns.length > 0) {
              newData[file_key][columns[0].id] = {
                content: content || '',
                status: 'complete'
              };
              
              // Mark other columns as empty
              for (let i = 1; i < columns.length; i++) {
                newData[file_key][columns[i].id] = {
                  content: '',
                  status: 'empty'
                };
              }
            }
          }
          
          return newData;
        });
      } 
      else if (message.type === 'status') {
        // Update processing status
        setProcessingStatus(message.message || '');
      }
      else if (message.type === 'complete') {
        // Processing complete
        setProcessingStatus('Processing complete');
        setIsLoading(false);
        
        toast({
          title: "Analysis complete",
          description: "The table has been populated with extracted information.",
        });
      }
      else if (message.type === 'error' || message.error) {
        // Handle error
        const errorMessage = message.message || message.error || "An error occurred during processing";
        setProcessingStatus('');
        setIsLoading(false);
        
        console.error('WebSocket error message:', errorMessage);
        
        toast({
          title: "Error analyzing documents",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  // Connect to WebSocket
  const connectWebSocket = async (dataroomId: string): Promise<WebSocket> => {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();
      
      if (!idToken) {
        throw new Error('No ID token available');
      }

      // Replace with your WebSocket endpoint (using the table query lambda)
      const websocketHost = `${process.env.NEXT_PUBLIC_SEARCH_API_CODE}.execute-api.${process.env.NEXT_PUBLIC_REGION}.amazonaws.com`;
      
      // Create URL parameters with both idToken and dataroomId
      const params = new URLSearchParams();
      params.append('idToken', idToken);
      params.append('dataroomId', dataroomId); // Add dataroomId to URL params
      
      const wsUrl = `wss://${websocketHost}/prod?${params.toString()}`;
      
      console.log('WebSocket connecting with URL params:', Object.fromEntries(params.entries()));
      
      // Create a promise that resolves when the connection opens or rejects on error
      return new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connected for table query');
          setWsConnection(ws);
          resolve(ws);
        };

        ws.onmessage = handleWebSocketMessage;

        ws.onclose = (event) => {
          console.log('WebSocket disconnected', event);
          setWsConnection(null);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnection(null);
          
          toast({
            title: "Connection Error",
            description: "Could not connect to analysis service. Please try again.",
            variant: "destructive"
          });
          
          reject(error);
        };
      });
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      
      // Display more specific error message
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to the analysis service",
        variant: "destructive"
      });
      
      throw error;
    }
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
    
    if (!searchQuery.trim()) {
      toast({
        title: "No query provided",
        description: "Please describe what information you're looking for.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Validate columns
    if (columns.length === 0) {
      toast({
        title: "No columns defined",
        description: "Please add at least one column before analyzing documents.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Check for empty column titles
    const emptyTitleColumns = columns.filter(col => !col.title.trim());
    if (emptyTitleColumns.length > 0) {
      toast({
        title: "Empty column title",
        description: "Please provide a title for all columns.",
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
      // Connect to WebSocket if not already connected
      let ws = wsConnection;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Use the first file's bucket ID as the dataroom ID (collection_name)
        const firstFile = searchableFiles.find(file => file.fileId === selectedFileIds[0]);
        if (!firstFile) {
          throw new Error('Could not determine collection name');
        }
        
        const dataroomId = firstFile.parentFolderId;
        
        // Wait for the connection to be fully established
        ws = await connectWebSocket(dataroomId);
      }
      
      // WebSocket must be defined and open at this point
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket connection not open');
      }
      
      // Format column data for the backend
      const columnData = columns.map(col => ({
        id: col.id,
        title: col.title
      }));
        
      // Get collection name from URL path parameter instead of from the first selected file
      const pathname = window.location.pathname;
      // Extract the collection name (bucket UUID) from the URL path
      // Assuming URL structure like /dataroom/{bucketUuid}/...
      const pathParts = pathname.split('/');
      const collection_name_from_url = pathParts.length > 2 ? pathParts[2] : null;
      
      // Use the collection name from URL if available, otherwise fall back to the one from selected files
      const collection_name = collection_name_from_url;
      console.log('Collection name:', collection_name);

      
      console.log('Collection name from URL:', collection_name_from_url);
      if (!collection_name) {
        throw new Error('Could not determine collection name from selected files');
      }
      
      // Send the query message
      const message = {
        action: 'query',
        data: {
          collection_name: collection_name,
          query: searchQuery,
          file_keys: selectedFileIds,
          for_table: true,
          table_cols: columnData.map(col => col.title),
          use_reasoning: true
        }
      };
      
      console.log('Sending table query:', message);
      // At this point, ws should always be defined and open
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        setProcessingStatus('Initializing analysis...');
      } else {
        throw new Error('WebSocket connection not ready for sending');
      }
      
    } catch (error) {
      console.error("Error sending query:", error);
      setIsLoading(false);
      
      toast({
        title: "Error analyzing documents",
        description: "There was a problem connecting to the analysis service. Please try again.",
        variant: "destructive"
      });
      
      // Reset loading states
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
    }
  };

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
                {processingStatus || 'Processing...'}
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
                <HoverCardContent className="w-96">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Analysis Query</h4>
                    <p className="text-sm text-muted-foreground">
                      Describe what information you&apos;re looking for in these documents. The system will extract data
                      for each column in the table.
                    </p>
                    <div className="rounded bg-muted p-2 text-sm">
                      <p className="font-medium mb-1">Example queries:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>&quot;Extract all parties mentioned in these agreements and their roles and contact information.&quot;</li>
                        <li>&quot;Identify key dates, payment terms, and contract values in these documents.&quot;</li>
                        <li>&quot;Find all legal entities, their representatives, and their defined responsibilities.&quot;</li>
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For best results, set clear column names and provide a detailed query.
                      Use the &quot;I don&apos;t know&quot; responses to identify missing information across documents.
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