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
import SpreadsheetApp from './ExcelViewer';
import { DataTable } from './newFilesTable';
import {FileSystem} from './ElevatedTable';
import { useTabStore } from './tabStore';

interface Tab {
    id: string;
    title: string;
    content: React.ReactNode;
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

// Add the interface for file selection
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
    tags: string[];
    summary: string;
    status: string;
    
}

export default function Files({ setSelectedTab }: { setSelectedTab: React.Dispatch<React.SetStateAction<string>> }) {
    const [showFolderTree, setShowFolderTree] = useState(true);
    const [folderViewWidth, setFolderViewWidth] = useState('54%');

    const [showDetailsView, setShowDetailsView] = useState(false);
    const [selectedFile, setSelectedFile] = useState<{ id: string; name: string; s3Url: string } | null>(null);
    const { 
        currentTabs,
        setCurrentTabs,
        activeTabId,
        setActiveTabId,
        initializeDefaultTab 
    } = useTabStore();
    const [tableData, setTableData] = useState<TableFile[]>([]);

    useEffect(() => {
        initializeDefaultTab(handleFileSelect);
    }, []);

    // Add debug log for table data updates
    useEffect(() => {
        console.log('Files component - Table data updated:', tableData);
    }, [tableData]);

    useEffect(() => {
        if (!showFolderTree && !showDetailsView) {
            setFolderViewWidth('100%');
        } else if (!showFolderTree || !showDetailsView) {
            setFolderViewWidth('77%');
        } else {
            setFolderViewWidth('54%');
        }
    }, [showFolderTree, showDetailsView]);

    const addOrActivateTab = (newTab: { id: string; title: string; content: JSX.Element }) => {
        setCurrentTabs(prevTabs => {
            const existingTab = prevTabs.find(tab => tab.title === newTab.title);
            if (existingTab) {
                // If tab exists, just activate it
                setActiveTabId(existingTab.id);
                return prevTabs;
            } else {
                // If it's a new tab, add it and activate it
                setActiveTabId(newTab.id);  // Set active tab ID for the new tab
                return [...prevTabs, newTab];
            }
        });
    };
    
    function handleFileSelect(file: FileSelectProps) {  // Update type here
        console.log('Files component - File selected:', file);
        setSelectedFile(file);
        setShowDetailsView(true);
        
        if (file.id && file.name && file.s3Url) {
            const newTabId = `file-${file.id}`;
            
            // Check if a tab with the same title already exists
            const existingTab = currentTabs.find(tab => tab.title === file.name);
            
            if (existingTab) {
                setActiveTabId(existingTab.id);
            } else {
                addOrActivateTab({
                    id: newTabId,
                    title: file.name,
                    content: (
                        <PDFViewer 
                            documentUrl={file.s3Url} 
                            containerId={`pdf-viewer-${file.id}`}
                        />
                    )
                });
            }
        }
    }
    

    return (
        <ThemeProvider>
            <ResizablePanelGroup
                direction="horizontal"
                className="bg-background flex w-full mb-2 flex-row h-full overflow-hidden font-montserrat dark:bg-darkbg"
            >

                <ResizablePanel defaultSize={75} minSize={40}>
                <TabSystem
                        tabs={currentTabs}
                        activeTabId={activeTabId}
                        setActiveTabId={setActiveTabId}
                        setTabs={setCurrentTabs}
                    />
                    {/* <DataTable 
                        onFileSelect={handleFileSelect} 
                        setTableData={setTableData}  // Pass setTableData to DataTable
                    /> */}
                </ResizablePanel>
                <ResizableHandle withHandle className='dark:bg-slate-900'/>
                <ResizablePanel defaultSize={25} minSize={20} collapsible={true} collapsedSize={0}>
                    <DetailSection
                        showDetailsView={showDetailsView}
                        setShowDetailsView={setShowDetailsView}
                        selectedFile={selectedFile}
                        onFileSelect={handleFileSelect}
                        tableData={tableData} // Add this prop
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </ThemeProvider>
    );
}