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
  tags: string[];
  summary: string;
  status: string;
  s3Url?: string;
}

interface Files {
  fileId: string;
  fileName: string;
  fullPath: string;
  parentFolderId: string;
  parentFolderName: string;
  size: string;
}

interface FileStore {
  cutFiles: FileNode[]; // Changed from cutFile to cutFiles
  setCutFiles: (files: FileNode[]) => void; // Changed from setCutFile
  searchableFiles: Files[];
  setSearchableFiles: (files: Files[]) => void;
  getFileName: (id: string) => string;
  getFile: (id: string) => Files | null;
}

// Then update the store implementation
export const useFileStore = create<FileStore>((set, get) => ({
  cutFiles: [], // Changed from cutFile: null
  setCutFiles: (files) => set({ cutFiles: files }), // Changed from setCutFile
  searchableFiles: [],
  setSearchableFiles: (files) => set({ searchableFiles: files }),
  getFileName: (id) => {
    console.log('searchableFiles:', get().searchableFiles);
    console.log('id:', id);
    const file = get().searchableFiles.find(file => file.fileId === id);
    return file ? file.fileName : '';
  },
  getFile: (id) => {
    console.log('searchableFiles:', get().searchableFiles);
    console.log('id:', id);
    const file = get().searchableFiles.find(file => file.fileId === id);
    return file || null;
  }
}));