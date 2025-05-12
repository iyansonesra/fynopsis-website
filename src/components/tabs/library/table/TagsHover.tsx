import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../../ui/hover-card';
import { FileText, Calendar, Users, Tags, Shield } from 'lucide-react';

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

interface TagDisplayProps {
    tags: DocumentTags | null;
}

export const TagDisplay: React.FC<TagDisplayProps> = ({ tags }) => {
    if (!tags) {
        return <span className="text-gray-400 dark:text-gray-500">No tags</span>;
    }

    return (
        <HoverCard openDelay={100} closeDelay={0}>
            <HoverCardTrigger asChild>
                <div className="flex items-center gap-2">
                    {/* Primary visible tags */}
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {tags.document_type}
                    </span>
                    + {tags.key_topics?.length || 0}
                    {/* <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
            {tags.deal_phase}
          </span> */}

                </div>
            </HoverCardTrigger>

            <HoverCardContent className="w-[32rem] p-4 z-[9999] dark:bg-gray-900 dark:border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-4">
                        {/* Project Section */}
                        <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2 dark:text-white">
                                <FileText className="h-4 w-4" />
                                Project
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{tags.relevant_project}</p>
                        </div>

                        {/* Involved Parties Section */}
                        <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2 dark:text-white">
                                <Users className="h-4 w-4" />
                                Involved Parties
                            </h4>
                            <div className="flex flex-wrap gap-1">
                                {tags.involved_parties?.length > 0 ? tags.involved_parties.map((party, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                    >
                                        {party}
                                    </span>
                                )) : <span className="text-gray-400 dark:text-gray-500">No parties</span>}
                            </div>
                        </div>

                        {/* Confidentiality Section */}
                        <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2 dark:text-white">
                                <Shield className="h-4 w-4" />
                                Confidentiality
                            </h4>
                            <span className="px-2 py-1 text-xs rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                {tags.confidentiality}
                            </span>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        {/* Key Topics Section */}
                        <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2 dark:text-white">
                                <Tags className="h-4 w-4" />
                                Key Topics
                            </h4>
                            <div className="flex flex-wrap gap-1">
                                {tags.key_topics?.length > 0 ? tags.key_topics.map((topic, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 text-xs rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                    >
                                        {topic}
                                    </span>
                                )) : <span className="text-gray-400 dark:text-gray-500">No topics</span>}
                            </div>
                        </div>

                        {/* Dates Section */}
                        <div>
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-2 dark:text-white">
                                <Calendar className="h-4 w-4" />
                                Important Dates
                            </h4>
                            <div className="space-y-2 w-full">
                                {tags.dates?.length > 0 ? tags.dates.map((dateInfo, index) => (
                                    <div key={index} className="text-xs flex items-start gap-2 w-full flex-wrap">
                                        <span className="font-medium dark:text-gray-200 w-[80px] shrink-0">
                                            {new Date(dateInfo.date).toLocaleDateString()}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 text-xs break-words flex-1 text-wrap">
                                            {dateInfo.description}
                                        </span>
                                    </div>
                                )) : <span className="text-gray-400 dark:text-gray-500">No dates</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
};