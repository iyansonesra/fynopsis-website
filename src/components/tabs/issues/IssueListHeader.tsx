import { IssueFilters } from './FilterControls'

interface IssueListHeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function IssueListHeader({ activeTab, setActiveTab }: IssueListHeaderProps) {
  return (
    <div className="bg-[#f6f8fa] border-b github-border flex flex-col md:flex-row md:items-center p-4 gap-2">
      <div className="flex gap-4 text-sm">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex items-center gap-1 text-sm ${activeTab === 'open' ? 'font-semibold' : ''}`}
        >
          <div className="h-4 w-4 rounded-full bg-slate-300 mr-1"></div>
          <span className={activeTab === 'open' ? 'github-issue-open' : ''}>
            Open
          </span>
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
        </button>
      </div>

      <IssueFilters />
    </div>
  )
}