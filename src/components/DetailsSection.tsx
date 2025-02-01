import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, BadgeInfo, FileText, Footprints, Plus, PlusCircle, Search } from 'lucide-react';
import { Input, Skeleton } from '@mui/material';
import { Button } from './ui/button';
import { post, get } from 'aws-amplify/api';
import { ScrollArea } from './ui/scroll-area';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Card, CardContent } from './ui/card';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import ReactMarkdown from 'react-markdown';
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

// import { w3cwebsocket as W3CWebSocket } from "websocket";
// import { Signer } from '@aws-amplify/core';


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

interface DetailsSectionProps {
    showDetailsView: boolean;
    setShowDetailsView: (show: boolean) => void;
    selectedFile: any;
    onFileSelect: (file: FileSelectProps) => void;  // Changed type
    tableData: TableFile[];  // Add this prop
}

// Add new interface for onFileSelect properties
interface FileSelectProps {
    id: string;
    name: string;
    s3Url: string;
    type?: string;
    size?: string;
    status?: "success";
    date?: string;
    uploadedBy?: string;
    s3Key?: string;
    uploadProcess?: string;
    summary?: string;
    tags?: string[];
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
        console.log("The identity id:", identityId);
        return `${identityId}/`;
    } catch (error) {
        console.error('Error getting user prefix:', error);
        throw error;
    }
};




const DetailSection: React.FC<DetailsSectionProps> = ({ showDetailsView,
    setShowDetailsView,
    selectedFile,
    onFileSelect,
    tableData }) => {
    // Add debug logging for props
    useEffect(() => {
        console.log('DetailSection - Received table data:', tableData);
    }, [tableData]);

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

    // Add selector for S3Store
    const s3Objects = useS3Store(state => state.objects);

    const handleSourceCardClick = async (sourceUrl: string) => {
        console.log('DetailSection - Source clicked:', sourceUrl);
        const bucketUuid = window.location.pathname.split('/').pop() || '';
        try {
            // First check if file exists in s3Objects
            const s3Object = s3Objects.find(obj => obj.key === sourceUrl);
            console.log('DetailSection - Found S3 object:', s3Object);

            // Get the signed URL
            const downloadResponse = await get({
                apiName: 'S3_API',
                path: `/s3/${bucketUuid}/download-url`,
                options: {
                    withCredentials: true,
                    queryParams: { path: sourceUrl }
                }
            });

            const { body } = await downloadResponse.response;
            const responseText = await body.text();
            const { signedUrl } = JSON.parse(responseText);

            if (s3Object) {
                // If file exists in s3Objects, use its metadata
                const metadata = s3Object.metadata;
                onFileSelect({
                    id: metadata.Metadata?.id || sourceUrl.split('/').pop() || '',
                    name: metadata.Metadata?.originalname || sourceUrl.split('/').pop() || '',
                    s3Url: signedUrl,
                    type: sourceUrl.split('.').pop()?.toUpperCase() || 'Unknown',
                    size: formatFileSize(metadata.ContentLength || 0),
                    status: "success",
                    date: metadata.LastModified || '',
                    uploadedBy: metadata.Metadata?.uploadbyname || 'Unknown',
                    s3Key: sourceUrl,
                    uploadProcess: metadata.Metadata?.pre_upload || 'COMPLETED',
                    summary: metadata.Metadata?.document_summary || ''
                });
            } else {
                // Fallback to basic file info if not found
                const fileName = sourceUrl.split('/').pop() || '';
                const fileObject = {
                    id: fileName,
                    name: fileName,
                    s3Url: signedUrl,
                    type: fileName.split('.').pop()?.toUpperCase() || 'Unknown',
                    size: '0',
                    status: "success" as const,
                    date: '',
                    uploadedBy: 'Unknown',
                    s3Key: sourceUrl,
                    uploadProcess: 'COMPLETED',
                    tags: []
                };

                onFileSelect(fileObject);
            }
        } catch (error) {
            console.error('DetailSection - Error handling source click:', error);
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

            console.log("Waiting on s3 client");

            const s3Client = await getS3Client();

            console.log("Got the s3 client");
            const command = new GetObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: s3Key
            });

            return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        } catch (error) {
            console.error('Error generating signed URL:', error);
            throw error;
        }
    };


    const handleOpenSource = async (sourceKey: string, sourceName: string) => {
        try {
            setLoadingSource(sourceKey);
            const url = await getPresignedUrl(sourceKey);
            console.log('Presigned URL from details:', url);
            onFileSelect({
                id: `file-${sourceKey}`,
                name: sourceName,
                s3Url: url,
            });
        } catch (error) {
            console.error('Error getting presigned URL:', error);
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
                disabled={loadingSource === sourceInfo.key}
            >
                <FileText size={16} />
                <span>
                    {loadingSource === sourceInfo.key ? 'Opening...' : 'Open Source Document'}
                </span>
            </Button>
        );
    };






    const queryAllDocuments = async (searchTerm: string, withReasoning: boolean) => {
        try {
            // Don't allow new queries while WebSocket is active
            // if (isWebSocketActive) {
            //     return;
            // }

            setIsWebSocketActive(true);
            setIsLoading(true);
            setMessages(prev => [...prev, { type: 'question', content: searchTerm }]);
            setSearchResult({
                response: '',
                sources: {},
                thread_id: ''
            });

            const bucketUuid = window.location.pathname.split('/').pop() || '';
            const websocketHost = `${process.env.NEXT_PUBLIC_SEARCH_API_CODE}.execute-api.us-east-1.amazonaws.com`;

            const idToken = await getIdToken();
            if (!idToken) {
                throw new Error('No ID token available');
            }

            const params = new URLSearchParams();
            params.append('idToken', idToken);

            const websocketUrl = `wss://${websocketHost}/prod?${params.toString()}`;

            // Debug URL
            console.log('WebSocket URL components:', {
                host: websocketHost,
                params: Object.fromEntries(params.entries()),
                fullUrl: websocketUrl
            });

            const ws = new WebSocket(websocketUrl);

            let result = '';

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
                                use_reasoning: withReasoning
                            }
                        }));
                    }
                    else {
                        ws.send(JSON.stringify({
                            action: 'query',
                            data: {
                                collection_name: bucketUuid,
                                query: searchTerm,
                                use_reasoning: withReasoning
                            }
                        }));
                    }
                };

                ws.onmessage = (event) => {
                    // console.log('WebSocket message:', event.data);
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'content') {
                            // Check if this is the last message
                            if (data.content.includes('</sources>')) {
                                setIsWebSocketActive(false);
                                setIsLoading(false);
                            }
                            if (data.thread_id) {
                                setCurrentThreadId(data.thread_id);
                            }
                            setSearchResult(prevResult => ({
                                response: (prevResult?.response || '') + data.content,
                                sources: data.sources || {},
                                thread_id: data.thread_id || ''
                            }));
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
                    console.log('WebSocket Error:', error);
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
                    console.log('WebSocket closed:', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    });
                };
            });

        } catch (err) {
            setIsWebSocketActive(false);
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

    const querySingleDocument = async (fileKey: string | number | boolean, searchTerm: any) => {
        // const userPrefix = await getUserPrefix();
        const bucketUuid = window.location.pathname.split('/').pop() || '';
        const encodedS3Key = encodeURIComponent(fileKey);
        const restOperation = post({
            apiName: 'VDR_API',
            path: `/${bucketUuid}/documents/${encodedS3Key}/query`,
            options: {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    query: searchTerm
                }
            }
        });

        console.log(restOperation);
    };

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

    interface Message {
        type: 'question' | 'answer' | 'error';
        content: string;
        sources?: Record<string, any>;
        steps?: string[];  // Add steps to the message interface
    }

    const [messages, setMessages] = useState<Message[]>([]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            setIsLoading(true);
            const query = inputValue.trim();
            
            // queryAllDocuments(query);
            // //   handleSearch(query);
            setInputValue('');
        }
    };


    const [inThoughts, setInThoughts] = useState(true);
    const [inAnswer, setInAnswer] = useState(false);
    const [inSource, setInSource] = useState(false);
    const [generatingSources, setGeneratingSources] = useState(false);
    const [isGeneratingComplete, setIsGeneratingComplete] = useState(false);

    const [stepsTaken, setStepsTaken] = useState<string[]>([]);

    const [thoughts, setThoughts] = useState('');

    const pathname = usePathname();

    const bucketUuid = pathname.split('/').pop() || '';



    useEffect(() => {
        if (searchResult && searchResult.response) {
            setIsAnswerLoading(true);  // Start loading when processing begins
            let response = searchResult.response;

            // Helper function to extract content between tags
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

            // Process error section first since it takes precedence
            const errorResult = extractContent(response, '<error>', '</error>');
            if (errorResult) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;
                    
                    if (lastMessage?.type === 'error' && !errorResult.isComplete) {
                        // Update existing error message
                        lastMessage.content = errorResult.content;
                    } else if (errorResult.isComplete) {
                        // Only add new error message if we have complete content
                        // and last message wasn't an error
                        if (!lastMessage || lastMessage.type !== 'error') {
                            newMessages.push({
                                type: 'error',
                                content: errorResult.content
                            });
                        } else {
                            // Update existing error with complete content
                            lastMessage.content = errorResult.content;
                        }
                    }
                    return newMessages;
                });

                if (errorResult.isComplete) {
                    // Only update response if we have a complete error tag
                    response = errorResult.remaining;
                }
                
                // If we have an error (complete or not), stop processing
                setIsAnswerLoading(false);  // Stop loading on error
                setIsLoading(false);
                setIsWebSocketActive(false);
                return;
            }

            // Process sources section first since it's JSON
            // const sourcesResult = extractContent(response, '<sources>', '</sources>');
            // if (sourcesResult) {
            //     if (sourcesResult.isComplete) {
            //         try {
            //             // Try to parse the accumulated JSON string
            //             const sourcesJson = JSON.parse(sourcesResult.content);
            //             const extractedUrls: string[] = [];
                        
            //             // Process each key-value pair in the JSON
            //             Object.entries(sourcesJson).forEach(([key, value]) => {
            //                 if (key.includes(bucketUuid)) {
            //                     extractedUrls.push(key);
            //                 }
            //             });

            //             if (extractedUrls.length > 0) {
            //                 setMessages(prev => {
            //                     const newMessages = [...prev];
            //                     if (newMessages.length > 0) {
            //                         const lastMessage = newMessages[newMessages.length - 1];
            //                         if (lastMessage.type === 'answer') {
            //                             const sourcesObject: Record<string, any> = {};
            //                             extractedUrls.forEach(url => {
            //                                 sourcesObject[url] = sourcesJson[url] || {};
            //                             });
            //                             lastMessage.sources = sourcesObject;
            //                         }
            //                     }
            //                     return newMessages;
            //                 });
            //             }
            //             setGeneratingSources(false);
            //             response = sourcesResult.remaining;
            //         } catch (error) {
            //             // If JSON parsing fails, it means we're still receiving the JSON string
            //             console.log("Incomplete JSON in sources:", sourcesResult.content);
            //         }
            //     } else {
            //         // Still receiving sources content
            //         setGeneratingSources(true);
            //     }
            // }

            // Process thinking section
            const thinkResult = extractContent(response, '<think>', '</think>');
            if (thinkResult) {
                if (thinkResult.isComplete) {
                    const thoughtLines = thinkResult.content
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0)
                        .map(line => line.replace(/^\d+\.\s*/, ''));

                    setThoughts(thinkResult.content);
                    setStepsTaken(thoughtLines);
                    response = thinkResult.remaining;
                } else {
                    // Still receiving thinking content
                    setThoughts(thinkResult.content);
                }
            }

            // Process answer section
            const answerResult = extractContent(response, '<answer>', '</answer>');
            if (answerResult) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages.length > 0 ? newMessages[newMessages.length - 1] : null;
                    
                    const messageContent = {
                        type: 'answer' as const,
                        content: answerResult.content,
                        sources: searchResult.sources,
                        steps: thinkResult?.isComplete ? stepsTaken : undefined
                    };

                    if (lastMessage?.type === 'answer') {
                        newMessages[newMessages.length - 1] = messageContent;
                    } else {
                        newMessages.push(messageContent);
                    }
                    return newMessages;
                });

                if (answerResult.isComplete) {
                    setIsAnswerLoading(false);  // Stop loading when answer is complete
                    response = answerResult.remaining;
                }
            }

            // Process sources section
            const sourcesResult = extractContent(response, '<sources>', '</sources>');
            if (sourcesResult) {
                if (sourcesResult.isComplete) {
                    try {
                        // Try to parse the accumulated JSON string
                        const sourcesContent = sourcesResult.content.replace(/\n/g, '');
                        const sourcesJson = JSON.parse(sourcesContent);
                        const extractedUrls: string[] = [];

                        // Process each key-value pair in the JSON
                        Object.entries(sourcesJson).forEach(([key, value]) => {
                            if (key.includes(bucketUuid)) {
                                extractedUrls.push(key);
                            }
                        });

                        if (extractedUrls.length > 0) {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                if (newMessages.length > 0) {
                                    const lastMessage = newMessages[newMessages.length - 1];
                                    if (lastMessage.type === 'answer') {
                                        const sourcesObject: Record<string, any> = {};
                                        extractedUrls.forEach(url => {
                                            sourcesObject[url] = sourcesJson[url] || {};
                                        });
                                        lastMessage.sources = sourcesObject;
                                    }
                                }
                                return newMessages;
                            });
                        }
                        setGeneratingSources(false);
                        setIsGeneratingComplete(true);
                        response = sourcesResult.remaining;
                    } catch (error) {
                        // If JSON parsing fails, it means we're still receiving the JSON string
                        console.log("Incomplete JSON in sources:", sourcesResult.content);
                        setGeneratingSources(true);
                    }
                } else {
                    // Still receiving sources content
                    setGeneratingSources(true);
                }
            }

            // Handle streaming content that's not within any tags
            if (!thinkResult && !answerResult && !sourcesResult && response.trim()) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages.length > 0 && newMessages[newMessages.length - 1].type === 'answer') {
                        newMessages[newMessages.length - 1].content += response.trim();
                    }
                    return newMessages;
                });
            }

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
                            onClick={() => handleSourceCardClick(key)}
                        >
                            <CardContent className="p-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-white" />
                                    <span className="text-sm text-blue-500 dark:text-white select-none">
                                        {key.split('/').pop()}
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
        setIsAnswerLoading(false);
    };

    const renderAdvancedSearch = () => {

        return (
            <div className="flex flex-col h-full overflow-none dark:bg-darkbg w-full">
                <div className="absolute top-0 right-0 p-4 z-50">
                    <PlusCircle 
                        className="h-5 w-5 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" 
                        onClick={handleClearChat}
                    />
                </div>
                <ScrollArea
                    className="flex-1 overflow-none w-full px-4 [mask-image:linear-gradient(to_bottom,white_calc(100%-64px),transparent)]"
                >

                    {messages.map((message, index) => (
                        <div key={index} className="flex flex-col gap-4 mb-4 pl-2" >
                            {message.type === 'question' ? (
                                <div className="flex items-end  dark:text-white  mt-4">
                                    <p className="text-2xl font-medium dark:text-white pr-4 rounded-lg">{message.content}</p>
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
                                <div className="w-full">
                                    {message.steps && message.steps.length > 0 && (
                                        <div className="w-full pr-4">
                                            <Accordion type="single" collapsible className="w-full -space-y-px mb-6">
                                                <AccordionItem
                                                    value="steps"
                                                    className="border bg-background px-4 py-1 rounded-lg dark:bg-darkbg dark:border-slate-800"
                                                >
                                                    <AccordionTrigger className="py-1 text-[15px] leading-6 hover:no-underline dark:text-slate-400 flex items-center justify-center ">
                                                        <div className="flex flex-row gap-2 items-center w-full justify-between pr-2">
                                                            <div className="flex flex-row gap-2 items-center">
                                                                <Footprints className="h-4 w-4 text-gray-500" />
                                                                <h1>Search Steps</h1>
                                                            </div>
                                                            <h1 className="text-sm font-light">{message.steps.length} steps</h1>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pb-2 pt-2 text-muted-foreground">
                                                        {message.steps.map((step, stepIndex) => (
                                                            <div key={stepIndex} className="flex flex-row gap-2 items-center mb-2">
                                                                <span className="text-xs text-gray-500">{stepIndex + 1}.</span>
                                                                <span className="text-xs text-gray-700 dark:text-gray-300 font-normal">
                                                                    {step}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </div>
                                    )}

                                    <div className="mr-auto mb-6 rounded-lg">
                                        {renderAnswerHeader()}
                                        <ReactMarkdown className="text-wrap text-sm pr-4 dark:text-white leading-7">
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                    <div>
                                        {!isGeneratingComplete && generatingSources && (
                                            <div className='flex flex-row gap-2 items-center mb-3'>
                                                <TextShimmer
                                                    key="generating-sources"
                                                    className='text-sm'
                                                    duration={1}
                                                >
                                                    Generating sources...
                                                </TextShimmer>
                                            </div>
                                        )}
                                        {isGeneratingComplete && message.sources && Object.keys(message.sources).length > 0 && (
                                            <div>
                                                <SourcesList sources={message.sources} />
                                            </div>
                                        )}


                                    </div>
                                    <div className="w-full flex items-center justify-center mt-4 "></div>
                                        <Separator className="bg-slate-800 w-full" orientation='horizontal' />
                                    </div>
                            )
                            }

                        </div>
                    ))}


                    {isLoading && (
                        <div className='flex flex-row gap-2 items-center mb-3'>
                            <object type="image/svg+xml" data={loadingAnimation.src} className="h-6 w-6">
                                svg-animation
                            </object>
                            <h1 className='dark:text-white font-semibold'>Answer</h1>
                        </div>
                    )}


                    <div ref={messagesEndRef} style={{ height: 0 }} /> {/* Add this line */}

                </ScrollArea>

                <div className="px-4 bg-transparent">
                    <AIInputWithSearch
                        onSubmit={queryAllDocuments}
                        onFileSelect={(file) => {
                            console.log('Selected file:', file);
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
                <div className="flex justify-between items-center mb-2 mt-2 dark:bg-darkbg px-4 pt-2">
                    <h2 className="text-base font-semibold dark:text-white">File Details</h2>
                    <Button
                        variant="outline"
                        onClick={() => setShowDetailsView(false)}
                        className="dark:bg-darkbg dark:text-white text-sm"
                    >
                        Back to Search
                    </Button>
                </div>
                {selectedFile && (
                    <>
                        <div className="text-sm dark:text-white px-4">
                            <p><strong>Name:</strong> {selectedFile.name}</p>
                            <p><strong>Type:</strong> {selectedFile.type}</p>
                            <p><strong>Size:</strong> {selectedFile.size}</p>
                            <p><strong>Uploaded By:</strong> {selectedFile.uploadedBy}</p>
                            <p><strong>Date:</strong> {new Date(selectedFile.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p><strong>Detailed Summary:</strong> {decodeUnicodeEscapes(selectedFile.summary?.slice(1, -1)) || 'No summary available'}</p>
                            {/* Add more details as needed */}
                        </div>
                    </>


                )}
            </ScrollArea>

        </>
    );

    return (
        <ScrollArea className="h-full ">
            <div className="flex flex-col gap-2 overflow-auto h-screen">
                {(showDetailsView && sourceUrls.length === 0) ? renderFileDetails() : renderAdvancedSearch()}
            </div>
        </ScrollArea>

    );

};



export default DetailSection;