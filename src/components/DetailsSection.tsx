import React, { useState } from 'react';
import { ArrowLeft, BadgeInfo, FileText, Search } from 'lucide-react';
import { Input, Skeleton } from '@mui/material';
import { Button } from './ui/button';
import { post } from 'aws-amplify/api';
import { ScrollArea } from './ui/scroll-area';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Card, CardContent } from './ui/card';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
    const [userSearch, setUserSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
    const [loadingSource, setLoadingSource] = useState<string | null>(null);

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

    const extractSourceInfo = (source: any): { key: string; name: string } | null => {
        // Check if source is a string (direct S3 key)
        if (typeof source === 'string') {
            const name = source.split('/').pop() || 'document';
            return { key: source, name };
        }
        
        // If source is an object, try to extract the key and name
        if (typeof source === 'object' && source !== null) {
            // Assuming the source object might have a structure like { s3Key: "path/key", name: "filename" }
            // Adjust these property names based on your actual data structure
            const key = source.s3Key || source.key || Object.keys(source)[0];
            const name = source.name || key.split('/').pop() || 'document';
            return { key, name };
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
    

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserSearch(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setIsLoading(true);
            queryAllDocuments(userSearch.trim());
            setUserSearch('');
        }
    };

    const queryAllDocuments = async (searchTerm: string) => {
        try {
            const bucketUuid = window.location.pathname.split('/').pop() || '';

            const restOperation = post({
                apiName: 'VDR_API',
                path: `/${bucketUuid}/query`,
                options: {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: {
                        query: searchTerm
                    },
                    withCredentials: true
                },
            });

            const { body } = await restOperation.response;
            const responseText = await body.text();
            const responseMain = JSON.parse(responseText);
            setSearchResult(responseMain);
        } catch (err) {
            console.error('Error querying documents:', err);
            setError('Failed to fetch search results. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

   
    
    const renderSearchResults = () => {
        if (error) {
            return (
                <div className="text-red-500 mt-4">
                    {error}
                </div>
            );
        }

        if (!searchResult && !isLoading) {
            return null;
        }

        return (
            <div className="mt-4">
                <Card className="w-full">
                    <CardContent className="p-4">
                        <div className="prose max-w-none">
                            <h3 className="text-lg font-semibold mb-4">Search Result</h3>
                            <p className="text-slate-700">{searchResult?.response}</p>
                            
                            {searchResult?.sources && Object.keys(searchResult.sources).length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-slate-600">Sources:</h4>
                                    <div className="mt-2 text-sm text-slate-500">
                                        {Object.entries(searchResult.sources).map(([key, value], index) => (
                                            <div key={key} className="mb-2">
                                                <span className="font-medium">{key}: </span>
                                                <span>{JSON.stringify(value)}</span>
                                                {renderSourceButton(value)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
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

    const renderAdvancedSearch = () => (
        <>
            <div className="flex flex-row gap-2 items-center">
                <BadgeInfo className="h-6 w-6 text-slate-800" />
                <h1 className="text-base font-semibold text-slate-800">Advanced Search</h1>
            </div>

            <div className="relative w-[80%]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                    className="w-full border-slate-200 rounded-xl outline-none pl-10 py-1"
                    placeholder="Search files..."
                    value={userSearch}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {isLoading ? (
                <div className="w-full max-w-md transition-opacity duration-300">
                    <Skeleton animation="wave" className="h-5 w-full" />
                    <Skeleton animation="wave" className="h-5 w-[80%]" />
                    <Skeleton animation="wave" className="h-5 w-[60%]" />

                    <Skeleton animation="wave" className="h-5 w-full mt-4" />
                    <Skeleton animation="wave" className="h-5 w-[80%]" />

                    <div className="flex flex-wrap w-full gap-2 mt-4">
                        <Skeleton variant="rectangular" animation="wave" className="h-16 w-20 rounded-xl" />
                        <Skeleton variant="rectangular" animation="wave" className="h-16 w-20 rounded-xl" />
                        <Skeleton variant="rectangular" animation="wave" className="h-16 w-20 rounded-xl" />
                        <Skeleton variant="rectangular" animation="wave" className="h-16 w-20 rounded-xl" />
                    </div>
                </div>
            ) : (
                renderSearchResults()
            )}
        </>
    );

    const renderFileDetails = () => (
        <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">File Details</h2>
                <Button
                    variant="outline"
                    // startIcon={<ArrowLeft />}
                    onClick={() => setShowDetailsView(false)}
                >
                    Back to Search
                </Button>
            </div>
            {selectedFile && (
                <>
                    <p><strong>Name:</strong> {selectedFile.name}</p>
                    <p><strong>Type:</strong> {selectedFile.type}</p>
                    <p><strong>Size:</strong> {selectedFile.size}</p>
                    <p><strong>Uploaded By:</strong> {selectedFile.uploadedBy}</p>
                    <p><strong>Date:</strong> {selectedFile.date}</p>
                    <p><strong>Detailed Summary:</strong> {selectedFile.documentSummary}</p>
                    {/* Add more details as needed */}
                </>


            )}
        </>
    );

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-2 px-4 py-4 overflow-auto">
                {showDetailsView ? renderFileDetails() : renderAdvancedSearch()}
            </div>
        </ScrollArea>

    );

};

export default DetailSection;