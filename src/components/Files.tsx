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
import { FileSystem } from './UltraTable';
import { useTabStore } from './tabStore';
import { useFileStore } from './HotkeyService';
import BasicPDFViewer from './PDFTest';
import PDFHighlighterViewer from './PDFHighlight';
import PDFHighlighterComponent from './PDFHighlight';
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
    parentId: string;
    name: string;
    uploadedBy: string;
    type: string;
    size: string;
    id: string;
    isFolder: boolean;
    createByEmail: string;
    createByName: string;
    lastModified: string;
    tags: DocumentTags | null;
    summary: string;
    status: string;
    s3Url?: string;
}

interface DateInfo {
    date: string;
    type: string;
    description: string;
}

interface DocumentTags {
    document_type: string;
    relevant_project: string;
    involved_parties: string[];
    key_topics: string[];
    dates: DateInfo[];
    deal_phase: string;
    confidentiality: string;
}

export default function Files({ setSelectedTab }: { setSelectedTab: React.Dispatch<React.SetStateAction<string>> }) {
    const [showFolderTree, setShowFolderTree] = useState(true);
    const [folderViewWidth, setFolderViewWidth] = useState('54%');

    const {
        showDetailsView,
        setShowDetailsView,
        selectedFile,
        setSelectedFile
    } = useFileStore();
    const { tabs, activeTabId, setActiveTabId, addTab } = useTabStore();

    const [tableData, setTableData] = useState<TableFile[]>([]);

    useEffect(() => {
        // Only initialize if there are no tabs
        if (tabs.length === 0) {
            addTab({
                id: 'all-files',
                title: 'All Files',
                content: <FileSystem onFileSelect={handleFileSelect} />
            });
        }
    }, []);

    useEffect(() => {
        if (!showFolderTree && !showDetailsView) {
            setFolderViewWidth('100%');
        } else if (!showFolderTree || !showDetailsView) {
            setFolderViewWidth('77%');
        } else {
            setFolderViewWidth('54%');
        }
    }, [showFolderTree, showDetailsView]);

    // const addOrActivateTab = (newTab: { id: string; title: string; content: JSX.Element }) => {
    //     setCurrentTabs(prevTabs => {
    //         const existingTab = prevTabs.find(tab => tab.title === newTab.title);
    //         if (existingTab) {
    //             // If tab exists, just activate it
    //             setActiveTabId(existingTab.id);
    //             return prevTabs;
    //         } else {
    //             // If it's a new tab, add it and activate it
    //             setActiveTabId(newTab.id);  // Set active tab ID for the new tab
    //             return [...prevTabs, newTab];
    //         }
    //     });
    // };

    useEffect(() => {
        console.log("showDetailsView changed:", showDetailsView);
    }, [showDetailsView]);

    // Remove the addOrActivateTab function and update handleFileSelect:
    function handleFileSelect(file: FileSelectProps) {
        console.log('Files component - File selected:', file);
        setSelectedFile(file);
        if (file.type && file.type.length > 0) {
            console.log("WE IN\n");
            setShowDetailsView(true);
        }

        if (file.id && file.name && file.s3Url) {
            const newTabId = `file-${file.id}`;

            // Use the store's methods directly
            const existingTab = tabs.find(tab => tab.title === file.name);

            console.log("file url", file.s3Url);

            if (existingTab) {
                // Just activate the existing tab
                setActiveTabId(existingTab.id);
            } else {
                addTab({
                    id: newTabId,
                    title: file.name,
                    content: (
                        // <PDFViewer 
                        //   documentUrl={file.s3Url} 
                        //   containerId={`pdf-viewer-${file.id}`}
                        //   tabId={newTabId}  // Add this prop
                        //   name={file.name}
                        // />
                        // <PDFHighlighterComponent
                        //     documentUrl={file.s3Url}
                        // />
                        <PDFViewer
                            documentUrl={file.s3Url}
                            containerId={`pdf-viewer-${file.id}`}
                            tabId={newTabId}  // Use the actual tab ID
                            name={file.name}  // Make sure name is explicitly passed
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
                        tabs={tabs}
                        activeTabId={activeTabId}
                        setActiveTabId={setActiveTabId}
                        setTabs={(newTabs) => {
                            if (typeof newTabs === 'function') {
                                const updatedTabs = newTabs(tabs);
                                useTabStore.getState().setTabs(updatedTabs);
                            } else {
                                useTabStore.getState().setTabs(newTabs);
                            }
                        }}
                    />
                    {/* <DataTable 
                        onFileSelect={handleFileSelect} 
                        setTableData={setTableData}  // Pass setTableData to DataTable
                    /> */}
                </ResizablePanel>
                <ResizableHandle withHandle className='dark:bg-slate-900' />
                <ResizablePanel defaultSize={25} minSize={20} collapsible={true} collapsedSize={0}>
                    <DetailSection
                        key={`detail-section-${showDetailsView}`}
                        onFileSelect={handleFileSelect}
                        tableData={tableData} // Add this prop
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </ThemeProvider>
    );
}