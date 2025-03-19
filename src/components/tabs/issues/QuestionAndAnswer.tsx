'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookMarked, Plus, Tag } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useParams, useRouter } from 'next/navigation'
import { useFileStore } from '../../services/HotkeyService'
import { IssueSearch } from './IssueSearchBar'
import { FilterDialog } from './FilterDialog'
import { IssueListHeader } from './IssueListHeader'
import { IssueItem } from './issueItem'
import { issuesData, Issue } from './IssueData' // Move the data to separate file

export function Issues() {
  const router = useRouter()
  const [issues, setIssues] = useState<Issue[]>(issuesData)
  const [searchQuery, setSearchQuery] = useState(' ')
  const params = useParams();
  const [activeTab, setActiveTab] = useState('open')
  const { setActiveIssueId } = useFileStore();

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

  const handleIssueClick = (issueId: number) => {
    setActiveIssueId(issueId);
    const { id, subId } = params;
    router.push(`/dataroom/${id}/${subId}/issues/${issueId}`);
  };

  return (
    <ScrollArea className="w-full h-full">
      <div className="w-full px-6 mx-auto py-6">
        {/* Issues header */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-4 gap-3">
          <IssueSearch value={searchQuery} onChange={setSearchQuery} />

          <div className="flex w-full md:w-auto gap-2 justify-between">
            <FilterDialog 
              title="Labels" 
              icon={Tag} 
              buttonText="Labels"
              placeholder="Filter labels"
              items={['Bug', 'Documentation', 'Enhancement', 'Good First Issue', 'Help Wanted', 'Question']}
            />
            
            <FilterDialog 
              title="Milestones" 
              icon={BookMarked} 
              buttonText="Milestones"
              placeholder="Filter milestones"
              items={['React 19', 'React 18.3.0', 'Future']}
            />

            <Button className="bg-blue-500 hover:bg-blue-800 h-9">
              <Plus className="h-4 w-4 mr-2" />
              <span>New issue</span>
            </Button>
          </div>
        </div>

        {/* Issues list */}
        <div className="border github-border rounded-md overflow-hidden">
          <IssueListHeader activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Issues list */}
          <div className="w-full overflow-x-auto">
            {issues.map((issue, index) => (
              <IssueItem 
                key={issue.id}
                issue={issue}
                onClick={handleIssueClick}
                getTagColor={getTagColor}
              />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}