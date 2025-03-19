import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Issue } from './IssueData'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface CreateIssueFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (issue: Omit<Issue, 'id' | 'number' | 'createdAt'>) => void
}

export function CreateIssueForm({ isOpen, onClose, onSubmit }: CreateIssueFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState<'open' | 'closed'>('open')

  const availableTags = [
    'Urgent', 'Status: Unconfirmed', 'Type: General Question', 
    'Documentation', 'Enhancement', 'Bug', 'Help Wanted'
  ]

  const handleSubmit = () => {
    if (!title.trim()) return

    const newIssue = {
      title,
      status,
      author: 'Current User', // In a real app, get the current user
      tags: selectedTags,
      comments: 0,
      description
    }

    onSubmit(newIssue)
    resetForm()
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setSelectedTags([])
    setTagInput('')
    setStatus('open')
    onClose()
  }

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  const filteredTags = availableTags.filter(tag => 
    !selectedTags.includes(tag) && 
    tag.toLowerCase().includes(tagInput.toLowerCase())
  )

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
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map(tag => (
                <Badge key={tag} className="flex gap-1 items-center bg-[#ededed] text-[#57606a] hover:bg-[#ddd]">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <Input 
              placeholder="Filter labels" 
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="mb-2"
            />
            {tagInput && (
              <div className="max-h-[150px] overflow-y-auto border rounded-md p-2">
                {filteredTags.map(tag => (
                  <div 
                    key={tag} 
                    className="p-2 hover:bg-[#f6f8fa] cursor-pointer rounded-md"
                    onClick={() => addTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            )}
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