import { TreeItem } from './FolderTreeEditor';

export const sampleTree: TreeItem[] = [
  {
    id: '1',
    name: 'Root',
    type: 'folder',
    children: [
      {
        id: '2',
        name: 'Documents',
        type: 'folder',
        children: [
          {
            id: '3',
            name: 'Reports',
            type: 'folder',
            children: [
              {
                id: '4',
                name: 'Q1_Report.pdf',
                type: 'file'
              },
              {
                id: '5',
                name: 'Q2_Report.pdf',
                type: 'file'
              }
            ]
          },
          {
            id: '6',
            name: 'Proposals',
            type: 'folder',
            children: [
              {
                id: '7',
                name: 'Project_A.docx',
                type: 'file'
              }
            ]
          }
        ]
      },
      {
        id: '8',
        name: 'Images',
        type: 'folder',
        children: [
          {
            id: '9',
            name: 'Screenshots',
            type: 'folder',
            children: [
              {
                id: '10',
                name: 'homepage.png',
                type: 'file'
              }
            ]
          }
        ]
      },
      {
        id: '11',
        name: 'README.md',
        type: 'file'
      }
    ]
  }
]; 