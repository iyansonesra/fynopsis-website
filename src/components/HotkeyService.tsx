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
  cutFile: FileNode | null;
  setCutFile: (file: FileNode | null) => void;
  searchableFiles: Files[];
  setSearchableFiles: (files: Files[]) => void;
  getFileName: (id: string) => string;
  getFile: (id: string) => Files | null;  // Add this new method


}

export const useFileStore = create<FileStore>((set, get) => ({
  cutFile: null,
  setCutFile: (file) => set({ cutFile: file }),
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