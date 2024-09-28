import React, { useState, useEffect } from 'react';
import logo from '../app/assets/fynopsis_noBG.png'
import { ScrollArea } from '@radix-ui/react-scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { BadgeInfo, ChevronDown, ChevronLeft, ChevronRight, Folder, Sparkles, Star, Upload, X } from 'lucide-react';
import { DataTableDemo } from './FilesTable';
import { Payment, columns } from './FilesTable';
import FolderTreeComponent from './FolderTree'; // Add this import


interface FilesProps {
    userSearch: string;
}

function getData(): Payment[] {
    // Fetch data from your API here.
    return [
      {
        id: "728ed52f",
        amount: 100,
        status: "pending",
        email: "m@example.com",
      },
    ]
}

export default function Files({ setSelectedTab }: { setSelectedTab: React.Dispatch<React.SetStateAction<string>> }) {
    const [searchFileText, setSearchFileText] = useState('');
    const [searchFolderText, setSearchFolderText] = useState('');
    const [showFolderTree, setShowFolderTree] = useState(true);
    const [showDetailsView, setShowDetailsView] = useState(true);
    const [folderViewWidth, setFolderViewWidth] = useState('54%');
    const [folderSearchQuery, setFolderSearchQuery] = useState('');

    const data = getData();

    useEffect(() => {
        if (!showFolderTree && !showDetailsView) {
            setFolderViewWidth('100%');
        } else if (!showFolderTree || !showDetailsView) {
            setFolderViewWidth('77%');
        } else {
            setFolderViewWidth('54%');
        }
    }, [showFolderTree, showDetailsView]);

    const handleClearFileSearch = () => {
        setSearchFileText('');
    };

    const handleClearFolderSearch = () => {
        setSearchFolderText('');
    };

    return (
        <div className='flex w-full mb-2 flex-row h-full overflow-hidden'>
            <div 
                className={`folder-tree flex-shrink-0 w-[23%] h-full px-4 py-2 border-r-2 relative transition-all duration-300 ease-in-out ${
                    showFolderTree ? '' : '-translate-x-full'
                }`}
                style={{ marginLeft: showFolderTree ? '0' : '-23%' }}
            >
                <div className="h-full flex flex-col">
                    <button
                        className="absolute top-2 right-2 p-1 bg-gray-200 rounded-full"
                        onClick={() => setShowFolderTree(false)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <Select>
                        <SelectTrigger className="w-[120px] select-none outline-none border-none focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">By Name</SelectItem>
                            <SelectItem value="dark">By AI</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* <div className="relative mt-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Sparkles className="h-5 w-5 text-blue-400" />
                        </div>
                        <input
                            className='w-full h-10 border-2 rounded-xl pl-10 pr-10 border-slate-400'
                            placeholder='Search for a file...'
                            value={searchFileText}
                            onChange={(e) => setSearchFileText(e.target.value)}
                        />
                        {searchFileText && (
                            <button
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={handleClearFileSearch}
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        )}
                    </div> */}

                    <ScrollArea className="flex-grow  h-64 overflow-auto p-2">
                        
                            <FolderTreeComponent searchQuery={folderSearchQuery} />
                          
                     
                    </ScrollArea>
                </div>
            </div>
           
            <div 
                className='folder-view h-full border-r-2 px-4 py-4 flex flex-col transition-all duration-300 ease-in-out'
                style={{ width: folderViewWidth }}
            >
                <div className="flex flex-row justify-between mb-4">
                    <div className="flex flex-row gap-2 items-center">
                        {!showFolderTree && (
                            <button
                                className="p-1 bg-gray-200 rounded-full mr-2"
                                onClick={() => setShowFolderTree(true)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                        <Folder className='h-6 w-6 text-slate-800' />
                        <h1 className='text-xl font-semibold text-slate-800'>Due Dilligence</h1>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Sparkles className="h-5 w-5 text-blue-400" />
                        </div>
                        <input
                            className='w-64 h-9 border-2 rounded-xl pl-10 pr-10 border-slate-400'
                            placeholder='Search for a file...'
                            value={searchFolderText}
                            onChange={(e) => setSearchFolderText(e.target.value)}
                        />
                        {searchFolderText && (
                            <button
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={handleClearFolderSearch}
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mx-auto w-full">
                    <DataTableDemo/>
                </div>
            </div>

            <div 
                className={`details-view flex-shrink-0 w-[23%] h-full px-4 py-4 relative transition-all duration-300 ease-in-out ${
                    showDetailsView ? '' : 'translate-x-full'
                }`}
                style={{ marginRight: showDetailsView ? '0' : '-23%' }}
            >
                <button
                    className="absolute top-2 left-2 p-1 bg-gray-200 rounded-full"
                    onClick={() => setShowDetailsView(false)}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
                <div className="flex flex-row gap-2 items-center mt-8">
                    <BadgeInfo className='h-6 w-6 text-slate-800' />
                    <h1 className='text-xl font-semibold text-slate-800'>Details</h1>
                </div>
            </div>

            {!showDetailsView && (
                <button
                    className="p-1 bg-gray-200 rounded-full self-start mt-4 mr-4 transition-all duration-300 ease-in-out"
                    onClick={() => setShowDetailsView(true)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}