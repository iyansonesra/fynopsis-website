// components/TagDisplay.tsx
import React from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';

interface TagDisplayProps {
    tags: string[];
}

export const TagDisplay: React.FC<TagDisplayProps> = ({ tags }) => {
    const tagsArray = Array.isArray(tags) ? tags : [];

    if (tagsArray.length === 0) {
        return <span className="text-gray-400 dark:text-gray-500">No tags</span>;
    }

    const remainingCount = tagsArray.length - 1;

    return (
        <HoverCard openDelay={100} closeDelay={0}>
        <HoverCardTrigger asChild>
        <div className="flex items-center gap-1">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 
                            text-blue-700 dark:text-blue-300">
                            {tagsArray[0]}
                        </span>
                        {remainingCount > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{remainingCount}
                            </span>
                        )}
                    </div>
        </HoverCardTrigger>
        {remainingCount > 0 && (

        <HoverCardContent
        className="flex flex-wrap gap-1 max-w-[200px] p-2 z-[9999] dark:bg-gray-900 dark:border-none"
                  side="bottom"
          align="center"
          sideOffset={5}
        >
  {tagsArray.slice(1).map((tag, index) => (
                            <span 
                                key={index}
                                className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 
                                    text-blue-700 dark:text-blue-300"
                            >
                                {tag}
                            </span>
                        ))}        </HoverCardContent>
                    )}
      </HoverCard>
       
    );
};
