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

interface FileStore {
  cutFile: FileNode | null;
  setCutFile: (file: FileNode | null) => void;
}

export const useFileStore = create<FileStore>((set) => ({
  cutFile: null,
  setCutFile: (file) => set({ cutFile: file }),
}));