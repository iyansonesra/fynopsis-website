import React, { useState, useEffect } from 'react';
import logo from '../app/assets/fynopsis_noBG.png'
import { ScrollArea } from '@radix-ui/react-scroll-area';
import TreeFolder from './Folder/Tree';
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
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"

import "./Folder/styles.css";
import DetailSection from './DetailsSection';
import TabSystem from './TabSystem';




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

export default function Files({ setSelectedTab, id }) { // : { setSelectedTab: React.Dispatch<React.SetStateAction<string>> }
    const [searchFileText, setSearchFileText] = useState('');
    const [searchFolderText, setSearchFolderText] = useState('');
    const [showFolderTree, setShowFolderTree] = useState(true);
    const [folderViewWidth, setFolderViewWidth] = useState('54%');
    const [folderSearchQuery, setFolderSearchQuery] = useState('');
    const [showUploadOverlay, setShowUploadOverlay] = useState(false);

    const [showDetailsView, setShowDetailsView] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        setShowDetailsView(true);
    };


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

    const initialTabs = [
        { id: '1', title: 'Tab 1', content: <div
            className='folder-view h-full px-4 py-4 flex flex-col transition-all duration-300 ease-in-out'
    
        >
            <div className="flex flex-row justify-between mb-4">
                <div className="flex flex-row gap-2 items-center">
                    <Folder className='h-6 w-6 text-slate-800' />
                    <h1 className='text-xl font-semibold text-slate-800'>Due Dilligence</h1>
                </div>
    
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Sparkles className="h-4 w-4 text-blue-400" />
                    </div>
                    <input
                        className='w-64 h-8 border rounded-xl pl-10 pr-10 border-slate-400 text-sm'
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
    
            <div className="table-view mx-auto w-full">
                <DataTableDemo onFileSelect={handleFileSelect} bucketName={id} />
            </div>
        </div>  },
        { id: '2', title: 'Tab 2', content: <div>Content for Tab 2</div> },
        { id: '3', title: 'Tab 3', content: <div>Content for Tab 3</div> },
    ];

    return (
        <ResizablePanelGroup
            direction="horizontal"
            className="flex w-full mb-2 flex-row h-full overflow-hidden"
        >
            <ResizablePanel defaultSize={25} maxSize={30} minSize={16} collapsible={true} collapsedSize={0}>
                <div className="h-full flex flex-col px-4 py-2">

                    <Select>
                        <SelectTrigger className="w-[120px] select-none outline-none border-none focus:ring-0 focus:ring-offset-0">
                            <SelectValue placeholder="Theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">By Name</SelectItem>
                            <SelectItem value="dark">By AI</SelectItem>
                        </SelectContent>
                    </Select>


                    <ScrollArea className="flex-grow  h-64 overflow-auto p-2">

                        <TreeFolder onFileSelect={handleFileSelect} />


                    </ScrollArea>
                </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={40}>
                <TabSystem initialTabs={initialTabs} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={20} collapsible={true} collapsedSize={0}>
                <DetailSection
                    showDetailsView={showDetailsView}
                    setShowDetailsView={setShowDetailsView}
                    selectedFile={selectedFile}
                />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}


{/* <div
                    className='folder-view h-full px-4 py-4 flex flex-col transition-all duration-300 ease-in-out'

                >
                    <div className="flex flex-row justify-between mb-4">
                        <div className="flex flex-row gap-2 items-center">
                            <Folder className='h-6 w-6 text-slate-800' />
                            <h1 className='text-xl font-semibold text-slate-800'>Due Dilligence</h1>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Sparkles className="h-4 w-4 text-blue-400" />
                            </div>
                            <input
                                className='w-64 h-8 border rounded-xl pl-10 pr-10 border-slate-400 text-sm'
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

                    <div className="table-view mx-auto w-full">
                        <DataTableDemo onFileSelect={handleFileSelect} />
                    </div>
                </div> */}