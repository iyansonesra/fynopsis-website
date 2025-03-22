import { create } from 'zustand';

// Add Message interface to the file
interface ThoughtStep {
  number: number;
  content: string;
}

interface Source {
  id: string,
  pageNumber: number,
  chunkTitle: string,
  chunkText: string,
}

interface Citation {
  id: string;
  stepNumber: string;
  fileKey: string;
  chunkText: string;
  position: number;
}

interface BatchStep {
  stepNumber: number;
  totalSteps: number;
  description: string;
  sources: Record<string, string>;
  isActive: boolean;
}

// Update the Message interface to include batches
interface Message {
  type: 'question' | 'answer' | 'error';
  content: string;
  sources?: Source[];
  steps?: ThoughtStep[];
  progressText?: string;
  sourcingSteps?: string[];
  subSources?: Record<string, any>;
  citations?: Citation[];
  batches?: BatchStep[]; // Add this new field
}

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
  cutFiles: FileNode[]; 
  setCutFiles: (files: FileNode[]) => void;
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
  
  documentBounds: Record<string, DocumentBounds>;
  setDocumentBounds: (id: string, bounds: DocumentBounds) => void;
  getDocumentBounds: (id: string) => DocumentBounds | null;
  addMultipleDocumentBounds: (boundsMap: Record<string, any>) => void;

  activeTab: number;
  setActiveTab: (tab: number) => void; 
  activeIssueId: number | string | null;
  setActiveIssueId: (issueId: number | string | null) => void;
  issuesActiveTab: string;
  setIssuesActiveTab: (tab: string) => void;

  tabSystemPanelSize: number;
  detailSectionPanelSize: number;
  setTabSystemPanelSize: (size: number) => void;
  setDetailSectionPanelSize: (size: number) => void;
  
  // Add message state management
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (messageUpdate: Partial<Message>) => void;
  clearMessages: () => void;
  lastQuery: string;
  setLastQuery: (query: string) => void;
  currentThreadId: string;
  setCurrentThreadId: (threadId: string) => void;

  accordionValues: Record<string, string>;
  setAccordionValue: (messageId: string, value: string) => void;
  resetAccordionValues: () => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  cutFiles: [],
  setCutFiles: (files) => set({ cutFiles: files }),
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
  activeTab: 0,
  setActiveTab: (tab) => set({ activeTab: tab }),
  activeIssueId: null,
  setActiveIssueId: (issueId) => set({ activeIssueId: issueId }),
  issuesActiveTab: 'open',
  setIssuesActiveTab: (tab) => set({ issuesActiveTab: tab }),
  tabSystemPanelSize: 75,
  detailSectionPanelSize: 25,
  setTabSystemPanelSize: (size) => set({ tabSystemPanelSize: size }),
  setDetailSectionPanelSize: (size) => set({ detailSectionPanelSize: size }),
  
  // Initialize message state
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set(state => ({ 
    messages: [...state.messages, message] 
  })),
  updateLastMessage: (messageUpdate) => set(state => {
    if (state.messages.length === 0) return state;
    
    const updatedMessages = [...state.messages];
    const lastIndex = updatedMessages.length - 1;
    updatedMessages[lastIndex] = {
      ...updatedMessages[lastIndex],
      ...messageUpdate
    };
    
    return { messages: updatedMessages };
  }),
  clearMessages: () => set({ messages: [] }),
  lastQuery: '',
  setLastQuery: (query) => set({ lastQuery: query }),
  currentThreadId: '',
  setCurrentThreadId: (threadId) => set({ currentThreadId: threadId }),
  accordionValues: {},
  setAccordionValue: (messageId, value) => set(state => ({
    accordionValues: {
      ...state.accordionValues,
      [messageId]: value
    }
  })),
  resetAccordionValues: () => set({ accordionValues: {} }),
}));