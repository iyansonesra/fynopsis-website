import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Search,
  Info,
  Download,
  Loader2,
  Copy,
  RefreshCw,
  FileText
} from 'lucide-react';
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
import { usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { fetchAuthSession } from 'aws-amplify/auth';

interface Source {
  id: string;
  pageNumber: number;
  chunkTitle: string;
  chunkText: string;
}

interface Message {
  type: 'question' | 'answer' | 'error';
  content: string;
  sources?: Source[];
  steps?: ThoughtStep[];
  progressText?: string;
  sourcingSteps?: string[];
  subSources?: Record<string, any>;
  batches?: {
    stepNumber: number;
    totalSteps: number;
    description: string;
    sources: Record<string, any>;
    isActive: boolean;
  }[];
}

interface ThoughtStep {
  number: number;
  content: string;
}

// Get ID token for WebSocket authentication
const getIdToken = async () => {
  try {
    const { tokens } = await fetchAuthSession();
    return tokens?.idToken?.toString();
  } catch (error) {
    console.error('Error getting ID token:', error);
    throw error;
  }
};

export const DeepResearchViewer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const pathname = usePathname();
  const pathParts = pathname ? pathname.split('/') : [];
  const dataroomId = pathParts.length > 2 ? pathParts[2] : null;
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  
  // Response state
  const [responseText, setResponseText] = useState<string>('');
  const [formattedResponse, setFormattedResponse] = useState<{[key: string]: string}>({});
  const [queryHistory, setQueryHistory] = useState<Array<{query: string, response: string, timestamp: Date}>>([]);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  
  // WebSocket processing state
  const [isWebSocketActive, setIsWebSocketActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const processingRef = useRef<boolean>(false);
  const pendingSearchResultsRef = useRef<{ response: string, sources: any, thread_id: string }[]>([]);
  
  // Add a message to the messages array
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);
  
  // Update the last message in the messages array
  const updateLastMessage = useCallback((update: Partial<Message>) => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const newMessages = [...prev];
      const lastIndex = newMessages.length - 1;
      newMessages[lastIndex] = { ...newMessages[lastIndex], ...update };
      return newMessages;
    });
  }, []);

  // Function to process search result buffer to avoid too many state updates
  const processSearchResultBuffer = (fullText?: string) => {
    if (pendingSearchResultsRef.current.length === 0) {
      processingRef.current = false;
      return;
    }

    processingRef.current = true;

    // Process all pending updates
    const pendingUpdates = [...pendingSearchResultsRef.current];
    pendingSearchResultsRef.current = [];

    // Use the full text for parsing instead of incrementally adding
    const textToProcess = fullText || responseText;

    // Try to parse structured content from the full text
    if (textToProcess.includes('<answer>')) {
      const answerMatch = textToProcess.match(/<answer>([\s\S]*?)(<\/answer>|$)/);
      if (answerMatch && answerMatch[1]) {
        // Process the structured answer format
        const answerContent = answerMatch[1];
        
        // Look for bold section headers followed by content
        const sections = answerContent.split(/\*\*([^*]+)\*\*:/g).filter(Boolean);
        const parsedData: {[key: string]: string} = {};
        
        for (let i = 0; i < sections.length; i += 2) {
          if (i + 1 < sections.length) {
            const key = sections[i].trim();
            const value = sections[i + 1].trim();
            parsedData[key] = value;
          }
        }
        
        if (Object.keys(parsedData).length > 0) {
          setFormattedResponse(parsedData);
        }
      }
    }

    // Schedule next processing if needed
    if (pendingSearchResultsRef.current.length > 0) {
      requestAnimationFrame(() => processSearchResultBuffer(fullText));
    } else {
      processingRef.current = false;
    }
  };

  const queryAllDocuments = async (searchTerm: string) => {
    setLastQuery(searchTerm);
    setResponseText('');
    setFormattedResponse({});
    // Clear any previous response buffers
    pendingSearchResultsRef.current = [];

    try {
      setIsWebSocketActive(true);
      setIsLoading(true);

      // Add question message
      addMessage({ type: 'question', content: searchTerm });

      const bucketUuid = dataroomId || '';
      const websocketHost = `${process.env.NEXT_PUBLIC_SEARCH_API_CODE}.execute-api.${process.env.NEXT_PUBLIC_REGION}.amazonaws.com`;

      const idToken = await getIdToken();
      if (!idToken) {
        throw new Error('No ID token available');
      }

      const params = new URLSearchParams();
      params.append('idToken', idToken);

      const websocketUrl = `wss://${websocketHost}/prod?${params.toString()}`;
      const ws = new WebSocket(websocketUrl);

      // Keep track of the full response text to ensure we don't lose any part
      let fullResponseText = '';

      ws.onopen = () => {
        setWsConnection(ws);
        const message = {
          action: 'query',
          data: {
            collection_name: bucketUuid,
            query: searchTerm,
            file_keys: [], // Empty array means search across all files
            use_deep_search: true, // Enable deep search mode
            ...(currentThreadId ? { thread_id: currentThreadId } : {})
          }
        };

        ws.send(JSON.stringify(message));
        setProcessingStatus('Initializing deep research analysis...');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket data received:", data);
          
          // Handle pong response - just log it
          if (data.type === 'pong') {
            console.log('Received pong from server');
            return;
          }
          
          if (data.type === 'progress') {
            const progressText = data.step || data.message;
            setProcessingStatus(progressText);
            
            // Update last message if it's an answer message
            if (messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              if (lastMessage.type === 'answer') {
                if (lastMessage.progressText !== progressText) {
                  updateLastMessage({ progressText });
                }
              } else if (lastMessage.type === 'question') {
                addMessage({
                  type: 'answer',
                  content: '',
                  progressText: progressText
                });
              }
            }
          }
          
          if (data.type === 'batch') {
            const batchItems = data.items || [];
            
            if (batchItems.length > 0) {
              const stepStartItem = batchItems.find((item: { type: string; }) => item.type === 'step_start');
              
              if (stepStartItem) {
                setIsThinking(true);
                
                if (messages.length > 0 && messages[messages.length - 1].type === 'answer') {
                  const lastMessage = messages[messages.length - 1];
                  
                  // Create or update batches array
                  const batches = lastMessage.batches || [];
                  
                  // Add the new batch with step information
                  batches.push({
                    stepNumber: stepStartItem.step_number,
                    totalSteps: stepStartItem.total_steps,
                    description: stepStartItem.description,
                    sources: {},
                    isActive: true // Mark this as the active batch
                  });

                  if (batches.length > 1) {
                    for (let i = 0; i < batches.length - 1; i++) {
                      batches[i].isActive = false;
                    }
                  }
                  
                  // Update the progress text
                  const progressText = `Step ${stepStartItem.step_number} of ${stepStartItem.total_steps}: ${stepStartItem.description}`;
                  
                  updateLastMessage({
                    batches,
                    progressText
                  });
                } else if (messages.length > 0 && messages[messages.length - 1].type === 'question') {
                  const batches = [{
                    stepNumber: stepStartItem.step_number,
                    totalSteps: stepStartItem.total_steps,
                    description: stepStartItem.description,
                    sources: {},
                    isActive: true
                  }];
                  
                  const progressText = `Step ${stepStartItem.step_number} of ${stepStartItem.total_steps}: ${stepStartItem.description}`;
                  
                  addMessage({
                    type: 'answer',
                    content: '',
                    batches,
                    progressText
                  });
                }
              }
            }
          }
          
          if (data.type === 'status') {
            setProcessingStatus(data.message || '');
            
            // Handle source data if present
            if (data.sources) {
              setIsThinking(true);
              
              if (messages.length > 0 && messages[messages.length - 1].type === 'answer') {
                const lastMessage = messages[messages.length - 1];
                const sourcingSteps = lastMessage.sourcingSteps || [];
                sourcingSteps.push(data.message);
                
                let subSources = lastMessage.subSources || {};
                const batches = lastMessage.batches || [];
                const activeBatchIndex = batches.findIndex(batch => batch.isActive);
                
                if (data.sources) {
                  const keys = Object.keys(data.sources).filter(key => key !== '[[Prototype]]');
                  keys.forEach(key => {
                    // In a real app, you would have a function to get file names
                    // For now, we'll just use the key
                    const fileName = key.split('/').pop() || key;
                    subSources[fileName] = key;
                    
                    if (activeBatchIndex !== -1) {
                      if (!batches[activeBatchIndex].sources) {
                        batches[activeBatchIndex].sources = {};
                      }
                      batches[activeBatchIndex].sources[fileName] = key;
                    }
                  });
                }
                
                updateLastMessage({
                  sourcingSteps,
                  subSources,
                  batches,
                  progressText: "Generating sources..."
                });
              }
            }
          }
          
          if (data.type === 'response') {
            if (data.thread_id) {
              setCurrentThreadId(data.thread_id);
            }
            
            // Directly append the response to the text state to ensure we don't miss anything
            fullResponseText += data.response;
            setResponseText(fullResponseText);
            
            // Also add to buffer for any additional formatting/processing
            pendingSearchResultsRef.current.push({
              response: data.response,
              sources: data.sources || {},
              thread_id: data.thread_id || ''
            });
            
            // Process the buffer if not already processing
            if (!processingRef.current) {
              processSearchResultBuffer(fullResponseText);
            }
          }
          
          if (data.type === 'complete') {
            setIsWebSocketActive(false);
            setIsLoading(false);
            
            // Add to query history
            setQueryHistory(prev => [
              {
                query: searchTerm,
                response: responseText,
                timestamp: new Date()
              },
              ...prev
            ]);
            
            toast({
              title: "Analysis complete",
              description: "The research has been completed.",
            });
          }
          
          if (data.type === 'error' || data.error) {
            const errorMessage = data.message || data.error || "An error occurred during processing";
            setProcessingStatus('');
            setIsWebSocketActive(false);
            setIsLoading(false);
            setShowRetry(true);
            
            addMessage({
              type: 'error',
              content: errorMessage
            });
            
            toast({
              title: "Error analyzing documents",
              description: errorMessage,
              variant: "destructive"
            });
          }
          
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          setIsWebSocketActive(false);
          setIsLoading(false);
          setShowRetry(true);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setIsWebSocketActive(false);
        setIsLoading(false);
        setShowRetry(true);
        
        toast({
          title: "Connection Error",
          description: "Could not connect to analysis service. Please try again.",
          variant: "destructive"
        });
      };
      
      ws.onclose = () => {
        setIsWebSocketActive(false);
        setIsLoading(false);
      };
      
    } catch (error) {
      console.error('Error querying documents:', error);
      setIsWebSocketActive(false);
      setIsLoading(false);
      setShowRetry(true);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleSendQuery = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "No query provided",
        description: "Please enter a query to search the documents.",
        variant: "destructive"
      });
      return;
    }

    if (!dataroomId) {
      toast({
        title: "Dataroom not found",
        description: "Could not determine which dataroom to search.",
        variant: "destructive"
      });
      return;
    }
    
    await queryAllDocuments(searchQuery);
  };

  const handleRetry = async () => {
    setShowRetry(false);
    await queryAllDocuments(lastQuery);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(responseText).then(
      function() {
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
        toast({
          title: "Copied to clipboard",
          description: "The response has been copied to your clipboard.",
        });
      },
      function(err) {
        toast({
          title: "Error",
          description: "Could not copy text: " + err,
          variant: "destructive"
        });
      }
    );
  };

  const exportToTextFile = () => {
    const blob = new Blob([responseText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deep-research-${new Date().toISOString().slice(0, 10)}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add useRef for scrolling to bottom
  const resultsScrollAreaRef = useRef<HTMLDivElement>(null);

  // Add useEffect to scroll to bottom when new results arrive
  useEffect(() => {
    if (resultsScrollAreaRef.current && responseText) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (resultsScrollAreaRef.current) {
          resultsScrollAreaRef.current.scrollTop = resultsScrollAreaRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [responseText]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden p-4 gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Advanced Query Panel</h1>
      </div>
      
      <Tabs defaultValue="query" className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="query">Query</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="query" className="flex-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Query</CardTitle>
              <CardDescription>
                Ask a question about the documents in this dataroom
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Textarea 
                  placeholder="Enter your query..." 
                  className="min-h-[120px] text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex justify-between items-center">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Info className="h-4 w-4 mr-2" />
                        Query Tips
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-96">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Tips for Better Results</h4>
                        <p className="text-sm text-muted-foreground">
                          Be specific and detailed in your questions. You can ask complex questions about the content in your documents.
                        </p>
                        <div className="rounded bg-muted p-2 text-sm">
                          <p className="font-medium mb-1">Example queries:</p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>&quot;What are the key financial projections for the next 3 years?&quot;</li>
                            <li>&quot;Summarize the regulatory requirements mentioned in any document&quot;</li>
                            <li>&quot;List all companies mentioned and their relationship to each other&quot;</li>
                          </ul>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                  <div className="flex gap-2">
                    {showRetry && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRetry}
                        disabled={isLoading}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    )}
                    <Button 
                      onClick={handleSendQuery}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {processingStatus || 'Processing...'}
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search Documents
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Results</CardTitle>
                {responseText && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      {copiedToClipboard ? (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToTextFile}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <div 
                className="h-full rounded-md border p-4 overflow-y-auto" 
                ref={resultsScrollAreaRef}
                style={{ 
                  maxHeight: "calc(100vh - 340px)", 
                  overflowX: "hidden",
                  wordBreak: "break-word"
                }}
              >
                {isLoading && !responseText ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>{processingStatus || 'Analyzing documents...'}</p>
                  </div>
                ) : responseText ? (
                  <div className="space-y-4">
                    {Object.keys(formattedResponse).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(formattedResponse).map(([key, value], index) => (
                          <div key={index} className="space-y-2">
                            <h3 className="font-bold text-lg">- <strong>{key}</strong>:</h3>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap pl-4">
                              {/* Process value to keep bullet points and structure */}
                              {value.split('\n').map((line, i) => {
                                // Format the line based on its content - special handling for bullet points
                                const trimmedLine = line.trim();
                                if (trimmedLine.startsWith('▸')) {
                                  return <p key={i} className="mb-1 font-medium">{trimmedLine}</p>;
                                } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                                  return <p key={i} className="mb-1 ml-2">{trimmedLine}</p>;
                                } else {
                                  return <p key={i} className="mb-1">{trimmedLine}</p>;
                                }
                              })}
                            </div>
                            {index < Object.entries(formattedResponse).length - 1 && (
                              <Separator className="my-3" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <FormatResponseWithCitations text={responseText} />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Enter a query and click Search to see results
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="flex-1 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle>Query History</CardTitle>
              <CardDescription>
                Your recent queries and their results
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                {queryHistory.length > 0 ? (
                  <div className="space-y-4 p-4">
                    {queryHistory.map((item, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">
                              {item.query.length > 60 
                                ? item.query.substring(0, 60) + '...' 
                                : item.query}
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">
                              {item.timestamp.toLocaleString()}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <div className="max-h-40 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm">
                              {item.response.length > 300 
                                ? item.response.substring(0, 300) + '...' 
                                : item.response}
                            </pre>
                          </div>
                        </CardContent>
                        <CardFooter className="border-t pt-2 pb-2">
                          <div className="flex w-full justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSearchQuery(item.query);
                                setResponseText(item.response);
                                // Try to parse the response
                                try {
                                  const lines = item.response.split('\n').filter((line: string) => line.trim());
                                  const parsedData: {[key: string]: string} = {};
                                  
                                  lines.forEach((line: string) => {
                                    const colonIndex = line.indexOf(':');
                                    if (colonIndex > 0) {
                                      const key = line.substring(0, colonIndex).trim();
                                      const value = line.substring(colonIndex + 1).trim();
                                      parsedData[key] = value;
                                    }
                                  });
                                  
                                  if (Object.keys(parsedData).length > 0) {
                                    setFormattedResponse(parsedData);
                                  } else {
                                    setFormattedResponse({});
                                  }
                                } catch (error) {
                                  console.error('Error parsing response:', error);
                                  setFormattedResponse({});
                                }
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reuse Query
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground p-4">
                    No query history yet
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeepResearchViewer;

// Add these functions to handle citation formatting
const FormatResponseWithCitations: React.FC<{ text: string }> = ({ text }) => {
  // Check if we have answer tags and extract just the answer content
  let content = text;
  if (text.includes('<answer>') && text.includes('</answer>')) {
    const match = text.match(/<answer>([\s\S]*?)<\/answer>/);
    if (match && match[1]) {
      content = match[1].trim();
    }
  } else if (text.includes('<think>')) {
    // If there's no complete answer but there is thinking content,
    // we want to show everything after the <think> tag
    const thinkIndex = text.indexOf('<think>');
    if (thinkIndex >= 0) {
      // Get everything after the think tag
      const afterThink = text.substring(thinkIndex + 7);
      
      // If there's an end think tag, get everything between
      const endThinkIndex = afterThink.indexOf('</think>');
      if (endThinkIndex >= 0) {
        content = afterThink.substring(0, endThinkIndex).trim();
      } else {
        content = afterThink.trim();
      }
    }
  }

  // For very long content, use a more efficient approach
  if (content.length > 10000) {
    // For long content, just handle citation format and return as text
    const formattedText = content.replace(/\[(\d+)\]\(([^:)]+)(?:::([^)]+))?\)/g, 
      (match, num) => ` [${num}] `);
    
    return (
      <div className="whitespace-pre-wrap text-sm long-content">
        {formattedText}
      </div>
    );
  }
  
  // For shorter content, use the full React Node processing
  const processedContent = processCitations(content);
  return <div className="whitespace-pre-wrap text-sm">{processedContent}</div>;
};

// Function to process citations and convert file IDs
const processCitations = (text: string): React.ReactNode[] => {
  // Regex to match [number](fileId::chunk) patterns
  const regex = /\[(\d+)\]\(([^:)]+)(?:::([^)]+))?\)/g;
  
  // Split the text by citations
  const parts = text.split(regex);
  const result: React.ReactNode[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    // Regular text part
    if (i % 4 === 0) {
      if (parts[i]) {
        result.push(<span key={`text-${i}`}>{parts[i]}</span>);
      }
    }
    // Citation part
    else if (i % 4 === 1) {
      const citationNumber = parts[i];
      const fileId = parts[i + 1];
      const chunk = parts[i + 2];
      
      if (citationNumber && fileId) {
        result.push(
          <span 
            key={`citation-${i}`} 
            className="inline-flex justify-center items-center w-5 h-5 bg-slate-400 dark:bg-slate-600 rounded-lg text-white text-xs font-normal mx-1 cursor-pointer hover:bg-slate-500 dark:hover:bg-slate-700"
            title={`Citation ${citationNumber} - ${getShortFileName(fileId)}`}
          >
            {citationNumber}
          </span>
        );
      }
      
      // Skip the next two parts since we've already processed them
      i += 2;
    }
  }
  
  return result;
};

// Helper function to format file names
const getShortFileName = (fileId: string): string => {
  // Extract just the last part of the file ID for display
  const parts = fileId.split('/');
  return parts[parts.length - 1];
}; 