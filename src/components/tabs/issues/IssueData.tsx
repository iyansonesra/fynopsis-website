export interface Issue {
    id: number
    title: string
    status: 'open' | 'closed'
    author: string
    number: number
    createdAt: string
    tags: string[]
    comments: number
  }
  
  // Sample issues data
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
    // ...other issues
  ]