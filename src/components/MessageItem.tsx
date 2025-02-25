import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from 'react';
import { ArrowLeft, ArrowUp, BadgeInfo, FileText, Footprints, Plus, PlusCircle, Search, MessageSquare, ReceiptText, SearchIcon, Database, User, Tags, AlignLeft, History, Copy } from 'lucide-react';
import { Input, Skeleton } from '@mui/material';
import { Button } from './ui/button';
import { post, get } from 'aws-amplify/api';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Card, CardContent } from './ui/card';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import ReactMarkdown from 'react-markdown';
import Markdown from 'markdown-to-jsx';

import { getCurrentUser } from 'aws-amplify/auth';
import aws4 from 'aws4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Credentials } from '@aws-sdk/types';
import { TbH1 } from 'react-icons/tb';
import logo from './../app/assets/fynopsis_noBG.png'
import '../components/temp.css';
import loadingAnimation from './../app/assets/fynopsis_animated.svg'
import staticImage from './../app/assets/fynopsis_static.svg'
import { Separator } from './ui/separator';
import { usePathname } from 'next/navigation';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { TextShimmer } from './ui/text-shimmer';
import { AIInputWithSearch } from './ui/ai-input-with-search';
import { useS3Store } from './fileService';
import { useFileStore } from './HotkeyService';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { TagDisplay } from './TagsHover';
import reactStringReplace from "react-string-replace";
import { AnswerWithCitations } from './AnswerWithCitations';

import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ContainerScroll } from './ui/container-scroll-animation';
import { HoverCardPortal } from '@radix-ui/react-hover-card';

interface ThoughtStep {
    number: number;
    content: string;
}

interface SearchResponse {
    response: string;
    sources: Record<string, any>;
    thread_id: string;
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

interface Source {
    id: string,
    pageNumber: number,
    chunkTitle: string,
    chunkText: string,
}

interface Citation {
    id: string;
    stepNumber: string;
    fileKey: string;
    chunkText: string;
    position: number;  // Position in the text where citation appears
}

interface MessageItemProps {
    message: Message;
    index: number;
    isLastMessage: boolean;
    handleSourceCardClick: (sourceUrl: string) => void;
    getFileName: (filename: string) => string;
    accordionValues: { [key: string]: string };
    setAccordionValues: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}





// Modify the Message interface to include citations
interface Message {
    type: 'question' | 'answer' | 'error';
    content: string;
    sources?: Source[];
    steps?: ThoughtStep[];
    progressText?: string;
    sourcingSteps?: string[];
    subSources?: Record<string, any>;
    citations?: Citation[];  // Add this new field
}

interface DetailsSectionProps {

    onFileSelect: (file: FileSelectProps) => void; // Changed type
    tableData: TableFile[]; // Add this prop
}

// Add new interface for onFileSelect properties
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
    tags: DocumentTags | null;
    summary: string;
    status: string;
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

interface MessageState {
    messages: Message[];
    isProcessing: boolean;
    progressText: string;
    currentSteps: ThoughtStep[];
}

interface GreenCircleProps {
    number: string;
    fileKey?: string;
    onSourceClick?: (fileKey: string) => void;
}

// Helper function to get file name - you need to implement this or pass it
const GreenCircle = memo<GreenCircleProps>(({ number, fileKey, onSourceClick }) => {
    const getFileName = useFileStore(state => state.getFileName);

    console.log("GreenCircle rendered");
    console.log("fileKey", fileKey);
    // console.log("filekey split", fileKey.split('/').pop());
    const fileName = fileKey ? getFileName(fileKey.split('/').pop() || '') : '';

    return (
        <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
                <span
                    className={`inline-flex justify-center items-center w-5 h-5 bg-slate-400 dark:bg-slate-600 rounded-lg text-white text-xs font-normal mx-1 ${fileKey ? 'cursor-pointer hover:bg-slate-500 dark:hover:bg-slate-700' : ''}`}
                    onClick={() => fileKey && onSourceClick?.(fileKey)}
                >
                    {number}
                </span>
            </HoverCardTrigger>
            {fileKey && (
                <HoverCardPortal>
                    <HoverCardContent className="p-2 dark:bg-gray-900 dark:border-gray-800 z-[9999] w-fit">
                        <div className="flex items-left space-x-2">
                            <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="truncate w-full">
                                    {fileName.length > 30 ? `${fileName.substring(0, 15)}...${fileName.substring(fileName.length - 15)}` : fileName}
                                </span>
                            </span>
                        </div>
                    </HoverCardContent>
                </HoverCardPortal>
            )}
        </HoverCard>
    );
});



export const MessageItem = memo<MessageItemProps>(({
    message,
    index,
    isLastMessage,
    handleSourceCardClick,
    getFileName,
    accordionValues,
    setAccordionValues
}) => {

    const getCitationByStep = (stepNumber: string) => {
        return message.citations?.find(citation => citation.stepNumber === stepNumber);
    };

    const handleSourceClick = (fileKey: string) => {
        handleSourceCardClick(fileKey);
    };

    useEffect(() => {
        // Set accordions to open by default
        setAccordionValues(prev => ({
            ...prev,
            [`accordion-${index}`]: prev[`accordion-${index}`] === undefined ? 'steps' : prev[`accordion-${index}`],
            [`progress-${index}`]: prev[`progress-${index}`] === undefined ? 'progress' : prev[`progress-${index}`]
        }));

        // Close progress accordion when thinking is complete
        if (message.steps && message.steps.length > 0) {
            setAccordionValues(prev => ({
                ...prev,
                [`progress-${index}`]: ''
            }));
        }
    }, [message.progressText, index, setAccordionValues]);

    const AnimatedProgressText: React.FC<{ text: string }> = ({ text }) => {
        return (
            <div className="relative h-6 overflow-hidden w-full flex items-center justify-start">
                <div key={text} className="w-full flex justify-start">
                    {text === "Thinking complete" ? (
                        <span className="text-xs">{text}</span>
                    ) : (
                        <div className="text-xs text-left animate-pulse">{text}</div>
                    )}
                </div>
            </div>
        );
    };

    if (message.type === 'question') {
        return (
            <div className={`flex items-end dark:text-white mt-4 ${isLastMessage ? 'mb-8' : ''}`}>
                <p className="text-2xl font-medium dark:text-white pr-4 rounded-lg w-[70%]">{message.content}</p>
            </div>
        );
    }

    if (message.type === 'error') {
        return (
            <div className="w-full">
                <div className="mr-auto mb-6 rounded-lg bg-red-50 dark:bg-red-900/10 p-4">
                    <div className='flex flex-row gap-2 items-center mb-3'>
                        <BadgeInfo className="h-5 w-5 text-red-500" />
                        <h1 className='text-red-500 font-semibold'>Error</h1>
                    </div>
                    <ReactMarkdown className="text-wrap text-sm pr-4 text-red-600 dark:text-red-400 leading-7">
                        {message.content}
                    </ReactMarkdown>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full gap-0 mt-4 max-w-full ${isLastMessage ? 'mb-8' : ''}`}>
            {/* Steps and progress section */}
            {((message.steps && message.steps.length > 0) || (message.progressText)) && (
                <div className="w-full pr-4 pb-0">
                    <Accordion
                        type="single"
                        collapsible
                        value={accordionValues[`accordion-${index}`] || ''}
                        onValueChange={(value) => {
                            setAccordionValues(prev => ({
                                ...prev,
                                [`accordion-${index}`]: value
                            }));
                        }}
                        className="w-full -space-y-px mb-2"
                    >
                        <AccordionItem
                            value="steps"
                            className="border bg-background px-4 py-1 rounded-lg dark:bg-darkbg dark:border-slate-800 w-full"
                        >
                            <AccordionTrigger className="py-1 text-[15px] leading-6 hover:no-underline dark:text-slate-400 flex items-center justify-center">
                                <div className="flex flex-row gap-2 items-center w-full justify-between pr-2">
                                    <div className="flex flex-row gap-2 items-center">
                                        <SearchIcon className="h-4 w-4 text-gray-500" />
                                        <h1>Pro Search</h1>
                                    </div>
                                    <h1 className="text-sm font-light">{message.steps?.length || 0} steps</h1>
                                </div>
                            </AccordionTrigger>

                            <AccordionContent className="pb-2 pt-2 text-muted-foreground w-full">
                                {message.progressText && (
                                    <Accordion
                                        type="single"
                                        collapsible
                                        value={accordionValues[`progress-${index}`] || ''}
                                        onValueChange={(value) => {
                                            setAccordionValues(prev => ({
                                                ...prev,
                                                [`progress-${index}`]: value
                                            }));
                                        }}
                                        className="w-full mb-3"
                                    >
                                        <AccordionItem
                                            value="progress"
                                            className="border-none bg-slate-50 dark:bg-slate-800/50 rounded-md w-full"
                                        >
                                            <AccordionTrigger className="py-2 px-3 text-xs hover:no-underline">
                                                <AnimatedProgressText text={message.progressText || ''} />
                                            </AccordionTrigger>
                                            <AccordionContent className="px-3 pb-2 w-full overflow-hidden">
                                                {message.sourcingSteps && message.sourcingSteps.length > 0 ? (
                                                    <div className="space-y-2 w-full">
                                                        {message.sourcingSteps.map((step, stepIdx) => (
                                                            <div key={stepIdx} className="space-y-1 w-full">
                                                                <div className="w-full animate-slide-down" style={{
                                                                    animation: 'slideDown 0.3s ease-out forwards'
                                                                }}>
                                                                    <div className="text-xs text-gray-600 dark:text-gray-300">
                                                                        {step}
                                                                    </div>
                                                                    {/* Sub-sources for first step */}
                                                                    {/* Sub-sources for first step */}
                                                                    {stepIdx === 0 && message.subSources && (
                                                                        <div className="w-full overflow-hidden">
                                                                            <div className="relative w-full overflow-hidden">
                                                                                <div className="w-full overflow-x-auto py-2">
                                                                                    <ScrollArea className="flex gap-2 min-w-0 flex-col">
                                                                                        {Object.entries(message.subSources).slice(0, 1).map(([fileName, fileKey]) => (
                                                                                            <div
                                                                                                key={fileKey}
                                                                                                className="shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                                                                                onClick={() => handleSourceCardClick(fileKey as string)}
                                                                                            >
                                                                                                <FileText className="h-3 w-3 text-slate-500 dark:text-slate-400 shrink-0" />
                                                                                                <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                                                                                                    {fileName}
                                                                                                </span>
                                                                                            </div>
                                                                                        ))}

                                                                                        {Object.keys(message.subSources).length > 2 && (
                                                                                            <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400 mt-2">
                                                                                                +{Object.keys(message.subSources).length - 2} more sources
                                                                                            </div>
                                                                                        )}
                                                                                    </ScrollArea>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-500">No sourcing steps available</div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                )}

                                {/* Step content */}
                                {message.steps && message.steps.length > 0 ? (
                                    <div className="steps-container flex flex-col space-y-2">
                                        {message.steps.map((step, stepIndex) => (
                                            <div key={stepIndex} className="step-item w-full">
                                                <Markdown
                                                    options={{
                                                        overrides: {
                                                            p: {
                                                                component: 'div',
                                                                props: {
                                                                    className: 'flex flex-row gap-2 items-start',
                                                                },
                                                            },
                                                            circle: {
                                                                component: ({ "data-number": number, "data-filekey": fileKey }) => (
                                                                    <GreenCircle
                                                                        number={number}
                                                                        fileKey={fileKey}
                                                                        onSourceClick={handleSourceClick}
                                                                    />
                                                                ),
                                                            },
                                                        }
                                                    }}
                                                >
                                                    {(() => {
                                                        const content = `<span class="text-xs text-gray-500 whitespace-nowrap">${step.number}. </span><span class="text-xs text-gray-700 dark:text-gray-300 font-normal">${step.content}</span>`;

                                                        // Transform content to include citation circles if needed
                                                        let transformedContent = content.replace(/@(\d+)@/g, (match, number, offset, string) => {
                                                            const citation = getCitationByStep(number);
                                                            const followingChar = string[offset + match.length] || '';

                                                            if (followingChar === ' ' || followingChar === '' || followingChar === '\n') {
                                                                return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" />\n`;
                                                            }
                                                            return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" />`;
                                                        });

                                                        return transformedContent;
                                                    })()}
                                                </Markdown>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-500"></div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

            )}

            {/* Sources section */}
            {message.sources && message.sources.length > 0 && (
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex space-x-2 p-2 mb-4">
                        {message.sources.map((source, idx) => (
                            <div
                                key={idx}
                                className="inline-flex flex-col justify-between min-h-[80px] w-[200px] px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                onClick={() => handleSourceCardClick(source.id)}
                            >
                                <div className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">
                                    {source.chunkTitle}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <FileText className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                        {getFileName(source.id.split('/').pop() || '')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            )}

            <div className="mr-auto mb-6 rounded-lg mt-4">
                <AnswerWithCitations
                    content={message.content}
                    citations={message.citations || []}
                    handleSourceClick={handleSourceCardClick}
                />
            </div>

            {/* Separator for non-last messages */}
            {!isLastMessage && (
                <Separator className="bg-slate-200 dark:bg-slate-800 w-full" orientation='horizontal' />
            )}
        </div>
    );
});
