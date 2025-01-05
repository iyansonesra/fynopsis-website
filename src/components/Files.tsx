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
import { DataTableDemo } from './FilesTable';

import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"

import "./Folder/styles.css";
import DetailSection from './DetailsSection';
import TabSystem from './TabSystem';
import FileViewer from './FileViewer';
import PDFViewer from './PDFViewer';
import { ThemeProvider } from '../lib/ThemeContext';


interface Tab {
    id: string;
    title: string;
    content: React.ReactNode;
}

export default function Files({ setSelectedTab }: { setSelectedTab: React.Dispatch<React.SetStateAction<string>> }) {
    const [showFolderTree, setShowFolderTree] = useState(true);
    const [folderViewWidth, setFolderViewWidth] = useState('54%');

    const [showDetailsView, setShowDetailsView] = useState(false);
    const [selectedFile, setSelectedFile] = useState<{ id: string; name: string; s3Url: string } | null>(null);

    useEffect(() => {
        if (!showFolderTree && !showDetailsView) {
            setFolderViewWidth('100%');
        } else if (!showFolderTree || !showDetailsView) {
            setFolderViewWidth('77%');
        } else {
            setFolderViewWidth('54%');
        }
    }, [showFolderTree, showDetailsView]);


    const [tabs, setTabs] = useState([
        { id: '1', title: 'All Files', content: <DataTableDemo onFileSelect={handleFileSelect} /> }
    ]);
    const [activeTabId, setActiveTabId] = useState('1');

    const addOrActivateTab = (newTab: { id: string; title: string; content: JSX.Element }) => {
        setTabs(prevTabs => {
            const existingTab = prevTabs.find(tab => tab.id === newTab.id);
            if (existingTab) {
                return prevTabs;
            } else {
                return [...prevTabs, newTab];
            }
        });
        setActiveTabId(newTab.id);
    };

    function handleFileSelect(file: { id: string; name: string; s3Url: string; }) {
        setSelectedFile(file);
        setShowDetailsView(true);
        if (file.id && file.name && file.s3Url) {
            const newTabId = `file-${file.id}`;

            addOrActivateTab({
                id: newTabId,
                title: file.name,
                content: <PDFViewer fileUrl={file.s3Url} />
            });
        } else {
            console.error('Incomplete file information:', file);
        }
    }

    return (
        <ThemeProvider>
            <ResizablePanelGroup
                direction="horizontal"
                className="bg-background flex w-full mb-2 flex-row h-full overflow-hidden font-montserrat"
            >
                <ResizablePanel defaultSize={25} maxSize={30} minSize={16} collapsible={true} collapsedSize={0}>
                    <div className="h-full flex flex-col px-4 py-2 bg-background">

                        <Select>
                            <SelectTrigger className="w-[120px] text-left align-left select-none outline-none border-none focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="Theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">By Name</SelectItem>
                                <SelectItem value="dark">By AI</SelectItem>
                            </SelectContent>
                        </Select>


                        <ScrollArea className="flex-grow p-0 h-64 overflow-auto">
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
        </ThemeProvider>
    );
}