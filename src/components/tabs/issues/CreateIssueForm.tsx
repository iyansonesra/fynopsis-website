import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FrontendIssue } from '../../services/QAService'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface CreateIssueFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (issue: Omit<FrontendIssue, 'id' | 'number' | 'createdAt'>) => void
}

export function CreateIssueForm({ isOpen, onClose, onSubmit }: CreateIssueFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagFilter, setTagFilter] = useState('')
  const [status, setStatus] = useState<'open' | 'closed'>('open')

  // Predefined list of tags
  const availableTags = [
    'Bug', 
    'Documentation', 
    'Enhancement', 
    'Good First Issue', 
    'Help Wanted', 
    'Question',
    'Urgent',
    'Type: General Question',
    'Type: Technical Question',
    'Type: Feature Request',
    'Component: Frontend',
    'Component: Backend',
    'Component: API',
    'Status: Unconfirmed',
    'Status: In Progress'
  ]

  const handleSubmit = () => {
    if (!title.trim()) return

    const newIssue = {
      title,
      status,
      author: 'Current User', // In a real app, get the current user
      tags: selectedTags,
      comments: 0,
      description,
      createdAt: `opened ${new Date().toLocaleString()}`
    }

    onSubmit(newIssue)
    resetForm()
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setSelectedTags([])
    setTagFilter('')
    setStatus('open')
    onClose()
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const filteredTags = availableTags.filter(tag => 
    tag.toLowerCase().includes(tagFilter.toLowerCase())
  )

  const getTagColor = (tag: string) => {
    if (tag.includes('Component:')) {
      return 'bg-[#fbca04] text-black'
    } else if (tag.includes('Status:')) {
      return 'bg-[#cfd3d7] text-[#24292f]'
    } else if (tag.includes('Type:')) {
      return 'bg-[#d73a4a] text-white'
    } else if (tag === 'Bug') {
      return 'bg-[#d73a4a] text-white'
    } else if (tag === 'Enhancement') {
      return 'bg-[#0075ca] text-white'
    } else if (tag === 'Documentation') {
      return 'bg-[#0075ca] text-white'
    } else if (tag === 'Good First Issue') {
      return 'bg-[#7057ff] text-white'
    } else if (tag === 'Help Wanted') {
      return 'bg-[#008672] text-white'
    } else if (tag === 'Question') {
      return 'bg-[#d876e3] text-white'
    } else if (tag === 'Urgent') {
      return 'bg-[#b60205] text-white'
    } else {
      return 'bg-[#ededed] text-[#57606a]'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Create new issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Input 
              placeholder="Issue title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium text-lg"
            />
          </div>
          <div>
            <Textarea 
              placeholder="Add a description..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Status</p>
            <RadioGroup 
              defaultValue="open" 
              value={status}
              onValueChange={(value) => setStatus(value as 'open' | 'closed')} 
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open" id="status-open" />
                <Label htmlFor="status-open" className="text-sm flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-slate-300"></div>
                  Open
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="closed" id="status-closed" />
                <Label htmlFor="status-closed" className="text-sm flex items-center gap-1.5">
                  <svg className="h-3 w-3 github-issue-closed" viewBox="0 0 16 16">
                    <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path>
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path>
                  </svg>
                  Closed
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Labels</p>
            
            {/* Selected tags display */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedTags.map(tag => (
                  <Badge 
                    key={tag} 
                    className={`${getTagColor(tag)} flex gap-1 items-center hover:opacity-90`}
                  >
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Tag filter input */}
            <Input 
              placeholder="Filter labels" 
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="mb-4"
            />
            
            {/* Tag selection area */}
            <div className="max-h-[180px] overflow-y-auto border rounded-md">
              {filteredTags.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No matching labels found</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-2">
                  {filteredTags.map(tag => (
                    <div 
                      key={tag} 
                      className={`p-2 hover:bg-[#f6f8fa] cursor-pointer rounded-md flex items-center justify-between ${
                        selectedTags.includes(tag) ? 'bg-[#f1f8ff]' : ''
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getTagColor(tag)}`} />
                        <span>{tag}</span>
                      </div>
                      {selectedTags.includes(tag) && (
                        <Check className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button 
              className="bg-blue-500 hover:bg-blue-800"
              onClick={handleSubmit}
              disabled={!title.trim()}
            >
              Create issue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 