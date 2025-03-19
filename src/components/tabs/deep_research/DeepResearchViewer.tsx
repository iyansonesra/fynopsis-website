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
  Plus, 
  Search,
  Trash2, 
  X,
  Info,
  Copy,
  Download,
  Loader2,
  Check,
  FileText
} from 'lucide-react';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Textarea 
} from '@/components/ui/textarea';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from "next/router";
import { nanoid } from "nanoid";
import { useParams, usePathname } from "next/navigation";

// Interfaces
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

export const DeepResearchViewer: React.FC = () => {
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [tableData, setTableData] = useState<TableData>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{fileId: string, columnId: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const pathname = usePathname();
  const pathParts = pathname ? pathname.split('/') : [];
  const dataroomId = pathParts.length > 2 ? pathParts[2] : null;
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  // Initialize columns
  useEffect(() => {
    setColumns([
      { id: 'col1', title: 'Entity Name' },
      { id: 'col2', title: 'Role' },
      { id: 'col3', title: 'Contact Info' }
    ]);
  }, []);

  // WebSocket message handler
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
          description: "The research has been completed and results are displayed.",
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

  // Define the connectWebSocket function directly in the component
  const connectWebSocket = async (dataroomId: string): Promise<WebSocket> => {
    try {
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dataroomId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get WebSocket token');
      }
      
      const { url } = await response.json();
      const ws = new WebSocket(url);
      
      return new Promise((resolve, reject) => {
        ws.onopen = () => {
          console.log('WebSocket connected for deep research');
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

  // Validate columns before sending query
  const validateColumns = () => {
    // Ensure we have at least one column
    if (columns.length === 0) {
      toast({
        title: "No columns defined",
        description: "Please add at least one column before analyzing documents.",
        variant: "destructive"
      });
      return false;
    }

    // Check for empty column titles
    const emptyTitleColumns = columns.filter(col => !col.title.trim());
    if (emptyTitleColumns.length > 0) {
      toast({
        title: "Empty column title",
        description: "Please provide a title for all columns.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSendQuery = async () => {
    setIsLoading(true);
      
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
    if (!validateColumns()) {
      setIsLoading(false);
      return;
    }

    if (!dataroomId) {
      toast({
        title: "Dataroom not found",
        description: "Could not determine which dataroom to search.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    // Initialize an empty table for now - results will come in via WebSocket
    const initialTableData: TableData = {};
    // Add a special "deep-search" row that will contain results
    initialTableData["deep-search-results"] = {};
    columns.forEach(col => {
      initialTableData["deep-search-results"][col.id] = { 
        content: '', 
        status: 'loading'
      };
    });
    
    setTableData(initialTableData);
    
    try {
      // Connect to WebSocket if not already connected
      let ws = wsConnection;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Wait for the connection to be fully established
        ws = await connectWebSocket(dataroomId);
      }
      
      // WebSocket must be defined and open at this point
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket connection not open');
      }
      
      // Format column data for the backend
      const columnTitles = columns.map(col => col.title);
      
      // Send the query message with no file_keys to perform deep search across all files
      const message = {
        action: 'query',
        data: {
          collection_name: dataroomId,
          query: searchQuery,
          file_keys: [], // Empty array means search across all files
          for_table: true,
          table_cols: columnTitles,
          use_reasoning: true,
          use_deep_search: true // Enable deep search mode
        }
      };
      
      console.log('Sending deep research query:', message);
      // At this point, ws should always be defined and open
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        setProcessingStatus('Initializing deep research analysis...');
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
      if (resetTableData["deep-search-results"]) {
        columns.forEach(col => {
          if (resetTableData["deep-search-results"][col.id]) {
            resetTableData["deep-search-results"][col.id].status = 'empty';
          }
        });
      }
      
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

  const handleCellClick = (fileId: string, columnId: string) => {
    const cellData = tableData[fileId]?.[columnId];
    if (cellData?.status === 'complete') {
      // Start editing this cell
      setEditingCell({ fileId, columnId });
      setEditValue(cellData.content);
    }
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      const { fileId, columnId } = editingCell;
      setTableData(prev => {
        const newData = { ...prev };
        if (!newData[fileId]) {
          newData[fileId] = {};
        }
        newData[fileId][columnId] = {
          ...newData[fileId][columnId],
          content: editValue,
          status: 'complete'
        };
        return newData;
      });
      setEditingCell(null);
    }
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
    // Convert table data to CSV
    let csvContent = '';
    
    // Header row with column titles
    csvContent += columns.map(col => `"${col.title}"`).join(',') + '\n';
    
    // Data rows
    Object.keys(tableData).forEach(fileId => {
      const row = columns.map(col => {
        const cellContent = tableData[fileId]?.[col.id]?.content || '';
        return `"${cellContent.replace(/"/g, '""')}"`;
      }).join(',');
      csvContent += row + '\n';
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `research-results-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold">Deep Research Analysis</h1>
        <div className="flex items-center gap-2">
          <Button 
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
                Run Deep Research
              </>
            )}
          </Button>
          {Object.keys(tableData).length > 0 && (
            <Button
              variant="outline"
              onClick={exportTableToCSV}
              className="whitespace-nowrap"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Textarea 
                placeholder="Describe what information you're looking for across all documents..." 
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
                    <h4 className="text-sm font-semibold">Deep Research Query</h4>
                    <p className="text-sm text-muted-foreground">
                      Describe what information you&apos;re looking for across all documents in the dataroom. The system will extract data
                      for each column in the table.
                    </p>
                    <div className="rounded bg-muted p-2 text-sm">
                      <p className="font-medium mb-1">Example queries:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>&quot;Find all companies mentioned across documents and their revenue figures&quot;</li>
                        <li>&quot;Identify key regulatory requirements mentioned in any document&quot;</li>
                        <li>&quot;Extract all financial projections for the next 5 years from any document&quot;</li>
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      For best results, provide a detailed query and set clear column names.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
            
            <div className="mt-4">
              <div className="mb-2 font-medium">Define columns for extraction:</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {columns.map((col) => (
                  <div key={col.id} className="flex items-center border rounded p-2 bg-card">
                    <Input
                      value={col.title}
                      onChange={(e) => handleUpdateColumnTitle(col.id, e.target.value)}
                      className="border-0 p-0 h-6 w-auto"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveColumn(col.id)}
                      className="h-6 w-6 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddColumn}
                  className="flex items-center"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Column
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {Object.keys(tableData).length > 0 ? (
          <div className="h-full overflow-auto">
            <div className="min-w-full relative">
              <Table className="w-full border-collapse">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="border-b border-border">
                    <TableHead className="w-[200px] min-w-[200px] border-r border-border bg-background sticky left-0 z-20">Source</TableHead>
                    {columns.map((col) => (
                      <TableHead key={col.id} className="w-[180px] min-w-[180px] border-r border-border bg-background">
                        {col.title}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(tableData).map((fileId) => (
                    <TableRow key={fileId} className="border-b border-border hover:bg-transparent">
                      <TableCell className="font-medium truncate border-r border-border bg-background sticky left-0 z-10 hover:bg-transparent">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {fileId === "deep-search-results" ? "Deep Search Results" : fileId}
                          </span>
                        </div>
                      </TableCell>
                      {columns.map((col) => {
                        const cellData = tableData[fileId][col.id];
                        const isEditing = editingCell && 
                                         editingCell.fileId === fileId && 
                                         editingCell.columnId === col.id;
                        
                        if (isEditing) {
                          return (
                            <TableCell key={col.id} className="border-r border-border relative overflow-visible hover:bg-transparent">
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
                                    <Check className="h-3 w-3" />
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
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          );
                        }
                        
                        if (cellData.status === 'loading') {
                          return (
                            <TableCell key={col.id} className="border-r border-border hover:bg-transparent">
                              <div className="flex justify-center items-center h-6">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            </TableCell>
                          );
                        }
                        
                        return (
                          <TableCell 
                            key={col.id} 
                            className="border-r border-border cursor-pointer hover:bg-transparent"
                            onClick={() => handleCellClick(fileId, col.id)}
                          >
                            {cellData.content}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Run a deep research query to see results here
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepResearchViewer; 