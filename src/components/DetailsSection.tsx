import React, { useState } from 'react';
import { ArrowLeft, BadgeInfo, Search } from 'lucide-react';
import { Input, Skeleton } from '@mui/material';
import { Button } from './ui/button';
import { post } from 'aws-amplify/api';
import { ScrollArea } from './ui/scroll-area';

interface DetailsSectionProps {
    showDetailsView: boolean;
    setShowDetailsView: (show: boolean) => void;
    selectedFile: any;  // Replace 'any' with your file type
}

const DetailSection: React.FC<DetailsSectionProps> = ({ showDetailsView, setShowDetailsView, selectedFile }) => {
    const [userSearch, setUserSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserSearch(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if(e.key === 'Enter') {
            setIsLoading(true);
            queryAllDocuments(userSearch.trim());
            setUserSearch('');
            setIsLoading(false);
        }
    };

    const queryAllDocuments = async (searchTerm: string) => {
        const restOperation = post({
            apiName: 'VDR_API',
            path: '/vdr-documents/query',
            options: {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    query: searchTerm
                }
            },
        });
        
        console.log(restOperation);
        const { body } = await restOperation.response;
        const responseText = await body.text();
        const responseMain = JSON.parse(responseText);
        console.log(responseMain);
    };

    const querySingleDocument = async (fileKey, searchTerm) => {
        const restOperation = post({
          apiName: 'VDR_API',
          path: `/vdr-documents/documents/${fileKey}/query`,
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
                <BadgeInfo className='h-6 w-6 text-slate-800' />
                <h1 className='text-base font-semibold text-slate-800'>Advanced Search</h1>
            </div>

            <div className="relative w-[80%]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                    className="w-full border-slate-200 rounded-xl outline-none pl-10 py-1"
                    placeholder='Search files...'
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
            ): searchResults}
        </>
    );

    const renderFileDetails = () => (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">File Details</h2>
            <Button
              variant="outlined"
              startIcon={<ArrowLeft />}
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
            <div className="flex flex-col gap-2 px-4 py-4 overflow-auto">
                {showDetailsView ? renderFileDetails() : renderAdvancedSearch()}
            </div>
        );
    
};

export default DetailSection;