'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { BookMarked, Plus, Tag } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useParams, useRouter } from 'next/navigation'
import { useFileStore } from '../../services/HotkeyService'
import { IssueSearch } from './IssueSearchBar'
import { FilterDialog } from './FilterDialog'
import { IssueListHeader } from './IssueListHeader'
import { IssueItem } from './issueItem'
import { qaService, FrontendIssue } from '../../services/QAService'
import { CreateIssueForm } from './CreateIssueForm'
import { useToast } from '@/components/ui/use-toast'

export function Issues() {
  const router = useRouter()
  const { id: dataroomId, subId } = useParams();
  const [issues, setIssues] = useState<FrontendIssue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(' ')
  const [activeTab, setActiveTab] = useState('open')
  const { setActiveIssueId } = useFileStore();
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false)
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | null>(null)
  const { toast } = useToast()

  // Filter issues based on activeTab
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => 
      activeTab === 'open' ? issue.status === 'open' : issue.status === 'closed'
    );
  }, [issues, activeTab]);

  // Count issues by status
  const openIssuesCount = useMemo(() => {
    return issues.filter(issue => issue.status === 'open').length;
  }, [issues]);
  
  const closedIssuesCount = useMemo(() => {
    return issues.filter(issue => issue.status === 'closed').length;
  }, [issues]);

  // Fetch issues
  const fetchIssues = useCallback(async () => {
    if (!dataroomId) return;
    
    try {
      setIsLoading(true);
      const result = await qaService.getIssues(dataroomId as string);
      setIssues(result.items);
      setLastEvaluatedKey(result.lastEvaluatedKey);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load questions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [dataroomId, toast]);

  // Fetch more issues (pagination)
  const fetchMoreIssues = useCallback(async () => {
    if (!dataroomId || !lastEvaluatedKey) return;
    
    try {
      setIsLoading(true);
      const result = await qaService.getIssues(
        dataroomId as string, 
        'all',
        50, 
        lastEvaluatedKey
      );
      
      setIssues(prevIssues => [...prevIssues, ...result.items]);
      setLastEvaluatedKey(result.lastEvaluatedKey);
    } catch (error) {
      console.error('Error fetching more issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load more questions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [dataroomId, lastEvaluatedKey, toast]);

  // Load issues on component mount
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

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

  const [selectedIssueId, setSelectedIssueId] = useState<string | number | null>(null);

  // Then modify handleIssueClick
  const handleIssueClick = (issueId: number | string) => {
    setActiveIssueId(issueId);
    setSelectedIssueId(issueId);
    
    // Update URL without triggering a navigation/refresh
    window.history.pushState({}, '', `/dataroom/${dataroomId}/${subId}/issues/${issueId}`);
  };

  const handleCreateIssue = async (newIssueData: Omit<FrontendIssue, 'id' | 'number' | 'createdAt'>) => {
    try {
      // Map to Lambda's expected format
      const createRequest = {
        question: newIssueData.title,
        fileContext: newIssueData.description || '',
        status: newIssueData.status,
        tags: newIssueData.tags
      };
      
      // Create the issue
      const newIssue = await qaService.createIssue(dataroomId as string, createRequest);
      
      // Add the new issue to the list
      setIssues(prevIssues => [newIssue, ...prevIssues]);
      
      toast({
        title: 'Success',
        description: 'Question created successfully',
      });
    } catch (error) {
      console.error('Error creating issue:', error);
      toast({
        title: 'Error',
        description: 'Failed to create question',
        variant: 'destructive'
      });
    }
  }

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

            <Button 
              className="bg-blue-500 hover:bg-blue-800 h-9"
              onClick={() => setIsCreateIssueOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>New issue</span>
            </Button>
          </div>
        </div>

        {/* Issues list */}
        <div className="border github-border rounded-md overflow-hidden">
          <IssueListHeader 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            openCount={openIssuesCount}
            closedCount={closedIssuesCount}
          />

          {/* Issues list */}
          <div className="w-full overflow-x-auto">
            {isLoading && filteredIssues.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Loading questions...
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No questions found. Create a new one to get started.
              </div>
            ) : (
              <>
                {filteredIssues.map((issue) => (
                  <IssueItem 
                    key={issue.id}
                    issue={issue}
                    onClick={handleIssueClick}
                    getTagColor={getTagColor}
                  />
                ))}
                
                {lastEvaluatedKey && (
                  <div className="py-3 px-4 text-center">
                    <Button 
                      variant="outline"
                      onClick={fetchMoreIssues}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading...' : 'Load more'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Issue Dialog */}
      <CreateIssueForm 
        isOpen={isCreateIssueOpen}
        onClose={() => setIsCreateIssueOpen(false)}
        onSubmit={handleCreateIssue}
      />
    </ScrollArea>
  )
}