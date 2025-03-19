import { create } from 'zustand';

interface FileNode {
  parentId: string;
  name: string;
  uploadedBy: string;
  type: string;
  size: string;
  id: string;
  isFolder: boolean;
  createByEmail: string;
  createByName: string;
  lastModified: string;
  tags: DocumentTags | null;
  summary: string;
  status: string;
  s3Url?: string;
}

interface DateInfo {
  date: string;
  type: string;
  description: string;
}

interface DocumentTags {
  document_type: string;
  relevant_project: string;
  involved_parties: string[];
  key_topics: string[];
  dates: DateInfo[];
  deal_phase: string;
  confidentiality: string;
}

interface Files {
  fileId: string;
  fileName: string;
  fullPath: string;
  parentFolderId: string;
  parentFolderName: string;
  size: string;
}

interface DocumentBounds {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  chunk_title?: string;
  is_secondary?: boolean;
  kg_properties?: any;
  page_num?: number;
  bounding_box?: any;
}

interface FileStore {
  cutFiles: FileNode[]; // Changed from cutFile to cutFiles
  setCutFiles: (files: FileNode[]) => void; // Changed from setCutFile
  searchableFiles: Files[];
  setSearchableFiles: (files: Files[]) => void;
  getFileName: (id: string) => string;
  getFile: (id: string) => Files | null;
  showDetailsView: boolean;
  setShowDetailsView: (show: boolean) => void;
  selectedFile: FileNode | null;
  setSelectedFile: (file: FileNode | null) => void;
  pendingSelectFileId: string | null;
  setPendingSelectFileId: (id: string | null) => void;
  
  // New fields for document bounds
  documentBounds: Record<string, DocumentBounds>;
  setDocumentBounds: (id: string, bounds: DocumentBounds) => void;
  getDocumentBounds: (id: string) => DocumentBounds | null;
  addMultipleDocumentBounds: (boundsMap: Record<string, any>) => void;

  activeTab: number; // Change from string to number
  setActiveTab: (tab: number) => void; 
  activeIssueId: number | string | null;
  setActiveIssueId: (issueId: number | string | null) => void;
}

// Then update the store implementation
export const useFileStore = create<FileStore>((set, get) => ({
  cutFiles: [], // Changed from cutFile: null
  setCutFiles: (files) => set({ cutFiles: files }), // Changed from setCutFile
  searchableFiles: [],
  setSearchableFiles: (files) => set({ searchableFiles: files }),
  getFileName: (id) => {
  
    const file = get().searchableFiles.find(file => file.fileId === id);
    return file ? file.fileName : '';
  },
  getFile: (id) => {
    const file = get().searchableFiles.find(file => file.fileId === id);
    return file || null;
  },
  showDetailsView: false,
  setShowDetailsView: (show) => set({ showDetailsView: show }),
  selectedFile: null,
  setSelectedFile: (file) => set({ selectedFile: file }),
  pendingSelectFileId: null,
  setPendingSelectFileId: (id) => set({ pendingSelectFileId: id }),
  documentBounds: {},

  setDocumentBounds: (id, bounds) => set(state => ({
    documentBounds: {
      ...state.documentBounds,
      [id]: bounds
    }
  })),
  getDocumentBounds: (id) => get().documentBounds[id] || null,
  addMultipleDocumentBounds: (boundsMap) => set(state => ({
    documentBounds: {
      ...state.documentBounds,
      ...boundsMap
    }
  })),
  activeTab: 0, // Default to first tab (library) instead of 'library'
  setActiveTab: (tab) => set({ activeTab: tab }),
  activeIssueId: null,
  setActiveIssueId: (issueId) => set({ activeIssueId: issueId }),
}));