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
import loadingAnimation from './../app/assets/fyn_loading.svg'

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
            const websocketHost = 'n3pn9yerle.execute-api.us-east-1.amazonaws.com';

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
                    console.log('WebSocket message:', event.data);
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
                    console.log('WebSocket Error:', error);
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

    const handleInputChange = (e) => {
        const textarea = e.target;
        setInputValue(e.target.value);

        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set new height based on scrollHeight
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

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
            // //   handleSearch(query);
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


    const textareaRef = useRef(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    };

    useEffect(() => {
        adjustHeight();
    }, [inputValue]);

    const TextArea = ({ placeholder, value, onChange }) => {
        const textareaRef = useRef(null);

        useEffect(() => {
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
        }, [value]);

        return (
            <textarea
                ref={textareaRef}
                className="w-full min-h-[48px] pl-4 pr-12 py-3 rounded-xl text-sm 
                       border dark:border-slate-600 dark:bg-darkbg dark:text-white 
                       outline-none resize-none overflow-hidden"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                rows={1}
            />
        );
    };






    const renderAdvancedSearch = () => {
     

        return (
            <div className="flex flex-col h-full overflow-none dark:bg-darkbg w-full">
                <ScrollArea
                 
                    className="flex-1 overflow-none w-full px-4"
                   
                >
             
                        {messages.map((message, index) => (
                            <div key={index} className="flex flex-col gap-4 mb-4" ref={index + 1 === messages.length ? cardRef : null}>
                                {message.type === 'question' ? (
                                    <div className="flex items-end justify-end self-end dark:text-white  mt-4 max-w-[70%]">
                                        {/* <img src={logo.src} alt="Fynopsis Logo" className="h-8 w-8 2xl:h-14 2xl:w-14 bg-white rounded-full" /> */}

                                        <p className="text-sm text-white bg-blue-500  p-2 rounded-lg">{message.content}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mr-auto max-w-[70%] mb-4 dark:text-white bg-slate-100 dark:bg-gradient-to-b dark:from-slate-800 dark:to-darkbg rounded-lg">
                                            <ReactMarkdown className="text-wrap text-sm p-4">
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                        <div>
                                            {sourceUrls.length > 0 && (
                                                <Card
                                                    className="mt-2 p-2 inline-block cursor-pointer hover:bg-gray-50 transition-colors dark:bg-darkbg border"
                                                    onClick={() => handleSourceCardClick(sourceUrls[sourceUrls.length - 1])}
                                                >
                                                    <CardContent className="p-2">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-white" />
                                                            <span className="text-sm text-blue-500 dark:text-white">
                                                                {sourceUrls[sourceUrls.length - 1].split('/').pop()}
                                                            </span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </div>

                                    </div>

                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="mr-auto w-full max-w-2xl flex justify-start">
                                <object type="image/svg+xml" data={loadingAnimation.src} className="h-8 w-8">
                                    svg-animation
                                </object>
                            </div>
                        )}
                </ScrollArea>

                <div className="p-4">
                    <div className="relative max-w-3xl mx-auto">
                        <textarea
                            className="w-full sm:min-h-[48px] min-h-[64px] pl-4 pr-12 py-3 rounded-xl text-sm border 
                     dark:border-slate-600 border-slate-200 dark:bg-darkbg dark:text-white outline-none 
                     select-none resize-none overflow-hidden"
                            placeholder="Query your documents..."
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            rows={2}
                        />
                        <div className="absolute right-2 bottom-4 flex items-center gap-2 
                      bg-blue-500 rounded-xl">
                            <button
                                className="p-2 hover:bg-gray-100 rounded-lg"
                                onClick={() => queryAllDocuments(userSearch.trim())}
                                disabled={isLoading}
                            >
                                <ArrowUp className="h-4 w-4 text-white" />
                            </button>
                        </div>
                    </div>
                </div>


            </div >
        );
    }




    const renderFileDetails = () => (
        <>
            <div className="flex justify-between items-center mb-4 mt-2 dark:bg-darkbg">
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
            <div className="flex flex-col gap-2 overflow-auto h-screen">
                {(showDetailsView && sourceUrls.length === 0) ? renderFileDetails() : renderAdvancedSearch()}
            </div>
        </ScrollArea>

    );

};



export default DetailSection;