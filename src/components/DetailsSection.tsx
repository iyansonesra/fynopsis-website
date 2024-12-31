import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, BadgeInfo, FileText, Search } from 'lucide-react';
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

// import { w3cwebsocket as W3CWebSocket } from "websocket";
// import { Signer } from '@aws-amplify/core';


interface SearchResponse {
    response: string;
    sources: Record<string, any>;
    thread_id: string;
}

interface DetailsSectionProps {
    showDetailsView: boolean;
    setShowDetailsView: (show: boolean) => void;
    selectedFile: any;
    onFileSelect: (file: { id: string; name: string; s3Url: string; }) => void;
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
    onFileSelect }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
    const [loadingSource, setLoadingSource] = useState<string | null>(null);
    const [messageBuffer, setMessageBuffer] = useState('');
    const [sourceUrls, setSourceUrls] = useState<string[]>([]);

    const handleSourceCardClick = async (sourceUrl: string) => {
        const bucketUuid = window.location.pathname.split('/').pop() || '';
        try {
            const s3Key = sourceUrl;
            const downloadResponse = await get({
                apiName: 'S3_API',
                path: `/s3/${bucketUuid}/download-url`,
                options: {
                    withCredentials: true,
                    queryParams: { path: s3Key }
                }
            });
    
            const { body } = await downloadResponse.response;
            const responseText = await body.text();
            const { signedUrl } = JSON.parse(responseText);
    
            const fileObject = {
                id: sourceUrl.split('/').pop() || '',
                name: sourceUrl.split('/').pop() || '',
                s3Url: signedUrl,
                type: sourceUrl.split('.').pop()?.toUpperCase() || 'Unknown',
                size: 0,
                status: "success" as const,
                date: '',
                uploadedBy: 'Unknown',
                s3Key: s3Key
            };
    
            onFileSelect(fileObject);
        } catch (error) {
            console.error('Error handling source card click:', error);
        }
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






    const queryAllDocuments = async (searchTerm: string) => {
        try {
            setIsLoading(true);
            setSearchResult({
                response: '',
                sources: {},
                thread_id: ''
            });

            const bucketUuid = window.location.pathname.split('/').pop() || '';
            const websocketHost = 'gttxjo67ij.execute-api.us-east-1.amazonaws.com';

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
                    ws.send(JSON.stringify({
                        action: 'query',
                        data: {
                            collection_name: bucketUuid,
                            query: searchTerm
                        }
                    }));
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'content') {
                            setIsLoading(false);
                            setSearchResult(prevResult => ({
                                response: (prevResult?.response || '') + data.content,
                                sources: data.sources || {},
                                thread_id: data.thread_id || ''
                            }));
                        }
                    } catch (error) {
                        console.error('Error processing message:', error);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket Error Details:', {
                        error,
                        url: websocketUrl.substring(0, 100) + '...',
                        timestamp: new Date().toISOString()
                    });
                    reject(new Error('WebSocket connection failed'));
                };


                ws.onclose = (event) => {
                    console.log('WebSocket closed:', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    });
                };
            });

        } catch (err) {
            console.error('Error querying collection:', err);
            setError('Failed to fetch search results. Please try again.');
            setIsLoading(false);
        }
    };

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const [messages, setMessages] = useState<Array<{
        type: 'question' | 'answer',
        content: string,
        sources?: Record<string, any>
    }>>([]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setIsLoading(true);
            const query = inputValue.trim();
            setMessages(prev => [...prev, { type: 'question', content: query }]);
            queryAllDocuments(query);
            //   handleSearch(query);
            setInputValue('');
        }
    };

    useEffect(() => {
        if (searchResult && searchResult.response) {
            // Extract source URL and clean message content
            const sourceUrlMatch = searchResult.response.match(/{.*}/s);
            let cleanedContent = searchResult.response;
            let extractedUrl = '';

            if (sourceUrlMatch) {
                try {
                    const sourceObj = JSON.parse(sourceUrlMatch[0]);
                    extractedUrl = Object.keys(sourceObj)[0];
                    // Remove the JSON object from content
                    cleanedContent = searchResult.response.replace(sourceUrlMatch[0], '').trim();
                    setSourceUrls(prev => [...prev, extractedUrl]);
                } catch (error) {
                    console.error('Error parsing source URL:', error);
                }
            }

            setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].type === 'answer') {
                    newMessages[newMessages.length - 1] = {
                        type: 'answer',
                        content: cleanedContent,
                        sources: searchResult.sources
                    };
                } else {
                    newMessages.push({
                        type: 'answer',
                        content: cleanedContent,
                        sources: searchResult.sources
                    });
                }
                return newMessages;
            });
        }
    }, [searchResult]);

    const useScrollToBottom = (dependency: any) => {
        const scrollRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: "smooth" });
            }
        }, [dependency]);

        return scrollRef;
    };


    const scrollRef = useScrollToBottom([messages, isLoading]);

    const renderAdvancedSearch = () => (
        <div className="flex flex-col h-full overflow-none">
            <ScrollArea className="flex-1 overflow-none">
                {messages.map((message, index) => (
                    <div key={index} className="flex flex-col gap-4 mb-4">
                        {message.type === 'question' ? (
                            <div className="ml-auto max-w-2xl bg-blue-100 text-black rounded-lg w-full py-4 mt-4 flex flex-row px-4">
                                <img src={logo.src} alt="Fynopsis Logo" className="h-8 w-8 2xl:h-14 2xl:w-14 bg-white rounded-full" />

                                <p className="ml-4 text-sm">{message.content}</p>
                            </div>
                        ) : (
                            <div className="mr-auto w-full max-w-[65%]">
                                <ReactMarkdown className="text-wrap max-w-[100%] text-sm">
                                    {message.content}
                                </ReactMarkdown>
                                {sourceUrls.length > 0 && (
                                    <Card
                                        className="mt-2 p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                        onClick={() => handleSourceCardClick(sourceUrls[sourceUrls.length - 1])}
                                    >
                                        <CardContent className="p-2">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                <span className="text-sm text-blue-500">
                                                    {sourceUrls[sourceUrls.length - 1].split('/').pop()}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="mr-auto w-full max-w-2xl">
                        <div className="animate-pulse flex space-x-2">
                            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                        </div>
                    </div>
                )}

                <div ref={scrollRef} />
            </ScrollArea>

            <div className=" p-4">
                <div className="relative max-w-3xl mx-auto">
                    <input
                        className="w-full h-12 pl-12 pr-24 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 text-base"
                        placeholder="Query your documents..."
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />
                    <Search
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <button
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            onClick={() => queryAllDocuments(userSearch.trim())}
                            disabled={isLoading}
                        >
                            <ArrowUp className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );




    const renderFileDetails = () => (
        <>
            <div className="flex justify-between items-center mb-4 mt-2">
                <h2 className="text-lg font-semibold">File Details</h2>
                <Button
                    variant="outline"
                    onClick={() => setShowDetailsView(false)}
                >
                    Back to Search
                </Button>
            </div>
            {selectedFile && (
                <>
                    <div className="text-sm">
                        <p><strong>Name:</strong> {selectedFile.name}</p>
                        <p><strong>Type:</strong> {selectedFile.type}</p>
                        <p><strong>Size:</strong> {selectedFile.size}</p>
                        <p><strong>Uploaded By:</strong> {selectedFile.uploadedBy}</p>
                        <p><strong>Date:</strong> {selectedFile.date}</p>
                        <p><strong>Detailed Summary:</strong> {selectedFile.documentSummary}</p>
                        {/* Add more details as needed */}
                    </div>

                </>


            )}
        </>
    );

    return (
        <ScrollArea className="h-full ">
            <div className="flex flex-col gap-2 px-4 overflow-auto h-screen">
                {showDetailsView ? renderFileDetails() : renderAdvancedSearch()}
            </div>
        </ScrollArea>

    );

};



export default DetailSection;