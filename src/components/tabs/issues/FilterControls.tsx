import { MoreHorizontal } from 'lucide-react'
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
} from "@/components/ui/dropdown-menu"

export function IssueFilters() {
  return (
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
  )
}