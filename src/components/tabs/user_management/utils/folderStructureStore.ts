import { create } from 'zustand';
import { Node } from '@/components/tabs/user_management/static_folder_tree/static-folder-tree';

export interface FilePermissions {
    viewAccess: boolean;
    downloadAccess: boolean;
    viewTags: boolean;
    addTags: boolean;
    moveAccess: boolean;
    renameAccess: boolean;
    watermarkContent: boolean;
    viewComments: boolean;
    addComments: boolean;
    canQuery: boolean;
    deleteAccess: boolean;
    editAccess: boolean;
}

export interface FolderPermissions {
    viewAccess: boolean;
    downloadAccess: boolean;
    viewTags: boolean;
    addTags: boolean;
    allowUploads: boolean;
    moveAccess: boolean;
    renameAccess: boolean;
    viewComments: boolean;
    addComments: boolean;
    canQuery: boolean;
    deleteAccess: boolean;
    editAccess: boolean;
    ChildFileStandard: FilePermissions;
}

interface FolderStructureState {
    folderStructure: Node[];
    setFolderStructure: (structure: Node[]) => void;
    selectedItems: Set<string>;
    setSelectedItems: (items: Set<string>) => void;
    selectedNodeId: string | null;
    setSelectedNodeId: (id: string | null) => void;
    folderPermissions: Map<string, FolderPermissions>;
    setFolderPermissions: (permissions: Map<string, FolderPermissions>) => void;
    filePermissions: Map<string, FilePermissions>;
    setFilePermissions: (permissions: Map<string, FilePermissions>) => void;
    deviators: Set<string>;
    addDeviator: (fileId: string) => void;
    removeDeviator: (fileId: string) => void;
    isDeviator: (fileId: string) => boolean;
}

export const useFolderStructureStore = create<FolderStructureState>((set, get) => ({
    folderStructure: [],
    setFolderStructure: (structure) => set({ folderStructure: structure }),
    selectedItems: new Set(),
    setSelectedItems: (items) => set({ selectedItems: items }),
    selectedNodeId: null,
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    folderPermissions: new Map(),
    setFolderPermissions: (permissions) => set({ folderPermissions: permissions }),
    filePermissions: new Map(),
    setFilePermissions: (permissions) => set({ filePermissions: permissions }),
    deviators: new Set(),
    addDeviator: (fileId) => set((state) => ({
        deviators: new Set(state.deviators).add(fileId)
    })),
    removeDeviator: (fileId) => set((state) => {
        const newDeviators = new Set(state.deviators);
        newDeviators.delete(fileId);
        return { deviators: newDeviators };
    }),
    isDeviator: (fileId) => get().deviators.has(fileId)
}));

export const DEFAULT_FILE_PERMISSIONS: FilePermissions = {
    viewAccess: true,
    downloadAccess: true,
    viewTags: true,
    addTags: true,
    moveAccess: true,
    renameAccess: true,
    watermarkContent: true,
    viewComments: true,
    addComments: true,
    canQuery: true,
    deleteAccess: true,
    editAccess: true,
};


export const DEFAULT_FOLDER_PERMISSIONS: FolderPermissions = {
    viewAccess: true,
    downloadAccess: true,
    viewTags: true,
    addTags: true,
    allowUploads: true,
    moveAccess: true,
    renameAccess: true,
    viewComments: true,
    addComments: true,
    canQuery: true,
    deleteAccess: true,
    editAccess: true,
    ChildFileStandard: DEFAULT_FILE_PERMISSIONS
}; 