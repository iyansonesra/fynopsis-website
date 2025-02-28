import React, { memo, useMemo } from 'react';
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
    
    // Remove the console.log that can cause unnecessary re-renders
    // console.log('GreenCircle rendering 2');

    // Use useMemo to avoid recalculating the file name on every render
    const fileName = useMemo(() => {
        if (!fileKey) return '';
        return getFileName(fileKey.split('/').pop() || '');
    }, [fileKey, getFileName]);

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
}, (prevProps, nextProps) => {
    // Strict equality check for props that matter
    return prevProps.number === nextProps.number &&
        prevProps.fileKey === nextProps.fileKey;
});



export const AnswerWithCitations = memo<AnswerWithCitationsProps>(({ content, citations = [], handleSourceClick }) => {
    const handleCopyContent = () => {
        const cleanContent = content.replace(/@\d+@/g, '');
        navigator.clipboard.writeText(cleanContent);
    };

    const getCitationByStep = (stepNumber: string) => {
        return citations.find(citation => citation.stepNumber === stepNumber);
    };

    // Process the content once using useMemo to avoid re-processing on every render
    const transformedContent = useMemo(() => {
        if (content.includes("<t")) return "";
        
        return content.replace(/@(\d+)@/g, (match, number, offset, string) => {
            const citation = getCitationByStep(number);
            const followingChar = string[offset + match.length] || '';

            if (followingChar === ' ' || followingChar === '' || followingChar === '\n') {
                return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" />\n`;
            }
            return `<circle data-number="${number}" data-filekey="${citation?.fileKey || ''}" />`;
        });
    }, [content, citations]);

    // Define interface for circle component props
    interface CircleComponentProps {
        'data-number': string;
        'data-filekey': string;
    }

    const circleComponent = useMemo(() => {
        return React.memo((props: CircleComponentProps) => (
            <GreenCircle
                number={props["data-number"]}
                fileKey={props["data-filekey"]}
                onSourceClick={handleSourceClick}
            />
        ),
        (prevProps: CircleComponentProps, nextProps: CircleComponentProps) => 
            prevProps["data-number"] === nextProps["data-number"] &&
            prevProps["data-filekey"] === nextProps["data-filekey"]
        );
    }, [handleSourceClick]);

    const markdownOptions = useMemo(() => ({
        // overrides: {
        //     circle: {
        //         component: circleComponent
        //     },
        // },
    }), [circleComponent]);

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
                    options={markdownOptions}
                    className='dark:text-gray-200'
                >
                    {transformedContent}
                </Markdown>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Keep existing comparison logic
    if (prevProps.content !== nextProps.content) return false;
    
    // If citations array changed completely, re-render
    if (prevProps.citations !== nextProps.citations) {
        // Even if array reference changed, check if contents are the same
        if (!prevProps.citations || !nextProps.citations) return false;
        if (prevProps.citations.length !== nextProps.citations.length) return false;
        
        // Deep compare citations
        for (let i = 0; i < prevProps.citations.length; i++) {
            const prevCitation = prevProps.citations[i];
            const nextCitation = nextProps.citations[i];
            if (prevCitation.stepNumber !== nextCitation.stepNumber || 
                prevCitation.fileKey !== nextCitation.fileKey) {
                return false;
            }
        }
    }
    
    return true;
});
