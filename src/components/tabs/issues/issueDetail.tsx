'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '../../ui/scroll-area'
import { qaService } from '../../services/QAService'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useParams, useRouter } from 'next/navigation'
import { useFileStore } from '@/components/services/HotkeyService'
import { usePermissionsStore } from '@/stores/permissionsStore'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Link } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"


interface Comment {
    id: number | string
    author?: string
    authorImage?: string
    content: string
    createdAt?: string
    timestamp?: string
    createdByUserId?: string
    createdByUserName?: string
    isOriginalPoster?: boolean
}

interface IssueDetailProps {
    issueId: number | string;
    onBack?: () => void;
}

export const IssueDetail: React.FC<IssueDetailProps> = ({ issueId, onBack }) => {
    const router = useRouter()
    const { id: dataroomId, subId } = useParams()
    const [issue, setIssue] = useState<any>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [answerContent, setAnswerContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()
    const [isReferenceDialogOpen, setIsReferenceDialogOpen] = useState(false)
    const [referenceSearchQuery, setReferenceSearchQuery] = useState('')
    const [availableIssues, setAvailableIssues] = useState<any[]>([])
    const [isLoadingIssues, setIsLoadingIssues] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [selectionStart, setSelectionStart] = useState(0)
    const [selectionEnd, setSelectionEnd] = useState(0)
    const [isHoveringReference, setIsHoveringReference] = useState(false)
    const [referenceHoverData, setReferenceHoverData] = useState<any>(null)
    const [referenceHoverPosition, setReferenceHoverPosition] = useState({ top: 0, left: 0 })
    const [issueNumberToIdMap, setIssueNumberToIdMap] = useState<Record<string, string>>({})
    const { permissionDetails } = usePermissionsStore()

    // Access the global issue tab state for filter consistency
    const { issuesActiveTab } = useFileStore()

    // Update loadAvailableIssues to also build the reference map
const loadAvailableIssues = useCallback(async () => {
    if (!dataroomId) return

    try {
        setIsLoadingIssues(true)
        const result = await qaService.getIssues(dataroomId as string)
        
        // Filter out the current issue AND only include issues with an issueNumber
        const filteredIssues = result.items.filter((item: any) =>
            item.id.toString() !== issueId.toString() &&
            item.issueNumber !== null &&
            item.issueNumber !== undefined
        )
        
        setAvailableIssues(filteredIssues)
        
        // Build a map of issue numbers to issue IDs for quick lookup
        const referenceMap: Record<string, string> = {}
        result.items.forEach((issue: any) => {
            if (issue.issueNumber) {
                referenceMap[issue.issueNumber.toString()] = issue.id.toString()
            }
        })
        
        setIssueNumberToIdMap(referenceMap)
    } catch (error) {
        console.error('Error fetching issues for reference:', error)
        toast({
            title: 'Error',
            description: 'Failed to load available issues for reference',
            variant: 'destructive'
        })
    } finally {
        setIsLoadingIssues(false)
    }
}, [dataroomId, issueId, toast])

    const insertIssueReference = (issueToReference: any) => {
        if (!textareaRef.current || !issueToReference.issueNumber) return

        const currentValue = answerContent
        const beforeCursor = currentValue.substring(0, selectionStart)
        const afterCursor = currentValue.substring(selectionEnd)

        // Only use issueNumber for reference
        const newValue = `${beforeCursor}#${issueToReference.issueNumber} ${afterCursor}`
        setAnswerContent(newValue)

        // Close the reference dialog
        setIsReferenceDialogOpen(false)
    }
    const formatTextWithReferences = (text: string) => {
        // Match #digits pattern
        const regex = /#(\d+)/g
        let formattedContent = text
        let matches = []
        let match

        // Find all matches
        while ((match = regex.exec(text)) !== null) {
            matches.push({
                fullMatch: match[0],
                issueNumber: match[1],
                index: match.index
            })
        }

        return {
            formattedText: formattedContent,
            references: matches
        }
    }

    // Add this function to handle hovering over issue references
    // Update the handleReferenceHover function
    const handleReferenceHover = async (issueNumber: string, event: React.MouseEvent) => {
        if (!dataroomId) return

        try {
            // Find the issue in already loaded available issues
            let referenceIssue = availableIssues.find(
                issue => issue.issueNumber?.toString() === issueNumber
            )

            // If not found in available issues, try to fetch it
            if (!referenceIssue) {
                try {
                    const result = await qaService.getIssues(dataroomId as string)
                    referenceIssue = result.items.find(
                        issue => issue.issueNumber?.toString() === issueNumber
                    )
                } catch (error) {
                    console.error('Error fetching issue for hover preview:', error)
                }
            }

            if (referenceIssue) {
                setReferenceHoverData(referenceIssue)
                // Set position based on mouse position
                setReferenceHoverPosition({
                    top: event.clientY,
                    left: event.clientX
                })
                setIsHoveringReference(true)
            }
        } catch (error) {
            console.error('Error handling reference hover:', error)
        }
    }

    // Update the handleReferenceClick function with the correct URL format
    const handleReferenceClick = (issueNumber: string, event: React.MouseEvent) => {
        event.preventDefault()
        
        if (!dataroomId) return
        
        // First try to get the issue ID from our map
        const issueId = issueNumberToIdMap[issueNumber]
        
        if (issueId) {
            // Navigate using the ID from our map
            const referenceUrl = `/dataroom/${dataroomId}/home?tab=issues&issueId=${issueId}`
            window.open(referenceUrl, '_blank')
        } else {
            // If not in our map, try to find it in availableIssues
            const referenceIssue = availableIssues.find(
                issue => issue.issueNumber?.toString() === issueNumber
            )
            
            if (referenceIssue) {
                // Navigate using the found issue
                const referenceUrl = `/dataroom/${dataroomId}/home?tab=issues&issueId=${referenceIssue.id}`
                window.open(referenceUrl, '_blank')
            } else {
                // If we can't find the issue, show a warning
                console.warn('Unable to find issue ID for issue number:', issueNumber)
                toast({
                    title: 'Warning',
                    description: 'Could not find the referenced issue. Try opening it from the issues list.',
                    variant: 'destructive'
                })
            }
        }
    }

    useEffect(() => {
        // Load all issues with their issue numbers initially
        // This ensures we have the data needed for references in loaded comments
        if (dataroomId) {
            loadAvailableIssues()
        }
    }, [dataroomId, loadAvailableIssues])

    

    // Add this function to handle mouse leave on references
    const handleReferenceLeave = () => {
        setIsHoveringReference(false)
        setReferenceHoverData(null)
    }

    // Add this function to handle clicking on a reference
    const handleSelectionChange = () => {
        if (textareaRef.current) {
            setSelectionStart(textareaRef.current.selectionStart)
            setSelectionEnd(textareaRef.current.selectionEnd)
        }
    }

    const handleBack = () => {
        if (onBack) {
            onBack();
        }
    }

    useEffect(() => {
        // Fetch the issue from the API
        const fetchIssue = async () => {
            if (!issueId) return

            try {
                setIsLoading(true)

                if (dataroomId) {
                    // Try to fetch from API
                    try {
                        // Ensure issueId is used as a string without conversion
                        const apiIssue = await qaService.getIssue(dataroomId as string, issueId.toString())
                        setIssue(apiIssue)

                        // Set answers as comments
                        if (apiIssue.answers && apiIssue.answers.length > 0) {
                            setComments(apiIssue.answers.map((answer: any) => ({
                                id: answer.id,
                                content: answer.content || answer.answer || '',
                                createdByUserName: answer.createdByUserName,
                                createdByUserId: answer.createdByUserId,
                                timestamp: answer.timestamp,
                                isOriginalPoster: answer.createdByUserId === apiIssue.createdByUserId
                            })))
                        }

                        setIsLoading(false)
                        return
                    } catch (error) {
                        console.error('Error fetching issue from API:', error)
                        // Fall back to mock data if API fails
                    }
                }

                setIsLoading(false)
            } catch (error) {
                console.error('Error fetching issue:', error)
                setIsLoading(false)
            }
        }

        fetchIssue()
    }, [issueId, dataroomId])

    // Update the handleSubmitAnswer function

    const handleSubmitAnswer = async () => {
        if (!answerContent.trim() || !dataroomId || !issueId) return

        try {
            setIsSubmitting(true)

            const answer = await qaService.addAnswer(
                dataroomId as string,
                issueId.toString(),
                { answer: answerContent }
            )

            // Add the new answer to the comments list
            setComments(prevComments => [...prevComments, {
                id: answer.id,
                content: answer.content || answer.answer || answerContent, // Fallback to local content if API doesn't return it
                createdByUserName: answer.createdByUserName,
                timestamp: answer.timestamp || new Date().toISOString(), // Fallback to current time
                isOriginalPoster: false
            }])

            // Clear the input
            setAnswerContent('')

            toast({
                title: 'Success',
                description: 'Your answer has been submitted',
            })
        } catch (error) {
            console.error('Error submitting answer:', error)
            toast({
                title: 'Error',
                description: 'Failed to submit your answer',
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleIssueStatus = async () => {
        if (!issue || !dataroomId || !issueId) return

        try {
            const newStatus = issue.status === 'open' ? 'closed' : 'open'

            const updatedIssue = await qaService.updateIssueStatus(
                dataroomId as string,
                issueId.toString(),
                { status: newStatus }
            )

            setIssue(updatedIssue)

            toast({
                title: 'Success',
                description: `Question marked as ${newStatus}`,
            })
        } catch (error) {
            console.error('Error updating issue status:', error)
            toast({
                title: 'Error',
                description: 'Failed to update question status',
                variant: 'destructive'
            })
        }
    }

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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full w-full absolute inset-0">
                <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        )
    }

    if (!issue) {
        return <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-xl font-bold mb-4">Issue not found</h2>
            <Button onClick={handleBack}>Go back to issues</Button>
        </div>
    }

    return (
        <ScrollArea className="w-full h-full">
            <div className="w-full px-6 mx-auto py-6">
                {/* Header with back button */}
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        className="pl-2 flex items-center text-sm"
                        onClick={onBack}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to issues
                    </Button>
                </div>

                {/* Issue title and metadata */}
                <div className="border-b github-border pb-4 mb-6">
                    <div className="flex items-center mb-2">
                        <div className="mr-3">
                            {issue.status === 'open' ? (
                                <div className="h-4 w-4 rounded-full bg-slate-300 mr-1"></div>
                            ) : (
                                <svg className="h-6 w-6 github-issue-closed" viewBox="0 0 16 16">
                                    <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path>
                                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path>
                                </svg>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold">{issue.title}</h1>
                    </div>

                    <div className="flex items-center text-sm text-[#57606a]">
                        <span className="font-medium mr-1">
                            {issue.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                        <span>• {issue.createdByUserName || issue.author} opened this issue {issue.timestamp ? new Date(issue.timestamp).toLocaleString() : issue.createdAt?.replace('opened ', '')} • {comments.length} comments</span>
                    </div>

                    {/* Issue description */}
                    {issue.description && (
                        <div className="mt-4 border github-border rounded-md p-4">
                            <p className="text-sm">{issue.description}</p>
                        </div>
                    )}
                </div>

                {/* Status toggle button */}
                <div className="mb-6">
                    <Button
                        onClick={toggleIssueStatus}
                        variant="outline"
                        className={issue.status === 'closed' ? 'bg-green-100' : 'bg-red-100'}
                    >
                        {issue.status === 'open' ? 'Close question' : 'Reopen question'}
                    </Button>
                </div>

                {/* Issue tags */}
                {issue.tags && issue.tags.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium mb-2">Labels</h3>
                        <div className="flex flex-wrap gap-2">
                            {issue.tags.map((tag: string, i: number) => (
                                <Badge key={i} className={`${getTagColor(tag)} hover:bg-opacity-80 cursor-pointer font-normal px-2 py-1 text-xs`}>
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comments */}
                <div className="mb-6" id="comments">
                    <h3 className="text-lg font-medium flex items-center mb-4">
                        <MessageCircle className="h-5 w-5 mr-2" />
                        <span>Comments ({comments.length})</span>
                    </h3>

                    {comments.map((comment) => (
                        <div key={comment.id} className="border github-border rounded-md mb-4">
                            <div className="bg-[#f6f8fa] p-3 border-b github-border flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        {(comment.createdByUserName || comment.author || 'Unknown').split(' ').map((n) => n[0]).join('')}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <a href="#" className="github-link font-semibold">{comment.createdByUserName || comment.author}</a>
                                    <span className="text-[#57606a] text-sm ml-2">commented {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : comment.createdAt}</span>
                                </div>
                                {comment.isOriginalPoster && (
                                    <Badge className="bg-[#0969da] text-white">Author</Badge>
                                )}
                            </div>
                            <div className="p-4">
                                {(() => {
                                    const { references } = formatTextWithReferences(comment.content)

                                    // If no references, just render normal text
                                    if (references.length === 0) {
                                        return <p className="text-sm">{comment.content}</p>
                                    }

                                    // If references exist, format the text with clickable references
                                    let lastIndex = 0
                                    const parts = []

                                    references.forEach((ref, i) => {
                                        // Add text before the reference
                                        if (ref.index > lastIndex) {
                                            parts.push(
                                                <span key={`text-${i}`}>
                                                    {comment.content.substring(lastIndex, ref.index)}
                                                </span>
                                            )
                                        }
                                        parts.push(
                                            <span
                                                key={`ref-${i}`}
                                                className="text-blue-500 hover:underline cursor-pointer"
                                                onMouseEnter={(e) => handleReferenceHover(ref.issueNumber, e)}
                                                onMouseLeave={handleReferenceLeave}
                                                onClick={(e) => handleReferenceClick(ref.issueNumber, e)}
                                            >
                                                {ref.fullMatch}
                                            </span>
                                        )

                                        lastIndex = ref.index + ref.fullMatch.length
                                    })

                                    // Add any remaining text after the last reference
                                    if (lastIndex < comment.content.length) {
                                        parts.push(
                                            <span key="text-last">
                                                {comment.content.substring(lastIndex)}
                                            </span>
                                        )
                                    }

                                    return <p className="text-sm">{parts}</p>
                                })()}
                            </div>
                        </div>
                    ))}

                    {/* Comment form */}
                    <div className="border github-border rounded-md">
                        <div className="bg-[#f6f8fa] p-3 border-b github-border">
                            <h4 className="text-sm font-medium">Add a comment</h4>
                        </div>
                        <div className="p-4">
                            <Textarea
                                ref={textareaRef}
                                className="w-full border github-border rounded-md p-3 text-sm min-h-[100px]"
                                placeholder="Leave a comment..."
                                value={answerContent}
                                onChange={(e) => setAnswerContent(e.target.value)}
                                onSelect={handleSelectionChange}
                            />
                            <div className="flex items-center mt-2 text-sm text-gray-500">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center text-xs gap-1 px-2"
                                    onClick={() => setIsReferenceDialogOpen(true)}
                                >
                                    <Link className="h-3 w-3" />
                                    Reference an issue
                                </Button>
                                <span className="ml-2">
                                    Use #issue-number to reference other issues
                                </span>
                            </div>
                            <div className="mt-3 flex justify-end">
                                {!permissionDetails?.canAnswerIssue ? (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div>
                                                    <Button
                                                        className="bg-blue-500 hover:bg-blue-800"
                                                        onClick={handleSubmitAnswer}
                                                        disabled
                                                    >
                                                        Comment
                                                    </Button>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Adding comments is disabled
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    <Button
                                        className="bg-blue-500 hover:bg-blue-800"
                                        onClick={handleSubmitAnswer}
                                        disabled={isSubmitting || !answerContent.trim()}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Comment'}
                                    </Button>
                                )}
                            </div>

                            {isHoveringReference && referenceHoverData && (
                                <div
                                    className="fixed bg-white border border-gray-200 rounded-md shadow-lg p-3 z-50 max-w-sm"
                                    style={{
                                        top: `${referenceHoverPosition.top + 20}px`,
                                        left: `${referenceHoverPosition.left}px`
                                    }}
                                >
                                    <div className="text-xs text-gray-500 mb-1">
                                        #{referenceHoverData.issueNumber || referenceHoverData.id} opened by {referenceHoverData.createdByUserName || referenceHoverData.author}
                                    </div>
                                    <div className="font-medium text-sm">{referenceHoverData.title}</div>
                                    {referenceHoverData.description && (
                                        <div className="text-xs text-gray-700 mt-1 line-clamp-2">
                                            {referenceHoverData.description}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <Dialog open={isReferenceDialogOpen} onOpenChange={setIsReferenceDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Reference an issue</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <Input
                                    placeholder="Search issues by title or number..."
                                    value={referenceSearchQuery}
                                    onChange={(e) => setReferenceSearchQuery(e.target.value)}
                                    className="mb-4"
                                />

                                <div className="max-h-[300px] overflow-y-auto">
                                    {isLoadingIssues ? (
                                        <div className="text-center py-4">Loading issues...</div>
                                    ) : availableIssues.length === 0 ? (
                                        <div className="text-center py-4">No issues found</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {availableIssues
                                                .filter(issue =>
                                                    issue.issueNumber && (
                                                        !referenceSearchQuery ||
                                                        issue.title.toLowerCase().includes(referenceSearchQuery.toLowerCase()) ||
                                                        issue.issueNumber.toString().includes(referenceSearchQuery)
                                                    )
                                                )
                                                .map(issue => (
                                                    <div
                                                        key={issue.id}
                                                        className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                                                        onClick={() => insertIssueReference(issue)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">#{issue.issueNumber}</span>
                                                            <span className="text-sm">{issue.title}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </ScrollArea>
    )
}