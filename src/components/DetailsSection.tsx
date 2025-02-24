import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, BadgeInfo, FileText, Footprints, Plus, PlusCircle, Search, MessageSquare, ReceiptText, SearchIcon, Database, User, Tags, AlignLeft, History, Copy } from 'lucide-react';
import { Input, Skeleton } from '@mui/material';
import { Button } from './ui/button';
import { post, get } from 'aws-amplify/api';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Card, CardContent } from './ui/card';
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
import '../components/temp.css';
import loadingAnimation from './../app/assets/fynopsis_animated.svg'
import staticImage from './../app/assets/fynopsis_static.svg'
import { Separator } from './ui/separator';
import { usePathname } from 'next/navigation';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { TextShimmer } from './ui/text-shimmer';
import { AIInputWithSearch } from './ui/ai-input-with-search';
import { useS3Store } from './fileService';
import { useFileStore } from './HotkeyService';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { TagDisplay } from './TagsHover';
import reactStringReplace from "react-string-replace";

import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ContainerScroll } from './ui/container-scroll-animation';


// import { w3cwebsocket as W3CWebSocket } from "websocket";
// import { Signer } from '@aws-amplify/core';

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
}

interface DetailsSectionProps {

    onFileSelect: (file: FileSelectProps) => void; // Changed type
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
        // console.log("The identity id:", identityId);
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
        // console.log('DetailSection - Received table data:', tableData);
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
    const [messageBuffer, setMessageBuffer] = useState('');
    const [sourceUrls, setSourceUrls] = useState<string[]>([]);
    const [currentThreadId, setCurrentThreadId] = useState<string>('');
    const [isAnswerLoading, setIsAnswerLoading] = useState(false);
    const [isWebSocketActive, setIsWebSocketActive] = useState(false);
    const [showChatHistory, setShowChatHistory] = useState(false);
    const getFileName = useFileStore(state => state.getFileName);
    const getFile = useFileStore(state => state.getFile);
    const [lastQuery, setLastQuery] = useState<string>('');
    const [showRetry, setShowRetry] = useState(false);
    const [progressText, setProgressText] = useState('');
    const [endThinkFound, setEndThinkFound] = useState(false);
    const [isClickProcessing, setIsClickProcessing] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [messageState, setMessageState] = useState<MessageState>({
        messages: [],
        isProcessing: false,
        progressText: '',
        currentSteps: []
    });

    const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
        setMessageState(prev => ({
            ...prev,
            messages: updater(prev.messages)
        }));
    }, []);


    useEffect(() => {
        console.log("DetailSection mounted with showDetailsView:", showDetailsView);
    }, []);
    // Add selector for S3Store
    const s3Objects = useS3Store(state => state.objects);

    const handleSourceCardClick = async (sourceUrl: string) => {
        // console.log('DetailSection - Source clicked:', sourceUrl);
        const bucketUuid = window.location.pathname.split('/')[2] || '';
        if (isClickProcessing) return;
        setIsClickProcessing(true);
        console.log("click processing", sourceUrl);

        try {
            // First check if file exists in s3Objects
            // console.log('DetailSection - Found S3 object:', s3Object);

            // Get the signed URL
            const id = sourceUrl.split('/').pop();
            console.log("selected files!!!!!", sourceUrl);
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
                });
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

    // Helper function to format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
    };

    const addOn = getUserPrefix();
    const S3_BUCKET_NAME = `vdr-documents/${addOn}`;
    const REGION = 'us-east-1';




    const getS3Client = async () => {
        try {
            const { credentials } = await fetchAuthSession();

            if (!credentials) {
                throw new Error('No credentials available');
            }

            return new S3Client({
                region: REGION,
                credentials: {
                    accessKeyId: credentials.accessKeyId,
                    secretAccessKey: credentials.secretAccessKey,
                    sessionToken: credentials.sessionToken
                }
            });
        } catch (error) {
            console.error('Error getting credentials:', error);
            throw error;
        }
    };


    const getPresignedUrl = async (s3Key: string) => {
        try {

            // console.log("Waiting on s3 client");

            const s3Client = await getS3Client();

            // console.log("Got the s3 client");
            const command = new GetObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: s3Key
            });

            return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        } catch (error) {
            // console.error('Error generating signed URL:', error);
            throw error;
        }
    };


    const handleOpenSource = async (sourceKey: string, sourceName: string) => {
        try {
            setLoadingSource(sourceKey);
            const url = await getPresignedUrl(sourceKey);
            // console.log('Presigned URL from details:', url);
            onFileSelect({
                id: `file-${sourceKey}`,
                name: sourceName,
                s3Url: url,
                parentId: '',
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
            });
        } catch (error) {
            // console.error('Error getting presigned URL:', error);
            setError('Failed to open source document. Please try again.');
        } finally {
            setLoadingSource(null);
        }
    };

    const extractSourceInfo = (source: any): { key: string; name: string; descriptions?: string[] } | null => {
        // Handle object with array of descriptions
        if (typeof source === 'object' && !Array.isArray(source)) {
            const [key, descriptions] = Object.entries(source)[0];
            return {
                key,
                name: key.split('/').pop() || 'document',
                descriptions: Array.isArray(descriptions) ? descriptions : undefined
            };
        }

        // Fallback for simple string source
        if (typeof source === 'string') {
            return {
                key: source,
                name: source.split('/').pop() || 'document'
            };
        }

        return null;
    };

    const renderSourceButton = (source: any) => {
        const sourceInfo = extractSourceInfo(source);
        if (!sourceInfo) return null;

        return (
            <Button
                variant="outline"
                size="sm"
                className="mt-2 flex items-center gap-2"
                onClick={() => handleOpenSource(sourceInfo.key, sourceInfo.name)}
                onDoubleClick={() => null}
                disabled={loadingSource === sourceInfo.key}
            >
                <FileText size={16} />
                <span>
                    {loadingSource === sourceInfo.key ? 'Opening...' : 'Open Source Document'}
                </span>
            </Button>
        );
    };



    const AnimatedProgressText: React.FC<{ text: string }> = ({ text }) => {
        return (
            <div className="relative h-6 overflow-hidden w-full flex items-center justify-start">
                <div
                    key={text}
                    className="w-full  flex justify-start "
                >
                    {text === "Thinking complete" ? (
                        <span className="text-xs">
                            {text}
                        </span>
                    ) : (
                        <TextShimmer className="text-xs text-left">
                            {text}
                        </TextShimmer>
                    )}

                </div>
            </div>
        );
    };


    const queryAllDocuments = async (searchTerm: string, withReasoning: boolean, selectedFiles: any[]) => {
        console.log("selected files!!!!!", selectedFiles);
        console.log("BRLRLLELWFLLEFLW");
        setLastQuery(searchTerm); // Add this line at the start of the function

        try {
            setIsWebSocketActive(true);
            setIsLoading(true);

            // Only add question message if it's not a retry (i.e., if the last message isn't already this question)
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || lastMessage.type !== 'question' || lastMessage.content !== searchTerm) {
                setMessages(prev => [...prev, { type: 'question', content: searchTerm }]);
            }

            setSearchResult({
                response: '',
                sources: {},
                thread_id: ''
            });
            const bucketUuid = window.location.pathname.split('/')[2] || '';
            const websocketHost = `${process.env.NEXT_PUBLIC_SEARCH_API_CODE}.execute-api.${process.env.NEXT_PUBLIC_REGION}.amazonaws.com`;

            const idToken = await getIdToken();
            if (!idToken) {
                throw new Error('No ID token available');
            }

            const params = new URLSearchParams();
            params.append('idToken', idToken);

            const websocketUrl = `wss://${websocketHost}/prod?${params.toString()}`;

            // Debug URL
            // console.log('WebSocket URL components:', {
            // host: websocketHost,
            // params: Object.fromEntries(params.entries()),
            // fullUrl: websocketUrl
            // });

            const ws = new WebSocket(websocketUrl);

            let result = '';

            const extractSourceKeys = (sources: Record<string, any>) => {
                return Object.keys(sources).filter(key =>
                    // Filter out non-source properties like 'thread_id' and 'type'
                    key !== 'thread_id' &&
                    key !== 'type' &&
                    !key.startsWith('[[')
                );
            };

            return new Promise((resolve, reject) => {
                ws.onopen = () => {
                    console.log('WebSocket connected successfully');
                    // Send query once connected




                    if (currentThreadId) {
                        ws.send(JSON.stringify({
                            action: 'query',
                            data: {
                                thread_id: currentThreadId,
                                collection_name: bucketUuid,
                                query: searchTerm,
                                use_reasoning: withReasoning,
                                file_keys: selectedFiles
                            }
                        }));
                    }
                    else {
                        ws.send(JSON.stringify({
                            action: 'query',
                            data: {
                                collection_name: bucketUuid,
                                query: searchTerm,
                                use_reasoning: withReasoning,
                                file_keys: selectedFiles
                            }
                        }));
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log("data:", data);
                        if (data.type === 'progress') {
                            const progressText = data.step || data.message;
                            setProgressText(progressText);
                            setEndThinkFound(false);

                            // Update messages with progress
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;

                                if (lastMessage?.type === 'answer') {
                                    // Only update if progress text has changed
                                    if (lastMessage.progressText !== progressText) {
                                        lastMessage.progressText = progressText;
                                        return newMessages;
                                    }
                                    return prev;
                                } else {
                                    // Create new answer message with progress
                                    return [...prev, {
                                        type: 'answer',
                                        content: '',
                                        progressText: progressText
                                    }];
                                }
                            });
                        }
                        if (data.type === 'status') {
                            if (data.sources) {
                                setIsThinking(true);
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;

                                    if (lastMessage?.type === 'answer') {
                                        // Initialize sourcingSteps array if it doesn't exist
                                        lastMessage.sourcingSteps = lastMessage.sourcingSteps || [];
                                        // Add new step to the array
                                        lastMessage.sourcingSteps.push(data.message);
                                        lastMessage.progressText = "Generating sources...";

                                        if (data.sources) {
                                            lastMessage.subSources = {};
                                            // Extract source keys directly from data.sources
                                            const keys = Object.keys(data.sources).filter(key => key !== '[[Prototype]]');
                                            console.log("keys:", keys);
                                            keys.forEach(key => {
                                                let id = key.split('/').pop();
                                                const final_id = id?.split("::")[0];
                                                console.log("final_id:", final_id);

                                                const fileName = id ? getFileName(final_id ?? "") : undefined;
                                                if (fileName && lastMessage?.subSources) {
                                                    lastMessage.subSources[fileName] = key;
                                                }
                                            });
                                            // Object.keys(data.sources).forEach(sourceKey => {
                                            //     // Filter out non-source keys
                                            //     if (sourceKey !== 'thread_id' && 
                                            //         sourceKey !== 'type' && 
                                            //         !sourceKey.startsWith('[[')) {
                                            //         const id = sourceKey.split('/').pop();
                                            //         const fileName = id ? getFileName(id) : undefined;
                                            //         if (fileName) {
                                            //             if (!lastMessage.subSources) {
                                            //                 lastMessage.subSources = {};
                                            //             }
                                            //             lastMessage.subSources[fileName] = sourceKey;
                                            //         }
                                            //     }
                                            // });
                                        }
                                    }
                                    return newMessages;
                                });
                            }
                        }
                        if (data.type === 'response') {

                            if (data.thread_id) {
                                setCurrentThreadId(data.thread_id);
                            }




                            setSearchResult(prevResult => ({
                                response: (prevResult?.response || '') + data.response,
                                sources: data.sources || {},
                                thread_id: data.thread_id || ''
                            }));

                        }

                        if (data.type === 'complete') {
                            setIsWebSocketActive(false);
                            setIsLoading(false);
                        }
                    } catch (error) {
                        console.error('Error processing message:', error);
                        setIsWebSocketActive(false);
                        setIsLoading(false);
                    }
                };

                ws.onerror = (error) => {
                    setIsWebSocketActive(false);
                    setIsLoading(false);
                    setShowRetry(true);
                    console.error('WebSocket Error Details:', {
                        error,
                        url: websocketUrl.substring(0, 100) + '...',
                        timestamp: new Date().toISOString()
                    });
                    reject(new Error('WebSocket connection failed'));
                };




                ws.onclose = (event) => {
                    setIsWebSocketActive(false);
                    setIsLoading(false);
                    // console.log('WebSocket closed:', {
                    // code: event.code,
                    // reason: event.reason,
                    // wasClean: event.wasClean
                    // });
                };
            });

        } catch (err) {
            setIsWebSocketActive(false);
            console.log("selected files!!!!!", selectedFiles);
            console.log("BRLRLLELWFLLEFLW");

            console.error('Error querying collection:', err);
            setError('Failed to fetch search results. Please try again.');
            setIsLoading(false);
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
    const [userSearch, setUserSearch] = useState('');

    interface InputChangeEvent extends React.ChangeEvent<HTMLTextAreaElement> { }

    const handleInputChange = (e: InputChangeEvent) => {
        const textarea = e.target;
        setInputValue(e.target.value);

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set new height based on scrollHeight
        textarea.style.height = `${textarea.scrollHeight}px`;
    }



    const [messages, setMessages] = useState<Message[]>([]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            setIsLoading(true);
            const query = inputValue.trim();

            // queryAllDocuments(query);
            // // handleSearch(query);
            setInputValue('');
        }
    };


    const [inThoughts, setInThoughts] = useState(true);
    const [inAnswer, setInAnswer] = useState(false);
    const [inSource, setInSource] = useState(false);
    const [generatingSources, setGeneratingSources] = useState(false);
    const [isGeneratingComplete, setIsGeneratingComplete] = useState(false);

    const [stepsTaken, setStepsTaken] = useState<ThoughtStep[]>([]); const [thoughts, setThoughts] = useState('');
    const pathname = usePathname();
    const bucketUuid = pathname?.split('/')[2] || '';

    const [accordionValue, setAccordionValue] = useState<string>("steps");
    const [accordionValues, setAccordionValues] = useState<{ [key: string]: string }>({});



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
                        options={{
                            overrides: {
                                circle: {
                                    component: ({
                                        "data-number": number,
                                        "data-filekey": fileKey
                                    }: {
                                        "data-number": string;
                                        "data-filekey": string;
                                    }) => (
                                        <GreenCircle
                                            number={number}
                                            fileKey={fileKey}
                                            onSourceClick={handleSourceClick}
                                        />
                                    ),
                                },
                            },
                        }}
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
        await queryAllDocuments(lastQuery, true, []);
    };




    useEffect(() => {
        if (searchResult && searchResult.response) {
            setIsAnswerLoading(true); // Start loading when processing begins
            let response = searchResult.response;
            console.log("repsonse:", searchResult);
            if (searchResult.response.includes("</think>")) {
                setEndThinkFound(true);

            }

            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;
                let messageUpdated = false;

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

                 const extractThinkingSteps = (content: string): ThoughtStep[] => {
                const steps: ThoughtStep[] = [];
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
                            currentStep = {
                                number,
                                content: stepMatch[2]
                            };
                            steps.push(currentStep);
                        } else if (currentStep) {
                            // If number doesn't follow sequence, treat as regular content
                            currentStep.content += '\n' + line;
                        }
                    } else if (currentStep) {
                        // Add non-step lines to current step's content
                        currentStep.content += '\n' + line;
                    }
                }

                return steps;
            };

                const errorResult = extractContent(response, '<error>', '</error>');
                if (errorResult) {
                    if (lastMessage?.type === 'error' && !errorResult.isComplete) {
                        lastMessage.content = errorResult.content;
                        messageUpdated = true;
                    } else if (errorResult.isComplete) {
                        if (!lastMessage || lastMessage.type !== 'error') {
                            newMessages.push({
                                type: 'error',
                                content: errorResult.content
                            });
                            messageUpdated = true;
                        } else {
                            lastMessage.content = errorResult.content;
                            messageUpdated = true;
                        }
                    }

                    if (errorResult.isComplete) {
                        setIsAnswerLoading(false);
                        setIsLoading(false);
                        setIsWebSocketActive(false);
                        return newMessages;
                    }
                }

                // Process thinking section
                const thinkResult = extractContent(response, '<think>', '</think>');
                if (thinkResult) {
                    const content = thinkResult.content;
                    const newThoughts = extractThinkingSteps(content);

                    if (newThoughts.length > 0) {
                        if (lastMessage?.type === 'answer') {
                            const currentProgressText = lastMessage.progressText;
                            lastMessage.steps = [...newThoughts];
                            if (!currentProgressText) {
                                lastMessage.progressText = "Thinking...";
                            }
                            messageUpdated = true;
                        } else {
                            newMessages.push({
                                type: 'answer',
                                content: '',
                                steps: [...newThoughts],
                                progressText: "Thinking..."
                            });
                            messageUpdated = true;
                        }
                    }

                    if (thinkResult.isComplete) {
                        setThoughts(thinkResult.content);
                        if (lastMessage?.type === 'answer') {
                            lastMessage.progressText = "Thinking complete";
                            messageUpdated = true;
                        }
                    }
                }

                const answerResult = extractContent(response, '<answer>', '</answer>');
            if (answerResult) {
                const answerContent = answerResult.content;
                const citations: Citation[] = [];
                
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

                if (lastMessage?.type === 'answer') {
                    lastMessage.content = processedContent;
                    lastMessage.citations = citations;
                    messageUpdated = true;
                } else {
                    newMessages.push({
                        type: 'answer',
                        content: processedContent,
                        steps: [],
                        citations
                    });
                    messageUpdated = true;
                }

                if (answerResult.isComplete) {
                    setIsAnswerLoading(false);
                }
            }

               

                return messageUpdated ? newMessages : prev;
            });




            // const extractContent = (text: string, startTag: string, endTag: string) => {
            //     const startIndex = text.indexOf(startTag);
            //     const endIndex = text.indexOf(endTag);
            //     if (startIndex === -1) return null;

            //     // If we have start tag but no end tag, return all content after start tag
            //     if (endIndex === -1) {
            //         return {
            //             content: text.substring(startIndex + startTag.length),
            //             remaining: '',
            //             isComplete: false
            //         };
            //     }

            //     // Make sure we include the end tag in the removal
            //     const content = text.substring(startIndex + startTag.length, endIndex).trim();
            //     const remaining = text.substring(endIndex + endTag.length).trim();
            //     return { content, remaining, isComplete: true };
            // };

            // // Process error section first since it takes precedence
            // const errorResult = extractContent(response, '<error>', '</error>');
            // if (errorResult) {
            //     setMessages(prev => {
            //         const newMessages = [...prev];
            //         const lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;

            //         if (lastMessage?.type === 'error' && !errorResult.isComplete) {
            //             // Update existing error message
            //             lastMessage.content = errorResult.content;
            //         } else if (errorResult.isComplete) {
            //             // Only add new error message if we have complete content
            //             // and last message wasn't an error
            //             if (!lastMessage || lastMessage.type !== 'error') {
            //                 newMessages.push({
            //                     type: 'error',
            //                     content: errorResult.content
            //                 });
            //             } else {
            //                 // Update existing error with complete content
            //                 lastMessage.content = errorResult.content;
            //             }
            //         }
            //         return newMessages;
            //     });

            //     if (errorResult.isComplete) {
            //         // Only update response if we have a complete error tag
            //         response = errorResult.remaining;
            //     }

            //     // If we have an error (complete or not), stop processing
            //     setIsAnswerLoading(false); // Stop loading on error
            //     setIsLoading(false);
            //     setIsWebSocketActive(false);
            //     return;
            // }

            // const extractThinkingSteps = (content: string): ThoughtStep[] => {
            //     const steps: ThoughtStep[] = [];
            //     let currentStepNumber = 0;
            //     let currentStep: ThoughtStep | null = null;

            //     // Split content into lines while preserving original formatting
            //     const lines = content.split('\n');

            //     for (const line of lines) {
            //         // Check if line starts with a number followed by a period
            //         const stepMatch = line.match(/^(\d+)\.\s+(.*)/);

            //         if (stepMatch) {
            //             const number = parseInt(stepMatch[1]);
            //             // Only create new step if it's exactly one more than the previous step
            //             if (number === currentStepNumber + 1) {
            //                 currentStepNumber = number;
            //                 currentStep = {
            //                     number,
            //                     content: stepMatch[2]
            //                 };
            //                 steps.push(currentStep);
            //             } else if (currentStep) {
            //                 // If number doesn't follow sequence, treat as regular content
            //                 currentStep.content += '\n' + line;
            //             }
            //         } else if (currentStep) {
            //             // Add non-step lines to current step's content
            //             currentStep.content += '\n' + line;
            //         }
            //     }

            //     return steps;
            // };


            // // Process thinking section
            // const thinkResult = extractContent(response, '<think>', '</think>');
            // if (thinkResult) {
            //     const content = thinkResult.content;
            //     const newThoughts = extractThinkingSteps(content);
            //     console.log("NEW THOUGHTS:", newThoughts);
            //     if (newThoughts.length > 0) {
            //         // setStepsTaken(prev => {
            //         //     // Filter out duplicates and only add new steps
            //         //     const currentNumbers = prev.map(step => step.number);
            //         //     const uniqueNewThoughts = newThoughts.filter(thought =>
            //         //         !currentNumbers.includes(thought.number)
            //         //     );

            //         //     // Combine existing and new steps, sort by number
            //         //     const combinedSteps = [...prev, ...uniqueNewThoughts]
            //         //         .sort((a, b) => a.number - b.number);

            //         //     return combinedSteps;
            //         // });

            //         // Update message with all current steps
            //         setMessages(prev => {
            //             const newMessages = [...prev];
            //             const lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;

            //             if (lastMessage?.type === 'answer') {
            //                 // Preserve the existing progressText
            //                 const currentProgressText = lastMessage.progressText;
            //                 lastMessage.steps = [...newThoughts];
            //                 // Only set progressText if it doesn't exist
            //                 if (!currentProgressText) {
            //                     lastMessage.progressText = "Thinking...";
            //                 }
            //             } else {
            //                 newMessages.push({
            //                     type: 'answer',
            //                     content: '',
            //                     steps: [...newThoughts],
            //                     progressText: "Thinking..."
            //                 });
            //             }
            //             return newMessages;
            //         });
            //     }

            //     if (thinkResult.isComplete) {
            //         setThoughts(thinkResult.content);
            //         // Update the progress text only when thinking is complete
            //         setMessages(prev => {
            //             const newMessages = [...prev];
            //             const lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;
            //             if (lastMessage?.type === 'answer') {
            //                 lastMessage.progressText = "Thinking complete";
            //             }
            //             return newMessages;
            //         });
            //         const currentMessageIndex = messages.length - 1;

            //         // Close the specific accordion after 500ms
            //         setTimeout(() => {
            //             setAccordionValues(prev => ({
            //                 ...prev,
            //                 [`accordion-${currentMessageIndex}`]: '' // Empty string closes the accordion
            //             }));
            //         }, 500);
            //     }
            // }

            // // Process answer section
            // // Process answer section
            // const answerResult = extractContent(response, '<answer>', '</answer>');
            // if (answerResult) {
            //     setMessages(prev => {
            //         const newMessages = [...prev];
            //         const lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;

            //         if (lastMessage?.type === 'answer') {
            //             // Parse citations from the answer content
            //             const answerContent = answerResult.content;
            //             const citations: Citation[] = [];

            //             // Extract citations while maintaining the original content structure
            //             const processedContent = answerContent.replace(
            //                 /\[(\d+)\]\((.*?)::(.*?)\)/g,
            //                 (match, stepNum, fileKey, chunkText, offset) => {
            //                     citations.push({
            //                         id: `citation-${citations.length}`,
            //                         stepNumber: stepNum,
            //                         fileKey,
            //                         chunkText,
            //                         position: offset
            //                     });
            //                     return `@${stepNum}@`; // New citation format
            //                 }
            //             );

            //             // Update the message with processed content and citations
            //             lastMessage.content = processedContent;
            //             lastMessage.citations = citations;
            //             console.log("last message:", lastMessage);
            //         } else {
            //             // Create new answer message if none exists
            //             const citations: Citation[] = [];
            //             const processedContent = answerResult.content.replace(
            //                 /\[(\d+)\]\((.*?)::(.*?)\)/g,
            //                 (match, stepNum, fileKey, chunkText, offset) => {
            //                     citations.push({
            //                         id: `citation-${citations.length}`,
            //                         stepNumber: stepNum,
            //                         fileKey,
            //                         chunkText,
            //                         position: offset
            //                     });
            //                     return `@${stepNum}@`;
            //                 }
            //             );

            //             newMessages.push({
            //                 type: 'answer',
            //                 content: processedContent,
            //                 steps: [],
            //                 citations
            //             });
            //         }
            //         return newMessages;
            //     });

            //     if (answerResult.isComplete) {
            //         setIsAnswerLoading(false);
            //         response = answerResult.remaining;
            //     }
            // }

            // // Handle streaming content that's not within any tags
            // if (!thinkResult && !answerResult && response.trim()) {
            //     setMessages(prev => {
            //         const newMessages = [...prev];
            //         if (newMessages.length > 0 && newMessages[newMessages.length - 1].type === 'answer') {
            //             newMessages[newMessages.length - 1].content += response.trim();
            //         }
            //         return newMessages;
            //     });
            // }

            setIsLoading(false);
        }
    }, [searchResult, bucketUuid]);

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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
            inline: "nearest"
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, searchResult]);

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
        setMessages([]);
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
        setAccordionValues({}); // Reset accordion values
        setIsAnswerLoading(false);
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

        setMessages(formattedMessages);
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

                    <div className="flex flex-row gap-3 items-center">
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
                    className="flex-1 overflow-none w-full max-w-full  px-4 [mask-image:linear-gradient(to_bottom,white_calc(100%-64px),transparent)]"
                >
                    <div className="w-full h-full">
                        {messages.map((message, index) => (
                            <div key={index} className="flex flex-col gap-0 mb-4 pl-2 max-w-full w-full" >
                                {message.type === 'question' ? (
                                    <div className={`flex items-end dark:text-white mt-4 ${index === messages.length - 1 ? 'mb-8' : ''}`}>
                                        <p className="text-2xl font-medium dark:text-white pr-4 rounded-lg w-[70%]">{message.content}</p>
                                    </div>
                                ) : message.type === 'error' ? (
                                    <div className="w-full">
                                        <div className="mr-auto mb-6 rounded-lg bg-red-50 dark:bg-red-900/10 p-4">
                                            <div className='flex flex-row gap-2 items-center mb-3'>
                                                <BadgeInfo className="h-5 w-5 text-red-500" />
                                                <h1 className='text-red-500 font-semibold'>Error</h1>
                                            </div>
                                            <ReactMarkdown className="text-wrap text-sm pr-4 text-red-600 dark:text-red-400 leading-7">
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`w-full gap-0 max-w-full ${index === messages.length - 1 ? 'mb-8' : ''}`}>
                                        {((message.steps && message.steps.length > 0) || (message.progressText)) && (
                                            <div className="w-full pr-4 pb-0">
                                                <Accordion
                                                    type="single"
                                                    collapsible
                                                    value={accordionValues[`accordion-${index}`] || ''} // Use unique key for each accordion
                                                    onValueChange={(value) => {
                                                        setAccordionValues(prev => ({
                                                            ...prev,
                                                            [`accordion-${index}`]: value
                                                        }));
                                                    }}
                                                    className="w-full -space-y-px mb-2"
                                                >

                                                    <AccordionItem
                                                        value="steps"
                                                        className="border bg-background px-4 py-1 rounded-lg dark:bg-darkbg dark:border-slate-800 w-full"
                                                    >
                                                        <AccordionTrigger className="py-1 text-[15px] leading-6 hover:no-underline dark:text-slate-400 flex items-center justify-center">
                                                            <div className="flex flex-row gap-2 items-center w-full justify-between pr-2">
                                                                <div className="flex flex-row gap-2 items-center">
                                                                    <SearchIcon className="h-4 w-4 text-gray-500" />
                                                                    <h1>Pro Search</h1>
                                                                </div>
                                                                <h1 className="text-sm font-light">{message.steps?.length || 0} steps</h1>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pb-2 pt-2 text-muted-foreground w-full">
                                                            {message.progressText && (
                                                                <Accordion
                                                                    type="single"
                                                                    collapsible
                                                                    value={accordionValues[`progress-${index}`] || ''}
                                                                    onValueChange={(value) => {
                                                                        setAccordionValues(prev => ({
                                                                            ...prev,
                                                                            [`progress-${index}`]: value
                                                                        }));
                                                                    }}
                                                                    className="w-full mb-3"
                                                                >
                                                                    <AccordionItem
                                                                        value="progress"
                                                                        className="border-none bg-slate-50 dark:bg-slate-800/50 rounded-md w-full"
                                                                    >
                                                                        <AccordionTrigger className="py-2 px-3 text-xs hover:no-underline">
                                                                            <AnimatedProgressText text={message.progressText || 'giiii'} />
                                                                            {/* <span className = "text-left">
                                                                                {message.progressText}
                                                                            </span> */}
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="px-3 pb-2 w-full overflow-hidden">
                                                                            {message.sourcingSteps && message.sourcingSteps.length > 0 ? (
                                                                                <div className="space-y-2 w-full ">
                                                                                    {message.sourcingSteps.map((step, index) => (
                                                                                        <div key={index} className="space-y-1 w-full">
                                                                                            <div
                                                                                                className="w-full animate-slide-down" // Added animation class
                                                                                                style={{
                                                                                                    animation: 'slideDown 0.3s ease-out forwards'
                                                                                                }}
                                                                                            >
                                                                                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                                                                                    {step}
                                                                                                </div>

                                                                                                {/* Show subSources for first step (index 0) */}
                                                                                                {index === 0 && message.subSources && (
                                                                                                    <div className="w-full overflow-hidden">
                                                                                                        <div className="flex ite`ms-center space-x-2 p-2">
                                                                                                            {Object.entries(message.subSources).slice(0, 2).map(([fileName, fileKey]) => (
                                                                                                                <div
                                                                                                                    key={fileKey}
                                                                                                                    className="inline-flex shrink-0 items-center gap-2 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                                                                                                    onClick={() => handleSourceCardClick(fileKey as string)}
                                                                                                                    onDoubleClick={() => null}
                                                                                                                >
                                                                                                                    <FileText className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                                                                                                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                                                                                                                        {fileName}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                            {Object.keys(message.subSources).length > 2 && (
                                                                                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                                                                    +{Object.keys(message.subSources).length - 2} more
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>

                                                                                            {/* Show sources for second step (index 1) */}
                                                                                            {index === 1 && message.sources && (
                                                                                                <ScrollArea className="w-full whitespace-nowrap w-[400px]">
                                                                                                    <div className="flex space-x-2 p-2">
                                                                                                        {message.sources.map((source, idx) => (
                                                                                                            <div
                                                                                                                key={idx}
                                                                                                                className="inline-flex flex-col justify-between min-h-[80px] w-[200px] px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                                                                                                onClick={() => handleSourceCardClick(source.id)}
                                                                                                                onDoubleClick={() => null}
                                                                                                            >
                                                                                                                <div className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">
                                                                                                                    {source.chunkTitle}
                                                                                                                </div>
                                                                                                                <div className="flex items-center gap-2 mt-2">
                                                                                                                    <FileText className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                                                                                                                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                                                                                                        {getFileName(source.id.split('/').pop() || '')}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                    <ScrollBar orientation="horizontal" />
                                                                                                </ScrollArea>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-xs text-gray-500">No sourcing steps available</div>
                                                                            )}
                                                                        </AccordionContent>
                                                                    </AccordionItem>
                                                                </Accordion>
                                                            )}

                                                            {message.steps && message.steps.length > 0 ? (
                                                                message.steps.map((step, stepIndex) => (
                                                                    <div key={stepIndex} className="flex flex-row gap-2 items-center mb-2">
                                                                        <span className="text-xs text-gray-500">{step.number}.</span>
                                                                        <span className="text-xs text-gray-700 dark:text-gray-300 font-normal">
                                                                            {step.content}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-xs text-gray-500"></div>
                                                            )}
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>
                                            </div>
                                        )}

                                        {/* show source blocks here!!! */}
                                        {message.sources && message.sources.length > 0 && (
                                            <ScrollArea className="w-full whitespace-nowrap ">
                                                <div className="flex space-x-2 p-2 mb-4 ">
                                                    {message.sources.map((source, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="inline-flex flex-col justify-between min-h-[80px] w-[200px] px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                                            onClick={() => handleSourceCardClick(source.id)}
                                                        >
                                                            <div className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">
                                                                {source.chunkTitle}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <FileText className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                                                                <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                                                    {getFileName(source.id.split('/').pop() || '')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <ScrollBar orientation="horizontal" />
                                            </ScrollArea>
                                        )}

                                        <div className="mr-auto mb-6 rounded-lg">
                                            <AnswerWithCitations
                                                content={message.content}
                                                citations={message.citations || []}
                                            />

                                        </div>

                                        <div className="w-full flex items-center justify-center mt-4 "></div>
                                        {index !== messages.length - 1 && (
                                            <Separator className="bg-slate-200 dark:bg-slate-800 w-full" orientation='horizontal' />
                                        )}
                                    </div>
                                )
                                }

                            </div>
                        ))
                        }

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


                    <div ref={messagesEndRef} style={{ height: 0 }} /> {/* Add this line */}

                </ScrollArea >

                <div className="px-4 bg-transparent">
                    <AIInputWithSearch
                        onSubmit={queryAllDocuments}
                        onFileSelect={(file) => {
                            // console.log('Selected file:', file);
                        }}
                        disabled={isLoading}
                    />

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
                    <div>HELLOOO</div>
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