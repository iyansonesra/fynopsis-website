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
import FileViewer from './FileViewer';
import { Console } from 'console';

export default function Files({ setSelectedTab }: { setSelectedTab: React.Dispatch<React.SetStateAction<string>> }) {
    const [searchFileText, setSearchFileText] = useState('');
    const [searchFolderText, setSearchFolderText] = useState('');
    const [showFolderTree, setShowFolderTree] = useState(true);
    const [folderViewWidth, setFolderViewWidth] = useState('54%');
    const [folderSearchQuery, setFolderSearchQuery] = useState('');
    const [showUploadOverlay, setShowUploadOverlay] = useState(false);

    const [showDetailsView, setShowDetailsView] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

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

    const [tabs, setTabs] = useState([
        { id: '1', title: 'All Files', content: <DataTableDemo onFileSelect={handleFileSelect} /> }
    ]);
    const [activeTabId, setActiveTabId] = useState('1');

    const addOrActivateTab = (newTab) => {
        setTabs(prevTabs => {
            const existingTab = prevTabs.find(tab => tab.id === newTab.id);
            if (existingTab) {
                // If the tab already exists, return the current tabs array
                return prevTabs;
            } else {
                // If it's a new tab, add it
                return [...prevTabs, newTab];
            }
        });
        // Always set the active tab to the new or existing tab
        setActiveTabId(newTab.id);
    };

    function handleFileSelect(file: { id: string; name: string; s3Url: string; }) {
        setSelectedFile(file);
        console.log('Selected file:', file);
        setShowDetailsView(true);
        if (file.id && file.name && file.s3Url) {
            const newTabId = `file-${file.id}`;
            console.log('New tab ID:', newTabId);
            console.log('S3 URL:', file.s3Url);
            addOrActivateTab({
                id: newTabId,
                title: file.name,
                content: <FileViewer fileUrl={file.s3Url} />
            });
        } else {
            console.error('Incomplete file information:', file);
        }
    }

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
                <TabSystem
                    tabs={tabs}
                    activeTabId={activeTabId}
                    setActiveTabId={setActiveTabId}
                    setTabs={setTabs}
                />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={20} collapsible={true} collapsedSize={0}>
                <DetailSection
                    showDetailsView={showDetailsView}
                    setShowDetailsView={setShowDetailsView}
                    selectedFile={selectedFile}
                    onFileSelect={handleFileSelect}  // Add this line
                />
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}