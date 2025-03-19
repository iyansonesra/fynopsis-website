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
      number: 32659,
      title: "[DevTools Bug]: cannot double click anymore on component name to filter the tree view (in Components tab)",
      status: 'open',
      author: 'clementcitiz',
      createdAt: 'opened 15 hours ago',
      tags: ['Component: Developer Tools', 'Status: Unconfirmed', 'Type: Bug'],
      comments: 0
    },
    // ...other issues
  ]