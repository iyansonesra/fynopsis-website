// Update the User type to include invitation status
export type User = {
userId: string;
email: string;
name: string;
role: string;
addedAt: string;
isInvited?: boolean;
invitedRole?: string; // The role they will have after accepting
};

export type TransferOwnershipDialog = {
isOpen: boolean;
targetUser: User | null;
};

export interface UserManagementProps {
dataroomId: string;
}

export type Role = 'READ' | 'WRITE' | 'ADMIN' | 'OWNER';

// File/Folder type for tree structure
export type FileTreeItem = {
id: string;
name: string;
type: 'file' | 'folder';
children?: FileTreeItem[];
parentId?: string;
};

// File/Folder permission type
export type FilePermission = {
show: boolean;
viewAccess: boolean;
downloadAccess: boolean;
deleteEditAccess: boolean;
requireAgreement: boolean;
viewTags: boolean;
allowUploads?: boolean; // Added allowUploads
};

// Permission Group Type Update
export type PermissionGroup = {
id: string;
name: string;
isDefault?: boolean; // Added flag for default roles
allAccess: boolean;
canQuery: boolean;
canOrganize: boolean;
canViewAuditLogs: boolean;
canInviteUsers: string[];
canUpdateUserPermissions: string[];
canCreatePermissionGroups: boolean;
canDeleteDataroom: boolean;
canUseQA: boolean;
canReadAnswerQuestions: boolean;
defaultFilePerms: {
    viewAccess: boolean;
    watermarkContent: boolean;
    deleteEditAccess: boolean;
    viewComments: boolean;
    addComments: boolean;
    downloadAccess: boolean;
    viewTags: boolean;
    canQuery: boolean;
    isVisible: boolean;
};
defaultFolderPerms: {
    allowUploads: boolean;
    createFolders: boolean;
    addComments: boolean;
    viewComments: boolean;
    viewContents: boolean;
    viewTags: boolean;
    canQuery: boolean;
    isVisible: boolean;
    inheritFileAccess?: {
    viewAccess: boolean;
    watermarkContent: boolean;
    deleteEditAccess: boolean;
    viewComments: boolean;
    addComments: boolean;
    downloadAccess: boolean;
    viewTags: boolean;
    canQuery: boolean;
    isVisible: boolean;
    };
    inheritFolderAccess?: {
    allowUploads: boolean;
    createFolders: boolean;
    addComments: boolean;
    viewComments: boolean;
    viewContents: boolean;
    viewTags: boolean;
    canQuery: boolean;
    isVisible: boolean;
    };
};
folderIdAccess?: Record<string, any>;
fileIdAccess?: Record<string, any>;
};

// Define Default Role Structures (Constants) - Placed BEFORE the component
export const DEFAULT_ROLES: Array<Omit<PermissionGroup, 'id'>> = [
{
    name: 'Owner',
    isDefault: true,
    allAccess: true,
    canQuery: true,
    canOrganize: true,
    canViewAuditLogs: true,
    canInviteUsers: ['*'],
    canUpdateUserPermissions: ['*'],
    canCreatePermissionGroups: true,
    canDeleteDataroom: true,
    canUseQA: true,
    canReadAnswerQuestions: true,
    defaultFilePerms: {
    viewAccess: true,
    watermarkContent: false,
    deleteEditAccess: true,
    viewComments: true,
    addComments: true,
    downloadAccess: true,
    viewTags: true,
    canQuery: true,
    isVisible: true
    },
    defaultFolderPerms: {
    allowUploads: true,
    createFolders: true,
    addComments: true,
    viewComments: true,
    viewContents: true,
    viewTags: true,
    canQuery: true,
    isVisible: true,
    inheritFileAccess: {
        viewAccess: true,
        watermarkContent: false,
        deleteEditAccess: true,
        viewComments: true,
        addComments: true,
        downloadAccess: true,
        viewTags: true,
        canQuery: true,
        isVisible: true
    },
    inheritFolderAccess: {
        allowUploads: true,
        createFolders: true,
        addComments: true,
        viewComments: true,
        viewContents: true,
        viewTags: true,
        canQuery: true,
        isVisible: true
    }
    },
    folderIdAccess: {},
    fileIdAccess: {}
},
{
    name: 'Admin',
    isDefault: true,
    allAccess: true,
    canQuery: true,
    canOrganize: true,
    canViewAuditLogs: true,
    canInviteUsers: ['READ', 'WRITE', 'ADMIN'],
    canUpdateUserPermissions: ['READ', 'WRITE', 'ADMIN'],
    canCreatePermissionGroups: true,
    canDeleteDataroom: false,
    canUseQA: true,
    canReadAnswerQuestions: true,
    defaultFilePerms: {
    viewAccess: true,
    watermarkContent: false,
    deleteEditAccess: true,
    viewComments: true,
    addComments: true,
    downloadAccess: true,
    viewTags: true,
    canQuery: true,
    isVisible: true
    },
    defaultFolderPerms: {
    allowUploads: true,
    createFolders: true,
    addComments: true,
    viewComments: true,
    viewContents: true,
    viewTags: true,
    canQuery: true,
    isVisible: true,
    inheritFileAccess: {
        viewAccess: true,
        watermarkContent: false,
        deleteEditAccess: true,
        viewComments: true,
        addComments: true,
        downloadAccess: true,
        viewTags: true,
        canQuery: true,
        isVisible: true
    },
    inheritFolderAccess: {
        allowUploads: true,
        createFolders: true,
        addComments: true,
        viewComments: true,
        viewContents: true,
        viewTags: true,
        canQuery: true,
        isVisible: true
    }
    },
    folderIdAccess: {},
    fileIdAccess: {}
},
{
    name: 'Editor', // WRITE
    isDefault: true,
    allAccess: true, 
    canQuery: true,
    canOrganize: false,
    canViewAuditLogs: false,
    canInviteUsers: [],
    canUpdateUserPermissions: [],
    canCreatePermissionGroups: false,
    canDeleteDataroom: false,
    canUseQA: true,
    canReadAnswerQuestions: true,
    defaultFilePerms: {
    viewAccess: true,
    watermarkContent: false,
    deleteEditAccess: true,
    viewComments: true,
    addComments: true,
    downloadAccess: true,
    viewTags: true,
    canQuery: true,
    isVisible: true
    },
    defaultFolderPerms: {
    allowUploads: true,
    createFolders: true,
    addComments: true,
    viewComments: true,
    viewContents: true,
    viewTags: true,
    canQuery: true,
    isVisible: true,
    inheritFileAccess: {
        viewAccess: true,
        watermarkContent: false,
        deleteEditAccess: true,
        viewComments: true,
        addComments: true,
        downloadAccess: true,
        viewTags: true,
        canQuery: true,
        isVisible: true
    },
    inheritFolderAccess: {
        allowUploads: true,
        createFolders: true,
        addComments: true,
        viewComments: true,
        viewContents: true,
        viewTags: true,
        canQuery: true,
        isVisible: true
    }
    },
    folderIdAccess: {},
    fileIdAccess: {}
},
{
    name: 'Viewer', // READ
    isDefault: true,
    allAccess: true,
    canQuery: true,
    canOrganize: false,
    canViewAuditLogs: false,
    canInviteUsers: [],
    canUpdateUserPermissions: [],
    canCreatePermissionGroups: false,
    canDeleteDataroom: false,
    canUseQA: true,
    canReadAnswerQuestions: false,
    defaultFilePerms: {
    viewAccess: true,
    watermarkContent: true,
    deleteEditAccess: false,
    viewComments: true,
    addComments: false,
    downloadAccess: false,
    viewTags: true,
    canQuery: true,
    isVisible: true
    },
    defaultFolderPerms: {
    allowUploads: false,
    createFolders: false,
    addComments: false,
    viewComments: true,
    viewContents: true,
    viewTags: true,
    canQuery: true,
    isVisible: true,
    inheritFileAccess: {
        viewAccess: true,
        watermarkContent: true,
        deleteEditAccess: false,
        viewComments: true,
        addComments: false,
        downloadAccess: false,
        viewTags: true,
        canQuery: true,
        isVisible: true
    },
    inheritFolderAccess: {
        allowUploads: false,
        createFolders: false,
        addComments: false,
        viewComments: true,
        viewContents: true,
        viewTags: true,
        canQuery: true,
        isVisible: true
    }
    },
    folderIdAccess: {},
    fileIdAccess: {}
}
];