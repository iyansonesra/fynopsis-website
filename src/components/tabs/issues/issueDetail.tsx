'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '../../ui/scroll-area'
import { issuesData } from './IssueData'  // Fallback data
import { qaService } from '../../services/QAService'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useParams, useRouter } from 'next/navigation'

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
                
                // Fallback to mock data
                const foundIssue = issuesData.find(i => i.id.toString() === issueId.toString())
                setIssue(foundIssue)
                
                // Mock comments data
                const mockComments = [
                    {
                        id: 1,
                        author: foundIssue?.author || 'Unknown',
                        content: 'I encountered this issue when trying to use the latest version. Here are the steps to reproduce...',
                        createdAt: foundIssue?.createdAt || 'some time ago',
                        isOriginalPoster: true
                    }
                ]
                
                if ((foundIssue?.comments ?? 0) > 1) {
                    mockComments.push({
                        id: 2,
                        author: 'reactTeamMember',
                        content: 'Thanks for reporting this issue. We are looking into it and will provide an update soon.',
                        createdAt: '3 days ago',
                        isOriginalPoster: false
                    })
                }
                
                setComments(mockComments)
                setIsLoading(false)
            } catch (error) {
                console.error('Error fetching issue:', error)
                setIsLoading(false)
            }
        }
        
        fetchIssue()
    }, [issueId, dataroomId])

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
                content: answer.content || answer.answer || '',
                createdByUserName: answer.createdByUserName,
                timestamp: answer.timestamp,
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
                                <p className="text-sm">{comment.content}</p>
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
                                className="w-full border github-border rounded-md p-3 text-sm min-h-[100px]" 
                                placeholder="Leave a comment..."
                                value={answerContent}
                                onChange={(e) => setAnswerContent(e.target.value)}
                            />
                            <div className="mt-3 flex justify-end">
                                <Button 
                                    className="bg-blue-500 hover:bg-blue-800"
                                    onClick={handleSubmitAnswer}
                                    disabled={isSubmitting || !answerContent.trim()}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Comment'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
    )
}