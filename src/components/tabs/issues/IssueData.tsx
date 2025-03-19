export interface Issue {
    id: number | string;
    title: string;
    status: 'open' | 'closed';
    author?: string;
    createdByUserId?: string;
    createdByUserName?: string;
    number?: number;
    createdAt?: string;
    timestamp?: string;
    tags: string[];
    comments?: number;
    answers?: any[];
    description?: string;
    lastUpdated?: string;
  }
  
  // Sample issues data - used for demo/fallback purposes
  export const issuesData: Issue[] = [
    {
      id: 1,
      number: 1,
      title: "How many RSUs has your company issue since February 23, 2024?",
      status: 'open',
      author: 'Jason Horowitz',
      createdAt: 'opened 15 hours ago',
      tags: ['Urgent', 'Status: Unconfirmed', 'Type: General Question'],
      comments: 0
    },
    {
      id: 2,
      number: 2,
      title: "What has your company done to address climate change risks?",
      status: 'open',
      author: 'Sarah Miller',
      createdAt: 'opened 2 days ago',
      tags: ['Status: Unconfirmed', 'Type: General Question'],
      comments: 2
    },
    {
      id: 3,
      number: 3,
      title: "Please confirm the executive compensation breakdown",
      status: 'closed',
      author: 'Michael Chen',
      createdAt: 'opened 5 days ago',
      tags: ['Documentation', 'Status: Confirmed'],
      comments: 3,
      description: "We need a breakdown of executive compensation including salary, bonuses, and equity for the last fiscal year."
    }
  ]