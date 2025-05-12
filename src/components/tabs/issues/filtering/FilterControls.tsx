import { useState, useEffect } from 'react'
import { MoreHorizontal, Check, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import LabelsFilter from './LabelsFilter'

interface IssueFiltersProps {
    availableTags: string[];
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
    sortOption?: string;               // Add this prop
    onSortChange?: (option: string) => void;  // Add this prop
}

export function IssueFilters({
    availableTags = [],
    selectedTags = [],
    onTagsChange,
    sortOption = 'newest',      // Default value
    onSortChange = () => { }     // Default empty function
}: IssueFiltersProps) {

    const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(selectedTags);

    // Update local state when prop changes
    useEffect(() => {
        setLocalSelectedTags(selectedTags);
    }, [selectedTags]);

    // Handle checkbox change
    const handleTagToggle = (tag: string) => {
        const updatedTags = selectedTags.includes(tag)
            ? selectedTags.filter(t => t !== tag)
            : [...selectedTags, tag];

        // Apply changes immediately
        onTagsChange(updatedTags);
    };

    const handleSortChange = (value: string) => {
        if (onSortChange) {
            onSortChange(value);
        }
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

    const applyFilters = () => {
        onTagsChange(localSelectedTags);
    };



    return (
        <div className="flex flex-row gap-2 md:ml-auto select-none outline-none">
            {/* Most important filters visible on larger screens */}
            <div className="hidden 2xl:flex gap-2">
                <LabelsFilter
                    availableTags={availableTags}
                    selectedTags={selectedTags}
                    onTagsChange={onTagsChange}
                />








                <Select value={sortOption} onValueChange={handleSortChange}  >
                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100 outline-none select-none">
                        <div className="flex items-center">
                            <span>{sortOption === 'newest' ? 'Newest' : 'Oldest'}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Some filters visible on xl screens */}
            <div className="hidden xl:flex 2xl:hidden gap-2">

                <LabelsFilter
                    availableTags={availableTags}
                    selectedTags={selectedTags}
                    onTagsChange={onTagsChange}
                />




                <Select value={sortOption} onValueChange={handleSortChange} >
                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100 outline-none select-none">
                        <div className="flex items-center">
                            <span>{sortOption === 'newest' ? 'Newest' : 'Oldest'}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                    </SelectContent>
                </Select>

                {/* Dropdown for xl screens for the remaining options */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>More filters</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Fewer filters visible on lg screens */}
            <div className="hidden lg:flex xl:hidden gap-2">


                <LabelsFilter
                    availableTags={availableTags}
                    selectedTags={selectedTags}
                    onTagsChange={onTagsChange}
                />

                {/* Dropdown for lg screens */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>More filters</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Sort</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem
                                    onClick={() => handleSortChange('newest')}
                                    className={sortOption === 'newest' ? 'bg-gray-100' : ''}
                                >
                                    {sortOption === 'newest' && <Check className="h-4 w-4 mr-2" />}
                                    Newest
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleSortChange('oldest')}
                                    className={sortOption === 'oldest' ? 'bg-gray-100' : ''}
                                >
                                    {sortOption === 'oldest' && <Check className="h-4 w-4 mr-2" />}
                                    Oldest
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* One filter visible on md screens */}
            <div className="hidden md:flex lg:hidden gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>More filters</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
                            <LabelsFilter
                                availableTags={availableTags}
                                selectedTags={selectedTags}
                                onTagsChange={onTagsChange}
                                asDropdownItem={true}
                            />
                        </DropdownMenuSub>

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Sort</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem
                                    onClick={() => handleSortChange('newest')}
                                    className={sortOption === 'newest' ? 'bg-gray-100' : ''}
                                >
                                    {sortOption === 'newest' && <Check className="h-4 w-4 mr-2" />}
                                    Newest
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleSortChange('oldest')}
                                    className={sortOption === 'oldest' ? 'bg-gray-100' : ''}
                                >
                                    {sortOption === 'oldest' && <Check className="h-4 w-4 mr-2" />}
                                    Oldest
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Only "..." dropdown on smallest screens */}
            <div className="flex md:hidden gap-2">

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filter options</DropdownMenuLabel>
                        <DropdownMenuSeparator />



                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
                            <LabelsFilter
                                availableTags={availableTags}
                                selectedTags={selectedTags}
                                onTagsChange={onTagsChange}
                                asDropdownItem={true}
                            />
                        </DropdownMenuSub>

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Sort</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem
                                    onClick={() => handleSortChange('newest')}
                                    className={sortOption === 'newest' ? 'bg-gray-100' : ''}
                                >
                                    {sortOption === 'newest' && <Check className="h-4 w-4 mr-2" />}
                                    Newest
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleSortChange('oldest')}
                                    className={sortOption === 'oldest' ? 'bg-gray-100' : ''}
                                >
                                    {sortOption === 'oldest' && <Check className="h-4 w-4 mr-2" />}
                                    Oldest
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}