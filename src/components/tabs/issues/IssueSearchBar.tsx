import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface IssueSearchProps {
  value: string
  onChange: (value: string) => void
}

export function IssueSearch({ value, onChange }: IssueSearchProps) {
  return (
    <div className="border github-border rounded-md flex flex-1 w-full overflow-hidden relative">
      <div className="absolute top-0 bottom-0 left-0 flex items-center pl-3">
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-0 pl-10 h-9 w-full"
        placeholder="Search all issues"
      />
    </div>
  )
}