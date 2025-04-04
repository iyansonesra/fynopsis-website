import React, { useState, useEffect } from 'react';
import logo from '../app/assets/fynopsis_noBG.png'
import { ScrollArea } from '@radix-ui/react-scroll-area';
import TreeFolder from '../../../Folder/Tree';
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

import "./../../../../components/Folder/styles.css";
import DetailSection from '../querying/DetailsSection';
import TabSystem from './TabSystem';
import PDFViewer from './PDFViewer';
import { ThemeProvider } from '../../../../lib/ThemeContext';
import SpreadsheetApp from './ExcelViewer';
import { FileSystem } from './UltraTable';
import { useTabStore } from '../../../tabStore';
import { useFileStore } from '../../../services/HotkeyService';
import BasicPDFViewer from './PDFTest';
import PDFHighlighterViewer from './PDFHighlight';
import PDFHighlighterComponent from './PDFHighlight';
import type { IHighlight } from "react-pdf-highlighter"; // Add this import
import FolderTree from '../folder_tree/folderTree';


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

interface DocumentBounds {
    page: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    chunk_title?: string;
    is_secondary?: boolean;
    kg_properties?: any;
    page_num?: number;
    bounding_box?: any;
}

export default function Files({ setSelectedTab }: { setSelectedTab: React.Dispatch<React.SetStateAction<string>> }) {
    const [showFolderTree, setShowFolderTree] = useState(true);
    const [folderViewWidth, setFolderViewWidth] = useState('54%');

    const {
        showDetailsView,
        setShowDetailsView,
        selectedFile,
        setSelectedFile,
        // Add the new properties from the store
        tabSystemPanelSize,
        detailSectionPanelSize,
        setTabSystemPanelSize,
        setDetailSectionPanelSize
    } = useFileStore();

    const handleTabSystemResize = (size: number) => {
        setTabSystemPanelSize(size);
    };

    const handleDetailSectionResize = (size: number) => {
        setDetailSectionPanelSize(size);
    };


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

    const boundsToHighlight = (bounds: DocumentBounds, fileId: string, chunkTitle?: string): IHighlight => {
        const id = String(Math.random()).slice(2);
        const width = bounds.x1 - bounds.x0;
        const height = bounds.y1 - bounds.y0;

        return {
            id,
            content: {
                text: chunkTitle || "Highlighted area"
            },
            comment: {
                text: chunkTitle || "",
                emoji: ""
            },
            position: {
                boundingRect: {
                    x1: bounds.x0,
                    y1: bounds.y0,
                    x2: bounds.x1,
                    y2: bounds.y1,
                    width,
                    height,
                    pageNumber: bounds.page_num || 0 + 1
                },
                rects: [{
                    x1: bounds.x0,
                    y1: bounds.y0,
                    x2: bounds.x1,
                    y2: bounds.y1,
                    width,
                    height,
                    pageNumber: bounds.page_num || 0 + 1
                }],
                pageNumber: bounds.page_num || 0
            }
        };
    };

    useEffect(() => {
        console.log("showDetailsView changed:", showDetailsView);
    }, [showDetailsView]);

    // Remove the addOrActivateTab function and update handleFileSelect:
    function handleFileSelect(file: FileSelectProps, fileChunk?: string) {
        console.log('Files component - File selected:', file);
        let highlightData: IHighlight[] = [];

        const createEmptyHighlight = (): IHighlight => {
            return {
                id: String(Math.random()).slice(2),
                content: {
                    text: "Empty highlight"
                },
                comment: {
                    text: "",
                    emoji: ""
                },
                position: {
                    boundingRect: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 0,
                        width: 0,
                        height: 0,
                    },
                    rects: [
                        {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 0,
                            width: 0,
                            height: 0,
                        },
                    ],
                    pageNumber: 1,
                },
            };
        };

        if (fileChunk) {
            console.log("FILE CHUNK", fileChunk);
            const boundsKey = `${file.id}::${fileChunk}`;
            const bounds = useFileStore.getState().getDocumentBounds(boundsKey);
            console.log("BOUNDS", bounds);
            if (bounds) {
                const highlight = boundsToHighlight(bounds, file.id, bounds.chunk_title);
                console.log("Found bounds for chunk:", highlight);
                highlightData.push(highlight);
                highlightData.push(createEmptyHighlight());

            } else {
                highlightData.push(createEmptyHighlight());
            }
        } else {
            console.log("FILE CHUNK NA");
            highlightData.push(createEmptyHighlight());
        }

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
            console.log("file name", file.name);

            if (existingTab) {
                // Just activate the existing tab
                console.log("existing tab", existingTab);
                setActiveTabId(existingTab.id);
            } else {
                console.log("new tab", newTabId);
                addTab({
                    id: newTabId,
                    title: file.name,
                    content: (
                        <PDFViewer
                            documentUrl={file.s3Url}
                            containerId={`pdf-viewer-${file.id}`}
                            tabId={newTabId}  // Use the actual tab ID
                            name={file.name}  // Make sure name is explicitly passed
                            boundingBoxes={highlightData} // Always pass the array - empty or with highlights
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

                <ResizablePanel
                    defaultSize={tabSystemPanelSize}
                    minSize={20}
                    maxSize={20}
                    collapsible={true}
                    collapsedSize={0}
                    onResize={handleTabSystemResize}
                >
                    
                    <FolderTree />

                </ResizablePanel>
                <ResizableHandle withHandle className='dark:bg-slate-900' />

                <ResizablePanel
                    defaultSize={tabSystemPanelSize}
                    minSize={40}
                    onResize={handleTabSystemResize}
                >
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

                </ResizablePanel>
                <ResizableHandle withHandle className='dark:bg-slate-900' />
                <ResizablePanel
                    defaultSize={detailSectionPanelSize}
                    minSize={20}
                    collapsible={true}
                    collapsedSize={0}
                    onResize={handleDetailSectionResize}
                >
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