import { Badge } from '@/components/ui/badge'
import { MessageCircle } from 'lucide-react'

interface Issue {
  id: number | string
  title: string
  status: 'open' | 'closed'
  author: string
  number?: number | string
  createdAt: string
  tags: string[]
  comments: number
  issueNumber?: number // Add the new field
}

interface IssueItemProps {
  issue: Issue
  onClick: (issueNumber: number | string) => void
  getTagColor: (tag: string) => string
}

export function IssueItem({ issue, onClick, getTagColor }: IssueItemProps) {
  return (
    <div className="border-b github-border p-4 hover:bg-[#f6f8fa]">
      <div
        className="flex items-start cursor-pointer"
        onClick={() => onClick(issue.id)}
      >
        <div className="min-w-[20px] mt-1 mr-3">
          {issue.status === 'open' ? (
            <div className="h-4 w-4 rounded-full bg-slate-300 mr-1"></div>
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
                <Badge
                  key={i}
                  className={`${getTagColor(tag)} hover:bg-opacity-80 cursor-pointer font-normal px-2 text-xs whitespace-nowrap`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="text-xs text-[#57606a] mt-1 truncate">
            {issue.issueNumber && <span className="font-medium">#{issue.issueNumber}</span>}
            <span>{issue.issueNumber ? ' • ' : ''}{issue.createdAt} by </span>
            <a href="#" className="github-link">{issue.author}</a>
          </div>
        </div>
        {issue.comments > 0 && (
          <a
            className="flex items-center text-[#57606a] hover:text-blue-600 ml-2 whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();  // Prevent triggering parent onClick
              window.location.href = `/issues/${issue.id}#comments`;
            }}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            <span>{issue.comments}</span>
          </a>
        )}
      </div>
    </div>
  )
}