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
import SpreadsheetApp from './ExcelViewer';
import { DataTable } from './newFilesTable';
import {FileSystem} from './ElevatedTable';


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
        { id: '1', title: 'All Files', content: <FileSystem onFileSelect={handleFileSelect}/> },    ]);
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
            console.log('url:', file.s3Url);

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
        } else {
            console.error('Incomplete file information:', file);
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
                        setTabs={setTabs}
                    />
                </ResizablePanel>
                <ResizableHandle withHandle className='dark:bg-slate-900'/>
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