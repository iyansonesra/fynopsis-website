import React, { memo } from 'react';
import Markdown from 'markdown-to-jsx';
import { Copy, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';
import { HoverCardPortal } from '@radix-ui/react-hover-card';
import { useFileStore } from './HotkeyService';

interface Citation {
    id: string;
    stepNumber: string;
    fileKey: string;
    chunkText: string;
    position: number;
}

interface AnswerWithCitationsProps {
    content: string;
    citations?: Citation[];
    handleSourceClick?: (fileKey: string) => void;
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

export const AnswerWithCitations = memo<AnswerWithCitationsProps>(({ content, citations = [], handleSourceClick }) => {    const handleCopyContent = () => {
        const cleanContent = content.replace(/@\d+@/g, '');
        navigator.clipboard.writeText(cleanContent);
    };

    const getCitationByStep = (stepNumber: string) => {
        return citations.find(citation => citation.stepNumber === stepNumber);
    };

    // Replace citation markers with GreenCircle components
    let transformedContent = content.replace(/@(\d+)@/g, (match, number, offset, string) => {
        const citation = getCitationByStep(number);
        const followingChar = string[offset + match.length] || '';

        if (followingChar === ' ' || followingChar === '' || followingChar === '\n') {
            return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" />\n`;
        }
        return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" />`;
    });

    if (content.includes("<t")) transformedContent = "";

    return (
        <div className="whitespace-pre-wrap relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                    onClick={handleCopyContent}
                    title="Copy answer"
                >
                    <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </Button>
            </div>
            <div className="pr-12">
                <Markdown
                    options={{
                        overrides: {
                            circle: {
                                component: ({
                                    "data-number": number,
                                    "data-filekey": fileKey
                                }: {
                                    "data-number": string;
                                    "data-filekey": string;
                                }) => (
                                    <GreenCircle
                                        number={number}
                                        fileKey={fileKey}
                                        onSourceClick={handleSourceClick}
                                    />
                                ),
                            },
                        },
                    }}
                    className='dark:text-gray-200'
                >
                    {transformedContent}
                </Markdown>
            </div>
        </div>
    );
});