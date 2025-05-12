import { useState, useEffect } from 'react'
import { Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"

interface LabelsFilterProps {
    availableTags: string[];
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
    asDropdownItem?: boolean;
}

export default function LabelsFilter({ 
    availableTags = [], 
    selectedTags = [], 
    onTagsChange,
    asDropdownItem = false 
}: LabelsFilterProps) {
    // Handle checkbox change
    const handleTagToggle = (tag: string) => {
        const updatedTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag];

        // Apply changes immediately
        onTagsChange(updatedTags);
    };

    // Clear all filters
    const clearFilters = () => {
        onTagsChange([]);
    };

    // Display selected tag count
    const getTagsDisplayText = () => {
        if (selectedTags.length === 0) return "Labels";
        return `Labels`;
    };

    // Render the filter content (checkboxes, etc.)
    const renderFilterContent = () => (
        <>
            <div className="px-4 pt-4">
                <div className="text-sm font-medium mb-2">
                    Filter by labels
                    <span className="font-normal text-gray-500 text-xs ml-1">
                        (Shows issues with any selected label)
                    </span>
                </div>
                {selectedTags.length > 0 && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        className="text-xs h-7 mb-2"
                    >
                        Clear all
                    </Button>
                )}
            </div>

            <ScrollArea className="h-64">
                <div className="px-4 pb-2">
                    {availableTags.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-2">
                            No labels found
                        </div>
                    ) : (
                        availableTags.map(tag => (
                            <div key={tag} className="flex items-center space-x-2 py-1">
                                <Checkbox 
                                    id={`tag-${tag}`} 
                                    checked={selectedTags.includes(tag)}
                                    onCheckedChange={() => handleTagToggle(tag)}
                                />
                                <label 
                                    htmlFor={`tag-${tag}`}
                                    className="text-sm cursor-pointer flex-grow"
                                >
                                    {tag}
                                </label>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </>
    );

    // If used as dropdown item
    if (asDropdownItem) {
        return (
            <DropdownMenuSubContent className="w-64 p-0">
                {renderFilterContent()}
            </DropdownMenuSubContent>
        );
    }

    // Default standalone button with popover
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-sm flex items-center gap-1">
                    <Tag className="h-4 w-4 mr-1" />
                    <span>{getTagsDisplayText()}</span>
                    {selectedTags.length > 0 && (
                        <Badge variant="secondary" className="ml-1 px-1 py-0 h-5 text-xs">
                            {selectedTags.length}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
                {renderFilterContent()}
            </PopoverContent>
        </Popover>
    );
}