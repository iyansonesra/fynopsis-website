import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from 'react';
import { ArrowLeft, ArrowUp, BadgeInfo, FileText, Footprints, Plus, PlusCircle, Search, MessageSquare, ReceiptText, SearchIcon, Database, User, Tags, AlignLeft, History, Copy } from 'lucide-react';
import { Input, Skeleton } from '@mui/material';
import { Button } from '../../../ui/button';
import { post, get } from 'aws-amplify/api';
import { ScrollArea, ScrollBar } from '../../../ui/scroll-area';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Card, CardContent } from '../../../ui/card';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import ReactMarkdown from 'react-markdown';
import Markdown from 'markdown-to-jsx';

import { getCurrentUser } from 'aws-amplify/auth';
import aws4 from 'aws4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Credentials } from '@aws-sdk/types';
import { TbH1 } from 'react-icons/tb';
import logo from './../app/assets/fynopsis_noBG.png'
import '../../../../components/temp.css';
import loadingAnimation from './../../../../app/assets/fynopsis_animated.svg'
import staticImage from './../../../../app/assets/fynopsis_static.svg'
import { Separator } from '../../../ui/separator';
import { usePathname } from 'next/navigation';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { TextShimmer } from '../../../ui/text-shimmer';
import { AIInputWithSearch } from '../../../ui/ai-input-with-search';
import { useS3Store } from '../../../services/fileService';
import { useFileStore } from '../../../services/HotkeyService';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { TagDisplay } from '../table/TagsHover';
import reactStringReplace from "react-string-replace";
import { AnswerWithCitations } from './AnswerWithCitations';

import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ContainerScroll } from '../../../ui/container-scroll-animation';
import { HoverCardPortal } from '@radix-ui/react-hover-card';
import { MessageItem } from './MessageItem';
import streamManager, { MessageBatch } from '@/lib/websocketManager';
import { usePermissionsStore } from '@/stores/permissionsStore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// import { w3cwebsocket as W3CWebSocket } from "websocket";
// import { Signer } from '@aws-amplify/core';

const throttle = <T extends (...args: any[]) => void>(func: T, limit: number): T => {
    let inThrottle: boolean = false;
    let lastArgs: Parameters<T> | null = null;

    return ((...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    func(...lastArgs);
                    lastArgs = null;
                }
            }, limit);
        } else {
            lastArgs = args;
        }
    }) as T;
};

const throttledSetState = throttle((setter, value) => setter(value), 2);



interface ThoughtStep {
    number: number;
    content: string;
}

interface SearchResponse {
    response: string;
    sources: Record<string, any>;
    thread_id: string;
}

interface TableFile {
    id: string;
    name: string;
    type: string;
    size: string;
    date: string;
    uploadedBy: string;
    s3Key: string;
    s3Url: string;
    uploadProcess: string;
    status: "success";
    summary?: string;
}

interface Source {
    id: string,
    pageNumber: number,
    chunkTitle: string,
    chunkText: string,
}

interface Citation {
    id: string;
    stepNumber: string;
    fileKey: string;
    chunkText: string;
    position: number;  // Position in the text where citation appears
}

interface MessageItemProps {
    message: Message;
    index: number;
    isLastMessage: boolean;
    handleSourceCardClick: (sourceUrl: string) => void;
    getFileName: (filename: string) => string;
    accordionValues: Record<string, string>;
    setAccordionValue: (messageId: string, value: string) => void;
}



// Modify the Message interface to include citations
interface Message {
    type: 'question' | 'answer' | 'error';
    content: string;
    sources?: Source[];
    steps?: ThoughtStep[];
    progressText?: string;
    sourcingSteps?: string[];
    subSources?: Record<string, any>;
    citations?: Citation[];  // Add this new field
    batches?: MessageBatch[]; // Added batches
    timestamp?: number; // Add timestamp property
}

interface DetailsSectionProps {

    onFileSelect: (file: FileSelectProps, fileChunk?: string) => void; // Changed type
    tableData: TableFile[]; // Add this prop
}

// Add new interface for onFileSelect properties
interface FileSelectProps {
    id: string;
    name: string;
    s3Url: string;
    parentId: string;

    uploadedBy: string;
    type: string;
    size: string;

    isFolder: boolean;
    createByEmail: string;
    createByName: string;
    lastModified: string;
    tags: DocumentTags | null;
    summary: string;
    status: string;
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

interface MessageState {
    messages: Message[];
    isProcessing: boolean;
    progressText: string;
    currentSteps: ThoughtStep[];
}


const getIdToken = async () => {
    try {
        const { tokens } = await fetchAuthSession();
        return tokens?.idToken?.toString();
    } catch (error) {
        console.error('Error getting ID token:', error);
        throw error;
    }
};

const getUserPrefix = async () => {
    try {
        const { identityId } = await fetchAuthSession();
        if (!identityId) {
            throw new Error('No identity ID available');
        }
        return `${identityId}/`;
    } catch (error) {
        console.error('Error getting user prefix:', error);
        throw error;
    }
};





const DetailSection: React.FC<DetailsSectionProps> = ({
    onFileSelect,
    tableData }) => {
    // Add debug logging for props
    useEffect(() => {
    }, [tableData]);
    const {
        showDetailsView,
        setShowDetailsView,
        selectedFile,
        setSelectedFile
    } = useFileStore();
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
    const [loadingSource, setLoadingSource] = useState<string | null>(null);
    const [messageBuffer, setMessageBuffer] = useState<{ response: string, sources: any, thread_id: string }[]>([]);
    const [sourceUrls, setSourceUrls] = useState<string[]>([]);
    // const [currentThreadId, setCurrentThreadId] = useState<string>('');
    const [isAnswerLoading, setIsAnswerLoading] = useState(false);
    const [isWebSocketActive, setIsWebSocketActive] = useState(false);
    const [showChatHistory, setShowChatHistory] = useState(false);

    // const [lastQuery, setLastQuery] = useState<string>('');
    const [showRetry, setShowRetry] = useState(false);
    const [progressText, setProgressText] = useState('');
    const [endThinkFound, setEndThinkFound] = useState(false);
    const [isClickProcessing, setIsClickProcessing] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    // const [messagesState, setMessagesState] = useState<Message[]>([]);
    const processingRef = useRef<boolean>(false);
    const pendingSearchResultsRef = useRef<{ response: string, sources: any, thread_id: string }[]>([]);
    const messagesState = useFileStore(state => state.messages);
    const setMessagesState = useFileStore(state => state.setMessages);
    const lastQuery = useFileStore(state => state.lastQuery);
    const setLastQuery = useFileStore(state => state.setLastQuery);
    const currentThreadId = useFileStore(state => state.currentThreadId);
    const setCurrentThreadId = useFileStore(state => state.setCurrentThreadId);
    const addMessage = useFileStore(state => state.addMessage);
    const updateLastMessage = useFileStore(state => state.updateLastMessage);
    const clearMessages = useFileStore(state => state.clearMessages);
    const getFileName = useFileStore(state => state.getFileName);
    const getFile = useFileStore(state => state.getFile);
    const accordionValues = useFileStore(state => state.accordionValues);
    const setAccordionValue = useFileStore(state => state.setAccordionValue);
    const resetAccordionValues = useFileStore(state => state.resetAccordionValues);
    // Use useRef to store the throttle function with closure over the latest state setter
    const throttledSetMessagesRef = useRef<(value: Message[] | ((prev: Message[]) => Message[])) => void>();
    const { permissionDetails } = usePermissionsStore();
    // useEffect(() => {
    //     throttledSetMessagesRef.current = (value) => throttledSetState(setMessagesState, value);
    // }, [setMessagesState]);

    // // Wrapper function to access the current throttled function
    // const setMessages = useCallback((value: Message[] | ((prev: Message[]) => Message[])) => {
    //     if (throttledSetMessagesRef.current) {
    //         throttledSetMessagesRef.current(value);
    //     }
    // }, []);

    // Add selector for S3Store
    const s3Objects = useS3Store(state => state.objects);

    const handleSourceCardClick = async (sourceUrl: string, chunk?: string) => {
        const bucketUuid = window.location.pathname.split('/')[2] || '';
        if (isClickProcessing) return;
        setIsClickProcessing(true);


        try {
            // First check if file exists in s3Objects

            // Get the signed URL
            const id = sourceUrl.split('/').pop();
            const downloadResponse = await get({
                apiName: 'S3_API',
                path: `/s3/${bucketUuid}/view-url`,
                options: {
                    withCredentials: true,
                    queryParams: { fileId: id || '' }
                }
            });

            const { body } = await downloadResponse.response;
            const responseText = await body.text();
            const { signedUrl } = JSON.parse(responseText);

            const file = getFile(id ?? '');
            if (file) {
                onFileSelect({
                    id: sourceUrl,
                    name: file.fileName,
                    s3Url: signedUrl,
                    parentId: file.parentFolderId,
                    uploadedBy: '',
                    type: '',
                    size: '',
                    isFolder: false,
                    createByEmail: '',
                    createByName: '',
                    lastModified: '',
                    tags: null,
                    summary: '',
                    status: ''
                }, chunk);
            }

        }
        catch (error) {
            console.error('DetailSection - Error handling source click:', error);
        } finally {
            setTimeout(() => {
                setIsClickProcessing(false);
            }, 1000);
        }
    };


   const queryAllDocuments = async (searchTerm: string, searchType: string, selectedFiles: any[]) => {
    setLastQuery(searchTerm);

    try {
        setIsWebSocketActive(true);
        setIsLoading(true);

        // Only add question message if it's not a retry
        const lastMessage = messagesState[messagesState.length - 1];
        if (!lastMessage || lastMessage.type !== 'question' || lastMessage.content !== searchTerm) {
            addMessage({ type: 'question', content: searchTerm });
        }

        setSearchResult({
            response: '',
            sources: {},
            thread_id: ''
        });
        
        const bucketUuid = window.location.pathname.split('/')[2] || '';
        
        // Create a message handler for this specific query
        const messageHandler = (data: any) => {
            try {
                if (data.type === 'progress') {
                    const progressText = data.step || data.message;
                    setProgressText(progressText);
                    setEndThinkFound(false);

                    const currentMessages = useFileStore.getState().messages;

                    // Update messages with progress
                    if (currentMessages.length > 0) {
                        const lastMessage = currentMessages[currentMessages.length - 1];
                        // Only update the message if it's an answer message
                        if (lastMessage?.type === 'answer') {
                            // Only update if progress text has changed
                            if (lastMessage.progressText !== progressText) {
                                updateLastMessage({ progressText });
                            }
                        } else if (lastMessage?.type === 'question') {
                            addMessage({
                                type: 'answer',
                                content: '',
                                progressText: progressText
                            });
                        }
                    }
                }

                if (data.type === 'batch') {
                    // Handle batch response
                    const batchItems = data.items || [];
                    
                    if (batchItems.length > 0) {
                        // We're interested in step_start items which contain the description
                        const stepStartItem = batchItems.find((item: { type: string; }) => item.type === 'step_start');
                        
                        if (stepStartItem) {
                            setIsThinking(true);
                            const currentMessages = useFileStore.getState().messages;
                            
                            // Only update if we have an answer message already
                            if (currentMessages.length > 0 && 
                                currentMessages[currentMessages.length - 1].type === 'answer') {
                                
                                const lastMessage = currentMessages[currentMessages.length - 1];
                                
                                // Create or update batches array
                                const batches = lastMessage.batches || [];
                                
                                // Add the new batch with step information
                                batches.push({
                                    stepNumber: stepStartItem.step_number,
                                    totalSteps: stepStartItem.total_steps,
                                    description: stepStartItem.description,
                                    sources: {},
                                    isActive: true
                                });

                                if (batches.length > 1) {
                                    for (let i = 0; i < batches.length - 1; i++) {
                                        batches[i].isActive = false;
                                    }
                                }
                                
                                // Update the progress text to show the current step
                                const progressText = `Step ${stepStartItem.step_number} of ${stepStartItem.total_steps}: ${stepStartItem.description}`;
                                
                                // Update the message with all changes at once
                                updateLastMessage({
                                    batches,
                                    progressText
                                });
                            } else if (currentMessages.length > 0 && 
                                       currentMessages[currentMessages.length - 1].type === 'question') {
                                // If the last message is a question, create a new answer message
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
                    if (data.sources) {
                        setIsThinking(true);
                        const currentMessages = useFileStore.getState().messages;
                
                        // Only update if we have an answer message already
                        if (currentMessages.length > 0 &&
                            currentMessages[currentMessages.length - 1].type === 'answer') {
                
                            const lastMessage = currentMessages[currentMessages.length - 1];
                            // Create sourcingSteps array if it doesn't exist
                            const sourcingSteps = lastMessage.sourcingSteps || [];
                            sourcingSteps.push(data.message);
                
                            let subSources = lastMessage.subSources || {};
                            
                            // Get the batches array and find the active batch
                            const batches = lastMessage.batches || [];
                            const activeBatchIndex = batches.findIndex(batch => batch.isActive);
                
                            if (data.sources) {
                                // Extract source keys directly from data.sources
                                const keys = Object.keys(data.sources).filter(key => key !== '[[Prototype]]');
                                
                                const documentBoundsMap: Record<string, any> = {};
                
                                keys.forEach(key => {
                                    let id = key.split('/').pop();
                                    const final_id = id?.split("::")[0];

                                    const fileName = id ? getFileName(final_id ?? "") : undefined;
                                    if (fileName) {
                                        subSources[fileName] = key;
                                        
                                        // If we have an active batch, add this source to it
                                        if (activeBatchIndex !== -1) {
                                            if (!batches[activeBatchIndex].sources) {
                                                batches[activeBatchIndex].sources = {};
                                            }
                                            batches[activeBatchIndex].sources[fileName] = key;
                                        }
                                    }
                
                                    if (data.sources[key]) {
                                        const source = data.sources[key];
                                        // Only save if it has the necessary coordinate information
                                        if (source && source.bounding_box &&
                                            (source.bounding_box.x0 !== undefined &&
                                             source.bounding_box.y0 !== undefined &&
                                             source.bounding_box.x1 !== undefined &&
                                             source.bounding_box.y1 !== undefined)) {
                
                                            documentBoundsMap[key] = {
                                                page: source.page || 0,
                                                x0: source.bounding_box.x0,
                                                y0: source.bounding_box.y0,
                                                x1: source.bounding_box.x1,
                                                y1: source.bounding_box.y1,
                                                chunk_title: source.chunk_title,
                                                is_secondary: source.is_secondary,
                                                kg_properties: source.kg_properties,
                                                page_num: source.page_num,
                                                bounding_box: source.bounding_box
                                            };
                                        }
                                    }
                                });

                                if (Object.keys(documentBoundsMap).length > 0) {
                                    useFileStore.getState().addMultipleDocumentBounds(documentBoundsMap);
                                }
                            }

                            // Update the message with all changes at once
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

                    pendingSearchResultsRef.current.push({
                        response: data.response,
                        sources: data.sources || {},
                        thread_id: data.thread_id || ''
                    });

                    // Process the buffer if not already processing
                    if (!processingRef.current) {
                        processSearchResultBuffer();
                    }
                }

                if (data.type === 'complete') {
                    setIsWebSocketActive(false);
                    setIsLoading(false);
                    
                    // Log all messages that were received
                    const messageLog = streamManager.getMessageLog();
                    if (messageLog.length <= 1) {
                        // Only completion message was received
                        console.warn("Only received completion message, no content");
                        // addMessage({
                        //     type: 'error',
                        //     content: 'No content was received from the server. This could be due to a network issue or a problem with the request.'
                        // });
                    }
                    
                    // Remove this handler once complete
                    streamManager.removeMessageHandler(messageHandler);
                }
                
                if (data.type === 'error') {
                    console.error('Stream error:', data.error);
                    setIsWebSocketActive(false);
                    setIsLoading(false);
                    setShowRetry(true);
                    
                    // Add error message if there is one
                    if (data.error) {
                        addMessage({
                            type: 'error',
                            content: `Error: ${data.error}\n\nPlease check the console for more details.`
                        });
                    }
                    
                    streamManager.removeMessageHandler(messageHandler);
                }
            } catch (error) {
                console.error('Error processing message:', error);
                setIsWebSocketActive(false);
                setIsLoading(false);
                addMessage({
                    type: 'error',
                    content: `Error processing response: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        };
        
        // Connect to dataroom if not already connected
        if (!streamManager.isConnectedTo(bucketUuid)) {
            await streamManager.connect(bucketUuid);
        }
        
        // Add the message handler
        streamManager.addMessageHandler(messageHandler);
        
        // Send the query through the manager
        streamManager.sendMessage({
            action: 'query',
            data: {
                thread_id: currentThreadId || undefined,
                collection_name: bucketUuid,
                query: searchTerm,
                use_reasoning: searchType === "reasoning",
                file_keys: selectedFiles,
                use_planning: searchType === "planning",
                // use_deep_search: searchType === "deep_research" // Add the deep research option
            }
        });
        
        // Return a cleanup function to remove the handler if the component unmounts
        return () => {
            streamManager.removeMessageHandler(messageHandler);
        };

    } catch (err) {
        setIsWebSocketActive(false);
        console.error('Error querying collection:', err);
        setError('Failed to fetch search results. Please try again.');
        setIsLoading(false);
        setShowRetry(true);
        
        // Add error message with more details
        addMessage({
            type: 'error',
            content: `Failed to connect to the server: ${err instanceof Error ? err.message : String(err)}\n\nThis could be due to a CORS issue if you're in development mode.`
        });
    }
};

    const processSearchResultBuffer = () => {
        if (pendingSearchResultsRef.current.length === 0) {
            processingRef.current = false;
            return;
        }

        processingRef.current = true;

        // Take all pending updates and batch them together
        const pendingUpdates = [...pendingSearchResultsRef.current];
        pendingSearchResultsRef.current = [];

        // Combine all updates into one
        const combinedUpdate = pendingUpdates.reduce((acc, curr) => ({
            response: acc.response + curr.response,
            sources: { ...acc.sources, ...curr.sources },
            thread_id: curr.thread_id || acc.thread_id
        }), { response: '', sources: {}, thread_id: '' });

        // Apply the combined update
        setSearchResult(prevResult => ({
            response: (prevResult?.response || '') + combinedUpdate.response,
            sources: { ...(prevResult?.sources || {}), ...combinedUpdate.sources },
            thread_id: combinedUpdate.thread_id || prevResult?.thread_id || ''
        }));

        // Schedule next processing using requestAnimationFrame instead of immediately recursing
        if (pendingSearchResultsRef.current.length > 0) {
            requestAnimationFrame(processSearchResultBuffer);
        } else {
            processingRef.current = false;
        }
    };

    useEffect(() => {
        // Reset WebSocket state if component unmounts during active query
        return () => {
            setIsWebSocketActive(false);
            setIsLoading(false);
        };
    }, []);

    const fadeInAnimation = `
 @keyframes fadeIn {
 from { opacity: 0; transform: translateY(10px); }
 to { opacity: 1; transform: translateY(0); }
 }

 .batch-fade-in {
 animation: fadeIn 0.5s ease-out forwards;
 opacity: 0;
 }
`;

    const items = [
        {
            id: "1",
            title: "What makes Origin UI different?",
            content:
                "Origin UI focuses on developer experience and performance. Built with TypeScript, it offers excellent type safety, follows accessibility standards, and provides comprehensive documentation with regular updates.",
        },
    ];



    const [inputValue, setInputValue] = useState('');
    interface InputChangeEvent extends React.ChangeEvent<HTMLTextAreaElement> { }



    const [inThoughts, setInThoughts] = useState(true);
    const [inAnswer, setInAnswer] = useState(false);
    const [inSource, setInSource] = useState(false);
    const [generatingSources, setGeneratingSources] = useState(false);
    const [isGeneratingComplete, setIsGeneratingComplete] = useState(false);

    const [stepsTaken, setStepsTaken] = useState<ThoughtStep[]>([]); const [thoughts, setThoughts] = useState('');
    const pathname = usePathname();
    const bucketUuid = pathname?.split('/')[2] || '';

    const renderedMessages = useMemo(() =>
        messagesState.map((message, index) => (
            <MessageItem
                key={index}
                message={message}
                index={index}
                isLastMessage={index === messagesState.length - 1}
                handleSourceCardClick={handleSourceCardClick}
                getFileName={getFileName}
                // accordionValues={accordionValues}
                // setAccordionValue={setAccordionValue}
            />
        )),
        [messagesState, handleSourceCardClick, getFileName, accordionValues, setAccordionValue]
    );

    const GreenCircle: React.FC<{
        number: string,
        fileKey?: string,
        onSourceClick?: (fileKey: string) => void
    }> = ({ number, fileKey, onSourceClick }) => {
        const fileName = fileKey ? getFileName(fileKey.split('/').pop() || '') : '';

        return (
            <HoverCard openDelay={100} closeDelay={100}>
                <HoverCardTrigger asChild>
                    <span
                        className={`inline-flex justify-center items-center w-5 h-5 bg-slate-400 dark:bg-slate-600 rounded-lg text-white text-xs font-normal mx-1 ${fileKey ? 'cursor-pointer hover:bg-slate-500 dark:hover:bg-slate-700' : ''}`}
                        onClick={() => fileKey && onSourceClick?.(fileKey)}
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
                                        {fileName.length > 30 ? `${fileName.substring(0, 15)}...${fileName.substring(fileName.length - 15)}` : fileName}
                                    </span>
                                </span>
                            </div>
                        </HoverCardContent>
                    </HoverCardPortal>
                )}
            </HoverCard>
        );
    };


    // Update the AnswerWithCitations interface
    interface AnswerWithCitationsProps {
        content: string;
        citations?: Citation[];
    }

    // Main Component
    const AnswerWithCitations: React.FC<AnswerWithCitationsProps> = ({ content, citations = [] }) => {
        const handleCopyContent = () => {
            // Remove citation markers from content
            const cleanContent = content.replace(/@\d+@/g, '');
            navigator.clipboard.writeText(cleanContent);
        };

        // Replace citation markers with an HTML-like <circle data-number="x" /> tag
        const getCitationByStep = (stepNumber: string) => {
            return citations.find(citation => citation.stepNumber === stepNumber);
        };

        // Function to handle source click
        const handleSourceClick = (fileKey: string) => {
            handleSourceCardClick(fileKey);
        };

        // Replace citation markers with GreenCircle components
        let transformedContent = content.replace(/@(\d+)@/g, (match, number, offset, string) => {
            const citation = getCitationByStep(number);
            const followingChar = string[offset + match.length] || '';

            if (followingChar === ' ' || followingChar === '' || followingChar === '\n') {
                return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" />\n`;
            }
            return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" />`;
        });

        if (content.includes("<t")) transformedContent = "";

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
                <div className="pr-12"> {/* Add padding to prevent text from going under the button */}
                    <Markdown
                        className='dark:text-gray-200'
                    >
                        {transformedContent}
                    </Markdown>
                </div>
            </div>
        );
    };




    const handleRetry = async () => {
        setShowRetry(false);
        setIsLoading(true);
        await queryAllDocuments(lastQuery, "auto", []);
    };




    // Replace your existing useEffect for searchResult processing with this implementation

    useEffect(() => {
        if (searchResult && searchResult.response) {
            setIsAnswerLoading(true);
            let response = searchResult.response;

            if (searchResult.response.includes("</think>")) {
                setEndThinkFound(true);
            }

            // Define helper functions
            const extractContent = (text: string, startTag: string, endTag: string) => {
                const startIndex = text.indexOf(startTag);
                const endIndex = text.indexOf(endTag);
                if (startIndex === -1) return null;

                // If we have start tag but no end tag, return all content after start tag
                if (endIndex === -1) {
                    return {
                        content: text.substring(startIndex + startTag.length),
                        remaining: '',
                        isComplete: false
                    };
                }

                // Make sure we include the end tag in the removal
                const content = text.substring(startIndex + startTag.length, endIndex).trim();
                const remaining = text.substring(endIndex + endTag.length).trim();
                return { content, remaining, isComplete: true };
            };

            const extractThinkingSteps = (content: string): { steps: ThoughtStep[], citations: Citation[] } => {
                const steps: ThoughtStep[] = [];
                const citations: Citation[] = [];
                let currentStepNumber = 0;
                let currentStep: ThoughtStep | null = null;

                // Split content into lines while preserving original formatting
                const lines = content.split('\n');

                for (const line of lines) {
                    // Check if line starts with a number followed by a period
                    const stepMatch = line.match(/^(\d+)\.\s+(.*)/);

                    if (stepMatch) {
                        const number = parseInt(stepMatch[1]);
                        // Only create new step if it's exactly one more than the previous step
                        if (number === currentStepNumber + 1) {
                            currentStepNumber = number;
                            let stepContent = stepMatch[2];

                            // Process citations in the step content
                            let match;
                            const citationRegex = /\[(\d+)\]\((.*?)::(.*?)\)/g;
                            let lastIndex = 0;

                            while ((match = citationRegex.exec(stepContent)) !== null) {
                                citations.push({
                                    stepNumber: match[1],
                                    fileKey: match[2],
                                    chunkText: match[3],
                                    id: `citation-${citations.length}`,
                                    position: match.index
                                });
                                lastIndex = citationRegex.lastIndex;
                            }

                            // Replace citations with @stepNum@ format
                            stepContent = stepContent.replace(
                                /\[(\d+)\]\((.*?)::(.*?)\)/g,
                                (_, stepNum) => `@${stepNum}@`
                            );

                            currentStep = {
                                number,
                                content: stepContent
                            };
                            steps.push(currentStep);
                        } else if (currentStep) {
                            // If number doesn't follow sequence, treat as regular content
                            currentStep.content += '\n' + line;
                        }
                    } else if (currentStep) {
                        // Process citations in the continuing content
                        let continuingContent = line;
                        const citationRegex = /\[(\d+)\]\((.*?)::(.*?)\)/g;

                        // Find and extract citations
                        let match;
                        while ((match = citationRegex.exec(continuingContent)) !== null) {
                            citations.push({
                                stepNumber: match[1],
                                fileKey: match[2],
                                chunkText: match[3],
                                id: `citation-${citations.length}`,
                                position: match.index
                            });
                        }

                        // Replace citations with @stepNum@ format
                        continuingContent = continuingContent.replace(
                            /\[(\d+)\]\((.*?)::(.*?)\)/g,
                            (_, stepNum) => `@${stepNum}@`
                        );

                        // Add processed non-step lines to current step's content
                        currentStep.content += '\n' + continuingContent;
                    }
                }

                return { steps, citations };
            };

            // Process error content if it exists
            const errorResult = extractContent(response, '<error>', '</error>');
            if (errorResult) {
                if (messagesState.length > 0 && messagesState[messagesState.length - 1].type === 'error' && !errorResult.isComplete) {
                    // Update existing error message
                    updateLastMessage({ content: errorResult.content });
                } else if (errorResult.isComplete) {
                    if (!messagesState.length || messagesState[messagesState.length - 1].type !== 'error') {
                        // Add new error message
                        addMessage({
                            type: 'error',
                            content: errorResult.content
                        });
                    } else {
                        // Update existing error message
                        updateLastMessage({ content: errorResult.content });
                    }
                }

                if (errorResult.isComplete) {
                    setIsAnswerLoading(false);
                    setIsLoading(false);
                    setIsWebSocketActive(false);
                    return;
                }
            }

            // Process thinking section
            const thinkResult = extractContent(response, '<think>', '</think>');
            if (thinkResult) {
                const content = thinkResult.content;
                const { steps: newThoughts, citations: thinkingCitations } = extractThinkingSteps(content);

                if (newThoughts.length > 0) {
                    if (messagesState.length > 0 && messagesState[messagesState.length - 1].type === 'answer') {
                        // Update existing answer message
                        const lastMessage = messagesState[messagesState.length - 1];
                        const currentProgressText = lastMessage.progressText;

                        // Combine existing citations with new ones
                        const updatedCitations = [
                            ...(lastMessage.citations || []),
                            ...thinkingCitations
                        ];

                        updateLastMessage({
                            steps: newThoughts,
                            citations: updatedCitations,
                            progressText: currentProgressText || "Thinking..."
                        });
                    } else {
                        // Add new answer message with thinking steps
                        addMessage({
                            type: 'answer',
                            content: '',
                            steps: [...newThoughts],
                            progressText: "Thinking...",
                            citations: [...thinkingCitations]
                        });
                    }
                }

                if (thinkResult.isComplete) {
                    setThoughts(thinkResult.content);
                    if (messagesState.length > 0 && messagesState[messagesState.length - 1].type === 'answer') {
                        updateLastMessage({ progressText: "Thinking complete" });
                    }
                }
            }

            // Process answer section
            const answerResult = extractContent(response, '<answer>', '</answer>');
            if (answerResult) {
                const answerContent = answerResult.content;
                const citations: Citation[] = [];

                // Process citations in answer
                const processedContent = answerContent.replace(
                    /\[(\d+)\]\((.*?)::(.*?)\)/g,
                    (match, stepNum, fileKey, chunkText, offset) => {
                        citations.push({
                            id: `citation-${citations.length}`,
                            stepNumber: stepNum,
                            fileKey,
                            chunkText,
                            position: offset
                        });

                        return `@${stepNum}@`;
                    }
                );

                if (messagesState.length > 0 && messagesState[messagesState.length - 1].type === 'answer') {
                    // Update existing answer message
                    updateLastMessage({
                        content: processedContent,
                        citations: citations
                    });
                } else {
                    // Add new answer message
                    addMessage({
                        type: 'answer',
                        content: processedContent,
                        steps: [],
                        citations
                    });
                }

                if (answerResult.isComplete) {
                    setIsAnswerLoading(false);
                }
            }

            setIsLoading(false);
        }
    }, [searchResult]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);


    const SourcesList: React.FC<{ sources: Record<string, any> }> = ({ sources }) => {
        return (
            <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2 dark:text-white">Sources</h3>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(sources).map(([key, value], index) => (
                        <Card
                            key={index}
                            className="p-2 inline-block cursor-pointer hover:bg-gray-50 transition-colors dark:bg-darkbg border select-none"
                            onClick={() => handleSourceCardClick(value)}

                        >
                            <CardContent className="p-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-600 dark:text-white" />
                                    <span className="text-sm text-blue-500 dark:text-white select-none">
                                        {key.length > 20

                                            ? `${key.slice(0, key.length / 2)} ${key.slice(key.length / 2)}`
                                            : key}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    const adjustHeight = () => {
        const textarea = textareaRef.current as HTMLTextAreaElement;
        if (!textarea) return;

        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    };

    useEffect(() => {
        adjustHeight();
    }, [inputValue]);











    const renderAnswerHeader = () => (
        <div className='flex flex-row gap-2 items-center mb-3'>
            <object
                type="image/svg+xml"
                data={isAnswerLoading ? loadingAnimation.src : staticImage.src}
                className="h-6 w-6"
            >
                svg-animation
            </object>
            <h1 className='dark:text-white font-semibold'>Answer</h1>
        </div>
    );

    const handleClearChat = () => {
        clearMessages();
        setSearchResult(null);
        setInThoughts(true);
        setInAnswer(false);
        setInSource(false);
        setGeneratingSources(false);
        setIsGeneratingComplete(false);
        setCurrentThreadId('');
        setStepsTaken([]);
        setThoughts('');
        setIsWebSocketActive(false);
        setIsLoading(false);
        resetAccordionValues(); // Use this instead of setAccordionValues({})
        setIsAnswerLoading(false);
        setShowRetry(false);
    };

    const handleChatHistorySelect = (messages: any[]) => {
        const formattedMessages = messages.map(msg => {
            if (msg.role === 'user') {
                return {
                    type: 'question' as const,
                    content: msg.content,
                    timestamp: msg.timestamp
                };
            } else {
                const content = msg.content;
                let parsedMessage: Message = {
                    type: 'answer' as const,
                    content: '',
                    steps: []
                };


                const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
                if (thinkMatch) {
                    const thinkContent = thinkMatch[1];
                    let currentStepNumber = 0;
                    let currentStep: ThoughtStep | null = null;
                    const steps: ThoughtStep[] = [];
                    const lines = thinkContent.split('\n');

                    for (const line of lines) {
                        const stepMatch = line.match(/^(\d+)\.\s+(.*)/);

                        if (stepMatch) {
                            const number = parseInt(stepMatch[1]);
                            if (number === currentStepNumber + 1) {
                                currentStepNumber = number;
                                currentStep = {
                                    number: number,
                                    content: stepMatch[2]
                                };
                                steps.push(currentStep);
                            }
                        } else if (currentStep) {
                            if (line.trim() || line === '') {

                                currentStep.content += '\n' + line;
                            }
                        }
                    }

                    parsedMessage.steps = steps;
                }

                // Extract answer section with preserved formatting
                const answerMatch = content.match(/<answer>([\s\S]*?)<\/answer>/);
                if (answerMatch) {
                    const answerContent = answerMatch[1];

                    // Parse citations
                    const citations: Citation[] = [];
                    const citationRegex = /\[(\d+)\]\((.*?)::(.*?)\)/g;
                    let match;

                    // Create a copy of the content to work with
                    let processedContent = answerContent;

                    // Find all citations
                    while ((match = citationRegex.exec(answerContent)) !== null) {
                        citations.push({
                            stepNumber: match[1],
                            fileKey: match[2],
                            chunkText: match[3],
                            id: `citation-${citations.length}`,
                            position: match.index
                        });
                    }

                    processedContent = processedContent.replace(
                        /\[(\d+)\]\((.*?)::(.*?)\)/g,
                        (_: any, stepNum: any) => `@${stepNum}@`
                    );

                    parsedMessage.content = processedContent
                        .replace(/\r\n/g, '\n')
                        .trim();
                    parsedMessage.citations = citations;
                }

                return parsedMessage;
            }
        });

        setMessagesState(formattedMessages);
        setShowChatHistory(false);
    };
    const renderChatHistoryButton = () => (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChatHistory(true)}
            className="flex items-center gap-2"
        >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat History
        </Button>
    );

    const renderAdvancedSearch = () => {

        return (
            <div className="flex flex-col h-full overflow-none dark:bg-darkbg w-full max-w-full">
                <div className="absolute top-4 right-4 z-50">

                    <div className="flex flex-row gap-3 items-center p-2 backdrop-blur-sm rounded-lg">
                        <History
                            className="h-5 w-5 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                            onClick={() => setShowChatHistory(true)}
                        />
                        <ReceiptText
                            className="h-5 w-5 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                            onClick={() => setShowDetailsView(true)}
                        />
                        <PlusCircle
                            className="h-5 w-5 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                            onClick={handleClearChat}
                        />
                    </div>

                </div>
                <ScrollArea

                    className="flex-1 overflow-none w-full max-w-full px-4 [mask-image:linear-gradient(to_bottom,white_calc(100%-64px),transparent)]"
                >
                    <div className="w-full h-full px-2">
                        {renderedMessages}


                        {
                            showRetry && (
                                <div className="w-full flex items-center justify-start mb-6">
                                    <Button
                                        variant="outline"
                                        onClick={handleRetry}
                                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                        Retry last query
                                    </Button>
                                </div>
                            )
                        }

                    </div>




                </ScrollArea >

                <div className="px-4 bg-transparent">
                    {!permissionDetails?.canQueryEntireDataroom ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="opacity-50 cursor-not-allowed">
                                        <AIInputWithSearch
                                            onSubmit={queryAllDocuments}
                                            onFileSelect={(file) => {}}
                                            disabled={true}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Querying the dataroom is disabled
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <AIInputWithSearch
                            onSubmit={queryAllDocuments}
                            onFileSelect={(file) => {}}
                            disabled={isLoading}
                        />
                    )}

                </div>


            </div >
        );
    }


    const decodeUnicodeEscapes = (str: string) => {
        return str.replace(/\\u([a-fA-F0-9]{4})/g, (match, code) => {
            return String.fromCharCode(parseInt(code, 16));
        });
    };

    const renderFileDetails = () => (
        <>
            <ScrollArea>

                <div className="flex justify-between items-center mb-2 mt-2 dark:bg-darkbg px-4 pt-2 max-w-full">
                    <div className="flex items-center gap-2">
                        <BadgeInfo className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <h2 className="text-base font-semibold dark:text-white">File Details</h2>

                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => setShowDetailsView(false)}
                        className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 h-8 w-8 p-0"
                    >
                        <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </Button>
                </div>
                {selectedFile && (
                    <div className="px-4 py-2 space-y-4">
                        {/* File Type */}
                        <div className="flex flex-row gap-2 items-center">
                            <h4 className="text-sm font-medium flex flex-row items-center gap-2 dark:text-white">
                                <FileText className="h-4 w-4" />
                                File Type
                            </h4>
                            <span className="px-2 py-1 text-xs rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {selectedFile.name ? selectedFile.name.split('.').pop()?.toUpperCase() || 'Unknown' : 'Unknown'}
                            </span>
                        </div>

                        {/* Size */}
                        <div className="flex flex-row gap-2 items-center">
                            <h4 className="text-sm font-medium flex items-center gap-2 dark:text-white">
                                <Database className="h-4 w-4" />
                                Size
                            </h4>
                            <span className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {selectedFile.size || 'Unknown'}
                            </span>
                        </div>

                        {/* Upload Information */}
                        <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2 dark:text-white">
                                <User className="h-4 w-4" />
                                Upload Information
                            </h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px]">
                                        Uploaded By:
                                    </span>
                                    <span className="text-xs text-gray-700 dark:text-gray-300">
                                        {selectedFile.uploadedBy || 'Unknown'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[80px]">
                                        Upload Date:
                                    </span>
                                    <span className="text-xs text-gray-700 dark:text-gray-300">
                                        {new Date(selectedFile.lastModified).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        {selectedFile.tags && (
                            <div>
                                <h4 className="text-sm font-medium flex items-center gap-2 mb-2 dark:text-white">
                                    <Tags className="h-4 w-4" />
                                    Document Tags
                                </h4>
                                <TagDisplay tags={selectedFile.tags} />
                            </div>
                        )}

                        {/* Summary */}
                        <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2 dark:text-white">
                                <AlignLeft className="h-4 w-4" />
                                Summary
                            </h4>
                            <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                                {selectedFile.summary ?
                                    decodeUnicodeEscapes(selectedFile.summary?.slice(1, -1)) :
                                    'No summary available'
                                }
                            </div>
                        </div>
                    </div>
                )}


                {!selectedFile && (
                    <div className="flex flex-col items-center justify-center p-4 mt-4 text-center">
                        <div className="flex items-center justify-center mb-2 text-gray-400 dark:text-gray-500">
                            <BadgeInfo className="h-6 w-6 mr-2" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No file has been selected
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Select a file to view its details
                        </p>
                    </div>
                )}
            </ScrollArea>
        </>
    );
    return (
        <ScrollArea className="h-full ">
            <div className="flex flex-col gap-2 overflow-auto h-screen">

                {showChatHistory ? (
                    <ChatHistoryPanel
                        bucketId={bucketUuid}
                        onThreadSelect={handleChatHistorySelect}
                        onBack={() => setShowChatHistory(false)}
                    />
                ) : (
                    (showDetailsView) ? renderFileDetails() : renderAdvancedSearch()
                )}


            </div>
        </ScrollArea>

    );

};



export default DetailSection;