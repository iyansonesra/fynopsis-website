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
import { HoverCardPortal } from '@radix-ui/react-hover-card';
import Markdown from 'markdown-to-jsx';

// Add new interface for citations
interface Citation {
  id: string;
  stepNumber: string;
  fileKey: string;
  chunkText: string;
  position: number;
}

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
  citations?: Citation[];
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

// Citation circle component
const GreenCircle = React.memo(({
  number,
  fileKey,
  onSourceClick,
  chunk
}: {
  number: string;
  fileKey?: string;
  onSourceClick?: (fileKey: string, chunk?: string) => void;
  chunk?: string;
}) => {
  const getShortFileName = (fileId: string): string => {
    const parts = fileId.split('/');
    return parts[parts.length - 1];
  };

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={`inline-flex justify-center items-center w-5 h-5 bg-slate-400 dark:bg-slate-600 rounded-lg text-white text-xs font-normal mx-1 ${fileKey ? 'cursor-pointer hover:bg-slate-500 dark:hover:bg-slate-700' : ''}`}
          onClick={() => fileKey && onSourceClick?.(fileKey, chunk)}
        >
          {number}
        </span>
      </HoverCardTrigger>
      {fileKey && (
        <HoverCardPortal>
          <HoverCardContent className="p-2 dark:bg-gray-900 dark:border-gray-800 z-[9999] w-fit">
            <div className="flex items-left space-x-2">
              <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                <span className="truncate w-full">
                  {getShortFileName(fileKey)}
                </span>
              </span>
            </div>
          </HoverCardContent>
        </HoverCardPortal>
      )}
    </HoverCard>
  );
});

GreenCircle.displayName = 'GreenCircle';

// Answer with citations component
const AnswerWithCitations = React.memo(({
  content,
  citations = [],
  handleSourceClick
}: {
  content: string;
  citations?: Citation[];
  handleSourceClick?: (fileKey: string, chunk?: string) => void;
}) => {
  const circleComponentsCache = useRef<Map<string, JSX.Element>>(new Map());

  const handleCopyContent = () => {
    const cleanContent = content.replace(/@\d+@/g, '');
    navigator.clipboard.writeText(cleanContent);
  };

  const getCitationByStep = (stepNumber: string) => {
    return citations.find(citation => citation.stepNumber === stepNumber);
  };

  // Process the content once to avoid re-processing on every render
  // Update the transformedContent function in AnswerWithCitations to handle markdown better
  const transformedContent = React.useMemo(() => {
    if (!content) return '';

    // First, replace citation markers with HTML tags
    const processedForCitations = content.replace(/@(\d+)@/g, (match, number, offset, string) => {
      const citation = getCitationByStep(number);
      const followingChar = string[offset + match.length] || '';

      if (followingChar === ' ' || followingChar === '' || followingChar === '\n') {
        return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" data-chunk="${citation?.chunkText || ''}" />\n`;
      }
      return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" data-chunk="${citation?.chunkText || ''}"/>`;
    });

    return processedForCitations;
  }, [content, citations, getCitationByStep]);

  // Define interface for circle component props
  interface CircleComponentProps {
    'data-number': string;
    'data-filekey': string;
    'data-chunk': string;
  }

  const CircleComponentWrapper = React.useMemo(() => {
    const MemoComponent = React.memo((props: CircleComponentProps) => {
      const key = `${props["data-number"]}-${props["data-filekey"]}`;

      // Return cached component if it exists
      if (!circleComponentsCache.current.has(key)) {
        // Create and cache if it doesn't exist yet
        circleComponentsCache.current.set(key,
          <GreenCircle
            number={props["data-number"]}
            fileKey={props["data-filekey"]}
            chunk={props["data-chunk"]}
            onSourceClick={handleSourceClick}
          />
        );
      }

      // Return the cached component
      return circleComponentsCache.current.get(key);
    },
      // Always return true to prevent re-rendering
      () => true);

    MemoComponent.displayName = 'CircleComponent';
    return MemoComponent;
  }, [handleSourceClick]);

  const markdownOptions = React.useMemo(() => ({
    overrides: {
      circle: {
        component: CircleComponentWrapper
      },
      h1: {
        component: (props: any) => <h1 className="text-2xl font-bold my-4" {...props} />
      },
      h2: {
        component: (props: any) => <h2 className="text-xl font-bold my-3" {...props} />
      },
      h3: {
        component: (props: any) => <h3 className="text-lg font-bold my-2" {...props} />
      },
      p: {
        component: (props: any) => <p className="my-2" {...props} />
      },
      ul: {
        component: (props: any) => <ul className="list-disc ml-6 my-2" {...props} />
      },
      ol: {
        component: (props: any) => <ol className="list-decimal ml-6 my-2" {...props} />
      },
      li: {
        component: (props: any) => <li className="my-1" {...props} />
      },
      blockquote: {
        component: (props: any) => <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic" {...props} />
      },
      pre: {
        component: (props: any) => <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded my-2 overflow-x-auto" {...props} />
      },
      code: {
        component: (props: any) => {
          // Inline code vs block code detection
          const isInline = !props.children?.[0]?.props;
          if (isInline) {
            return <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm" {...props} />;
          }
          return <code {...props} />;
        }
      },
      a: {
        component: (props: any) => <a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
      },
      hr: {
        component: (props: any) => <hr className="my-4 border-gray-300 dark:border-gray-700" {...props} />
      },
      table: {
        component: (props: any) => <table className="min-w-full my-4 border-collapse" {...props} />
      },
      thead: {
        component: (props: any) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />
      },
      tbody: {
        component: (props: any) => <tbody className="divide-y divide-gray-200 dark:divide-gray-700" {...props} />
      },
      tr: {
        component: (props: any) => <tr {...props} />
      },
      th: {
        component: (props: any) => <th className="px-4 py-2 text-left text-sm font-medium" {...props} />
      },
      td: {
        component: (props: any) => <td className="px-4 py-2 text-sm" {...props} />
      },
    },
  }), [CircleComponentWrapper]);

  return (
    <div className="whitespace-pre-wrap relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
          onClick={handleCopyContent}
          title="Copy answer"
        >
          <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </Button>
      </div>
      <div className="pr-12">
        <Markdown
          options={markdownOptions}
          className='dark:text-gray-200'
        >
          {transformedContent}
        </Markdown>
      </div>
    </div>
  );
});

AnswerWithCitations.displayName = 'AnswerWithCitations';

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
  const [formattedResponse, setFormattedResponse] = useState<{ [key: string]: string }>({});
  const [queryHistory, setQueryHistory] = useState<Array<{ query: string, response: string, timestamp: Date }>>([]);
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

  // Add state for parsed citations
  const [parsedCitations, setParsedCitations] = useState<Citation[]>([]);
  const [processedContent, setProcessedContent] = useState<string>('');

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

  // Function to extract and parse citations from response text
  // Function to extract and parse citations from response text while preserving markdown
  const extractCitations = useCallback((text: string): { content: string, citations: Citation[] } => {
    const citations: Citation[] = [];

    // Process citations in the format [number](fileId::chunk)
    // Use a regex that doesn't capture markdown links [text](url) by looking for number patterns
    const processedContent = text.replace(
      /\[(\d+)\]\(([^:)]+)(?:::([^)]+))?\)/g,
      (match, stepNum, fileKey, chunkText, offset) => {
        citations.push({
          id: `citation-${citations.length}`,
          stepNumber: stepNum,
          fileKey,
          chunkText: chunkText || '',
          position: offset
        });

        return `@${stepNum}@`;
      }
    );

    return { content: processedContent, citations };
  }, []);

  // Function to process search result buffer
  const processSearchResultBuffer = useCallback(() => {
    if (pendingSearchResultsRef.current.length === 0) {
      processingRef.current = false;
      return;
    }

    processingRef.current = true;

    // Process all pending updates
    const pendingUpdates = [...pendingSearchResultsRef.current];
    pendingSearchResultsRef.current = [];

    // Combine all updates into one
    const combinedUpdate = pendingUpdates.reduce((acc, curr) => ({
      response: acc.response + curr.response,
      sources: { ...acc.sources, ...curr.sources },
      thread_id: curr.thread_id || acc.thread_id
    }), { response: '', sources: {}, thread_id: '' });

    // Update the response text
    setResponseText(prev => prev + combinedUpdate.response);

    // Parse the combined response for citations
    const { content, citations } = extractCitations(combinedUpdate.response);
    setProcessedContent(prev => prev + content);
    setParsedCitations(prev => [...prev, ...citations]);

    // Try to parse structured content from the full text
    const fullText = responseText + combinedUpdate.response;
    if (fullText.includes('<answer>')) {
      const answerMatch = fullText.match(/<answer>([\s\S]*?)(<\/answer>|$)/);
      if (answerMatch && answerMatch[1]) {
        // Process the structured answer format
        const answerContent = answerMatch[1];

        // Look for bold section headers followed by content
        const sections = answerContent.split(/\*\*([^*]+)\*\*:/g).filter(Boolean);
        const parsedData: { [key: string]: string } = {};

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
      requestAnimationFrame(() => processSearchResultBuffer());
    } else {
      processingRef.current = false;
    }
  }, [responseText, extractCitations]);

  // Handle source click
  const handleSourceClick = useCallback((fileKey: string, chunk?: string) => {
    // Implementation of source click handler
    toast({
      title: "Source selected",
      description: `Viewing source: ${fileKey.split('/').pop()}`,
    });
    // You would typically open the source document or highlight the relevant chunk here
  }, [toast]);

  const queryAllDocuments = async (searchTerm: string) => {
    setLastQuery(searchTerm);
    setResponseText('');
    setProcessedContent('');
    setParsedCitations([]);
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

          // Handle pong response - just log it
          if (data.type === 'pong') {
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

            // Add to buffer for processing
            pendingSearchResultsRef.current.push({
              response: data.response,
              sources: data.sources || {},
              thread_id: data.thread_id || ''
            });

            // Process the buffer if not already processing
            if (!processingRef.current) {
              processSearchResultBuffer();
            }

            // Update the answer message with sources if available`
            if (data.sources && Object.keys(data.sources).length > 0) {
              const sources = Object.entries(data.sources).map(([id, info]) => ({
                id,
                pageNumber: 1, // Default value
                chunkTitle: id.split('/').pop() || id,
                chunkText: typeof info === 'object' && info !== null && 'text' in info ? (info as any).text : ''
              }));

              if (messages.length > 0 && messages[messages.length - 1].type === 'answer') {
                updateLastMessage({ sources });
              }
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
      function () {
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
        toast({
          title: "Copied to clipboard",
          description: "The response has been copied to your clipboard.",
        });
      },
      function (err) {
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
    if (resultsScrollAreaRef.current && (responseText || processedContent)) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (resultsScrollAreaRef.current) {
          resultsScrollAreaRef.current.scrollTop = resultsScrollAreaRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [responseText, processedContent]);

  return (
    <ScrollArea className="h-full w-full">

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
                  {(responseText || processedContent) && (
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
                  {isLoading && !responseText && !processedContent ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p>{processingStatus || 'Analyzing documents...'}</p>
                    </div>
                  ) : responseText || processedContent ? (
                    <div className="space-y-4">
                      {Object.keys(formattedResponse).length > 0 ? (
                        <div className="space-y-4">
                          {Object.entries(formattedResponse).map(([key, value], index) => (
                            <div key={index} className="space-y-2">
                              <h3 className="font-bold text-lg">- <strong>{key}</strong>:</h3>
                              <div className="whitespace-pre-wrap pl-4">
                                {/* Extract citations from the value and format them */}
                                {(() => {
                                  const { content, citations } = extractCitations(value);
                                  return (
                                    <AnswerWithCitations
                                      content={content}
                                      citations={citations}
                                      handleSourceClick={handleSourceClick}
                                    />
                                  );
                                })()}
                              </div>
                              {/* Removing the Separator between entries */}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <AnswerWithCitations
                          content={processedContent || responseText}
                          citations={parsedCitations}
                          handleSourceClick={handleSourceClick}
                        />
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

                                  // Parse the response to extract citations
                                  const { content, citations } = extractCitations(item.response);
                                  setResponseText(item.response);
                                  setProcessedContent(content);
                                  setParsedCitations(citations);

                                  // Try to parse structured sections
                                  try {
                                    if (item.response.includes('<answer>')) {
                                      const answerMatch = item.response.match(/<answer>([\s\S]*?)(<\/answer>|$)/);
                                      if (answerMatch && answerMatch[1]) {
                                        const answerContent = answerMatch[1];
                                        const sections = answerContent.split(/\*\*([^*]+)\*\*:/g).filter(Boolean);
                                        const parsedData: { [key: string]: string } = {};

                                        for (let i = 0; i < sections.length; i += 2) {
                                          if (i + 1 < sections.length) {
                                            const key = sections[i].trim();
                                            const value = sections[i + 1].trim();
                                            parsedData[key] = value;
                                          }
                                        }

                                        if (Object.keys(parsedData).length > 0) {
                                          setFormattedResponse(parsedData);
                                          return;
                                        }
                                      }
                                    }

                                    // Fall back to trying to parse sections from markdown
                                    const lines = item.response.split('\n').filter(line => line.trim());
                                    const parsedData: { [key: string]: string } = {};
                                    let currentKey = '';
                                    let currentValue = '';

                                    lines.forEach(line => {
                                      const headerMatch = line.match(/^#+\s+(.+)/);
                                      const sectionMatch = line.match(/^(.+):$/);

                                      if (headerMatch || sectionMatch) {
                                        if (currentKey && currentValue) {
                                          parsedData[currentKey] = currentValue.trim();
                                        }
                                        currentKey = headerMatch ? headerMatch[1].trim() : sectionMatch![1].trim();
                                        currentValue = '';
                                      } else if (currentKey) {
                                        currentValue += line + '\n';
                                      }
                                    });

                                    if (currentKey && currentValue) {
                                      parsedData[currentKey] = currentValue.trim();
                                    }

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
    </ScrollArea>
  );
};

export default DeepResearchViewer;