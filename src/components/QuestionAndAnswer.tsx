'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    ChevronDown,
    Search,
    Tag,
    BookMarked,
    Plus,
    Check,
    MessageCircle
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from './ui/scroll-area'



import { MoreHorizontal } from 'lucide-react'
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
} from "@/components/ui/dropdown-menu"
import { useRouter } from 'next/navigation'

interface Issue {
    id: number
    title: string
    status: 'open' | 'closed'
    author: string
    number: number
    createdAt: string
    tags: string[]
    comments: number
}

// ...existing code...

// Sample issues data
export const issuesData: Issue[] = [
    {
        id: 1,
        number: 32659,
        title: "[DevTools Bug]: cannot double click anymore on component name to filter the tree view (in Components tab)",
        status: 'open',
        author: 'clementcitiz',
        createdAt: 'opened 15 hours ago',
        tags: ['Component: Developer Tools', 'Status: Unconfirmed', 'Type: Bug'],
        comments: 0
    },
    {
        id: 2,
        number: 32658,
        title: "Bug: help",
        status: 'open',
        author: 'decadezzz',
        createdAt: 'opened 15 hours ago',
        tags: ['Status: Unconfirmed'],
        comments: 0
    },
    {
        id: 3,
        number: 32620,
        title: "[Compiler Bug]: return without value causes bailout",
        status: 'open',
        author: 'aeharding',
        createdAt: 'opened 4 days ago',
        tags: ['Component: Optimizing Compiler', 'Status: Unconfirmed', 'Type: Bug'],
        comments: 1
    },
    {
        id: 4,
        number: 32580,
        title: "[Compiler Bug]: enableFunctionOutlining breaks react-native-reanimated API callbacks",
        status: 'open',
        author: 'tjzel',
        createdAt: 'opened last week',
        tags: ['Component: Optimizing Compiler', 'Status: Unconfirmed', 'Type: Bug'],
        comments: 14
    },
    {
        id: 5,
        number: 32576,
        title: "Bug: Uncontrolled <input /> element has value attribute removed",
        status: 'open',
        author: 'imjordanxd',
        createdAt: 'opened last week',
        tags: ['Status: Unconfirmed'],
        comments: 2
    },
    {
        id: 6,
        number: 32575,
        title: "[Compiler Bug]: eslint-plugin-react-compiler has incorrect type definitions",
        status: 'open',
        author: 'printfn',
        createdAt: 'opened last week',
        tags: ['Component: Optimizing Compiler', 'Status: Unconfirmed', 'Type: Bug'],
        comments: 1
    },
    {
        id: 7,
        number: 32574,
        title: "[React 19] Need Bring Back _debugSource or Provide an Equivalent for Better Developer Experience",
        status: 'open',
        author: 'zthxxx',
        createdAt: 'opened last week',
        tags: ['React 19'],
        comments: 1
    },
    {
        id: 8,
        number: 32573,
        title: "[DevTools Bug] i is undefined",
        status: 'open',
        author: 'endolith',
        createdAt: 'opened last week',
        tags: ['Component: Developer Tools', 'Status: Unconfirmed', 'Type: Bug'],
        comments: 1
    },
]

export function Issues() {
    const router = useRouter()
    const [issues, setIssues] = useState<Issue[]>(issuesData)
    const [searchQuery, setSearchQuery] = useState(' ')
    const [activeTab, setActiveTab] = useState('open')

    const getTagColor = (tag: string) => {
        if (tag.includes('Component:')) {
            return 'bg-[#fbca04] text-black'
        } else if (tag.includes('Status:')) {
            return 'bg-[#cfd3d7] text-[#24292f]'
        } else if (tag.includes('Type:')) {
            return 'bg-[#d73a4a] text-white'
        } else if (tag.includes('React 19')) {
            return 'bg-[#0075ca] text-white'
        } else {
            return 'bg-[#ededed] text-[#57606a]'
        }
    }

    return (
        <ScrollArea className="w-full h-full">
            <div className="w-full px-6 mx-auto py-6">
                {/* Issues header */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-4 gap-3">
                    <div className="border github-border rounded-md flex flex-1 w-full overflow-hidden relative">
                        <div className="absolute top-0 bottom-0 left-0 flex items-center pl-3">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border-0 pl-10 h-9 w-full"
                            placeholder="Search all issues"
                        />
                    </div>

                    <div className="flex w-full md:w-auto gap-2 justify-between">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 flex-1 md:flex-auto">
                                    <Tag className="h-4 w-4 mr-2" />
                                    <span>Labels</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Filter by labels</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    <Input placeholder="Filter labels" className="mb-4" />
                                    <div className="space-y-2">
                                        {['Bug', 'Documentation', 'Enhancement', 'Good First Issue', 'Help Wanted', 'Question'].map((label) => (
                                            <div key={label} className="flex items-center space-x-2">
                                                <Checkbox id={`label-${label}`} />
                                                <label htmlFor={`label-${label}`} className="text-sm">{label}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9">
                                    <BookMarked className="h-4 w-4 mr-2" />
                                    <span>Milestones</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Filter by milestone</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    <Input placeholder="Filter milestones" className="mb-4" />
                                    <div className="space-y-2">
                                        {['React 19', 'React 18.3.0', 'Future'].map((milestone) => (
                                            <div key={milestone} className="flex items-center space-x-2">
                                                <Checkbox id={`milestone-${milestone}`} />
                                                <label htmlFor={`milestone-${milestone}`} className="text-sm">{milestone}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Button className="bg-[#2da44e] hover:bg-[#2c974b] h-9">
                            <Plus className="h-4 w-4 mr-2" />
                            <span>New issue</span>
                        </Button>
                    </div>
                </div>

                {/* Issues list */}
                <div className="border github-border rounded-md overflow-hidden">
                    {/* Tabs and filters */}
                    <div className="bg-[#f6f8fa] border-b github-border flex flex-col md:flex-row md:items-center p-4 gap-2">
                        <div className="flex gap-4 text-sm">
                            <button
                                onClick={() => setActiveTab('open')}
                                className={`flex items-center gap-1 text-sm ${activeTab === 'open' ? 'font-semibold' : ''}`}
                            >
                                <svg className="h-4 w-4 github-issue-open" viewBox="0 0 16 16">
                                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
                                </svg>
                                <span className={activeTab === 'open' ? 'github-issue-open' : ''}>
                                    Open
                                </span>
                                <span className="github-counter ml-1">772</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('closed')}
                                className={`flex items-center gap-1 ${activeTab === 'closed' ? 'font-semibold' : ''}`}
                            >
                                <svg className="h-4 w-4 github-issue-closed" viewBox="0 0 16 16">
                                    <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path>
                                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path>
                                </svg>
                                <span className={activeTab === 'closed' ? 'github-issue-closed' : ''}>
                                    Closed
                                </span>
                                <span className="github-counter ml-1">12,831</span>
                            </button>
                        </div>



                        <div className="flex flex-row gap-2 md:ml-auto">
                            {/* Most important filters visible on larger screens */}
                            <div className="hidden 2xl:flex gap-2">
                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Author</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="me">Assigned to me</SelectItem>
                                        <SelectItem value="none">Not assigned</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Labels</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="bug">Bug</SelectItem>
                                        <SelectItem value="feature">Feature</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Projects</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="repo">Repository projects</SelectItem>
                                        <SelectItem value="org">Organization projects</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Milestones</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="react19">React 19</SelectItem>
                                        <SelectItem value="react18">React 18.x</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Assignees</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="me">Assigned to me</SelectItem>
                                        <SelectItem value="none">Not assigned</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Types</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="bugs">Bugs</SelectItem>
                                        <SelectItem value="features">Features</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Newest</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Newest</SelectItem>
                                        <SelectItem value="oldest">Oldest</SelectItem>
                                        <SelectItem value="most-commented">Most commented</SelectItem>
                                        <SelectItem value="least-commented">Least commented</SelectItem>
                                        <SelectItem value="recently-updated">Recently updated</SelectItem>
                                        <SelectItem value="least-recently-updated">Least recently updated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Some filters visible on xl screens */}
                            <div className="hidden xl:flex 2xl:hidden gap-2">
                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Author</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="me">Assigned to me</SelectItem>
                                        <SelectItem value="none">Not assigned</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Labels</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="bug">Bug</SelectItem>
                                        <SelectItem value="feature">Feature</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Projects</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="repo">Repository projects</SelectItem>
                                        <SelectItem value="org">Organization projects</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Newest</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Newest</SelectItem>
                                        <SelectItem value="oldest">Oldest</SelectItem>
                                        <SelectItem value="most-commented">Most commented</SelectItem>
                                        <SelectItem value="least-commented">Least commented</SelectItem>
                                        <SelectItem value="recently-updated">Recently updated</SelectItem>
                                        <SelectItem value="least-recently-updated">Least recently updated</SelectItem>
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

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Milestones</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>React 19</DropdownMenuItem>
                                                <DropdownMenuItem>React 18.x</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Assignees</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Assigned to me</DropdownMenuItem>
                                                <DropdownMenuItem>Not assigned</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Types</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Bugs</DropdownMenuItem>
                                                <DropdownMenuItem>Features</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Fewer filters visible on lg screens */}
                            <div className="hidden lg:flex xl:hidden gap-2">
                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Author</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="me">Assigned to me</SelectItem>
                                        <SelectItem value="none">Not assigned</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Labels</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="bug">Bug</SelectItem>
                                        <SelectItem value="feature">Feature</SelectItem>
                                    </SelectContent>
                                </Select>

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
                                            <DropdownMenuSubTrigger>Projects</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Repository projects</DropdownMenuItem>
                                                <DropdownMenuItem>Organization projects</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Milestones</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>React 19</DropdownMenuItem>
                                                <DropdownMenuItem>React 18.x</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Assignees</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Assigned to me</DropdownMenuItem>
                                                <DropdownMenuItem>Not assigned</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Types</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Bugs</DropdownMenuItem>
                                                <DropdownMenuItem>Features</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Sort</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Newest</DropdownMenuItem>
                                                <DropdownMenuItem>Oldest</DropdownMenuItem>
                                                <DropdownMenuItem>Most commented</DropdownMenuItem>
                                                <DropdownMenuItem>Least commented</DropdownMenuItem>
                                                <DropdownMenuItem>Recently updated</DropdownMenuItem>
                                                <DropdownMenuItem>Least recently updated</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* One filter visible on md screens */}
                            <div className="hidden md:flex lg:hidden gap-2">
                                <Select>
                                    <SelectTrigger className="h-8 text-sm bg-transparent border-0 hover:bg-gray-100">
                                        <div className="flex items-center">
                                            <span>Author</span>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="any">Any</SelectItem>
                                        <SelectItem value="me">Assigned to me</SelectItem>
                                        <SelectItem value="none">Not assigned</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Dropdown for md screens */}
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
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Bug</DropdownMenuItem>
                                                <DropdownMenuItem>Feature</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Projects</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Repository projects</DropdownMenuItem>
                                                <DropdownMenuItem>Organization projects</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Milestones</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>React 19</DropdownMenuItem>
                                                <DropdownMenuItem>React 18.x</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Assignees</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Assigned to me</DropdownMenuItem>
                                                <DropdownMenuItem>Not assigned</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Types</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Bugs</DropdownMenuItem>
                                                <DropdownMenuItem>Features</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Sort</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Newest</DropdownMenuItem>
                                                <DropdownMenuItem>Oldest</DropdownMenuItem>
                                                <DropdownMenuItem>Most commented</DropdownMenuItem>
                                                <DropdownMenuItem>Least commented</DropdownMenuItem>
                                                <DropdownMenuItem>Recently updated</DropdownMenuItem>
                                                <DropdownMenuItem>Least recently updated</DropdownMenuItem>
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
                                            <DropdownMenuSubTrigger>Author</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Assigned to me</DropdownMenuItem>
                                                <DropdownMenuItem>Not assigned</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Labels</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Bug</DropdownMenuItem>
                                                <DropdownMenuItem>Feature</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Projects</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Repository projects</DropdownMenuItem>
                                                <DropdownMenuItem>Organization projects</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Milestones</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>React 19</DropdownMenuItem>
                                                <DropdownMenuItem>React 18.x</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Assignees</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Assigned to me</DropdownMenuItem>
                                                <DropdownMenuItem>Not assigned</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Types</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Any</DropdownMenuItem>
                                                <DropdownMenuItem>Bugs</DropdownMenuItem>
                                                <DropdownMenuItem>Features</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>

                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Sort</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem>Newest</DropdownMenuItem>
                                                <DropdownMenuItem>Oldest</DropdownMenuItem>
                                                <DropdownMenuItem>Most commented</DropdownMenuItem>
                                                <DropdownMenuItem>Least commented</DropdownMenuItem>
                                                <DropdownMenuItem>Recently updated</DropdownMenuItem>
                                                <DropdownMenuItem>Least recently updated</DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>


                    {/* Issues list */}
                    <div className="w-full overflow-x-auto">
                        {issues.map((issue, index) => (
                            <div
                                key={issue.id}
                                className={`border-b github-border p-4 hover:bg-[#f6f8fa] ${index === issues.length - 1 ? 'border-b-0' : ''}`}
                            >
                                <div
                                    className="flex items-start cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Get the current path segments and preserve them
                                        const currentPath = window.location.pathname;
                                        const segments = currentPath.split('/');

                                        // Add or replace 'issues/{issue.number}' in the path
                                        const issuesIndex = segments.indexOf('issues');
                                        if (issuesIndex !== -1) {
                                            // If 'issues' is already in the path, modify the segment after it
                                            segments[issuesIndex + 1] = issue.number.toString();
                                        } else {
                                            // If 'issues' is not in the path, append it and the issue number
                                            segments.push('issues', issue.number.toString());
                                        }

                                        // Construct the new path
                                        const newPath = segments.join('/');

                                        // Navigate
                                        router.push(newPath);
                                    }}          
                                 >
                                    <div className="min-w-[20px] mt-1 mr-3">
                                        {issue.status === 'open' ? (
                                            <svg className="h-5 w-5 github-issue-open" viewBox="0 0 16 16">
                                                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                                                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5 github-issue-closed" viewBox="0 0 16 16">
                                                <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path>
                                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path>
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-start gap-2">
                                            <a href="#" className="github-link font-semibold text-sm hover:text-blue-800 break-words">
                                                {issue.title}
                                            </a>
                                            <div className="flex flex-wrap gap-1">
                                                {issue.tags.map((tag, i) => (
                                                    <Badge key={i} className={`${getTagColor(tag)} hover:bg-opacity-80 cursor-pointer font-normal px-2 text-xs whitespace-nowrap`}>
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-xs text-[#57606a] mt-1 truncate">
                                            <span>#{issue.number}</span>
                                            <span className="mx-1">•</span>
                                            <span>{issue.createdAt} by </span>
                                            <a href="#" className="github-link">{issue.author}</a>
                                        </div>
                                    </div>
                                    {issue.comments > 0 && (
                                        <a
                                            className="flex items-center text-[#57606a] hover:text-blue-600 ml-2 whitespace-nowrap"
                                            onClick={(e) => {
                                                e.stopPropagation();  // Prevent triggering parent onClick
                                                window.location.href = `/issues/${issue.number}#comments`;
                                            }}
                                        >
                                            <MessageCircle className="h-4 w-4 mr-1" />
                                            <span>{issue.comments}</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Pagination */}
                <div className="flex justify-center mt-6">
                    <div className="flex items-center border github-border rounded-md overflow-hidden">
                        <Button variant="ghost" className="rounded-none border-r github-border h-8 px-3" disabled>
                            Previous
                        </Button>
                        <Button variant="ghost" className="rounded-none h-8 px-3 bg-[#0969da] text-white hover:bg-[#0969da]/90">
                            1
                        </Button>
                        <Button variant="ghost" className="rounded-none h-8 px-3 border-l github-border">
                            2
                        </Button>
                        <Button variant="ghost" className="rounded-none h-8 px-3 border-l github-border">
                            3
                        </Button>
                        <Button variant="ghost" className="rounded-none h-8 px-3 border-l github-border">
                            4
                        </Button>
                        <Button variant="ghost" className="rounded-none h-8 px-3 border-l github-border">
                            5
                        </Button>
                        <Button variant="ghost" className="rounded-none h-8 px-3 border-l github-border">
                            ...
                        </Button>
                        <Button variant="ghost" className="rounded-none h-8 px-3 border-l github-border">
                            30
                        </Button>
                        <Button variant="ghost" className="rounded-none h-8 px-3 border-l github-border">
                            31
                        </Button>
                        <Button variant="ghost" className="rounded-none border-l github-border h-8 px-3">
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </ScrollArea>

    )
}
