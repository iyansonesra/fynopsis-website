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
addTags?: boolean;
allowUploads?: boolean;
moveAccess?: boolean;
renameAccess?: boolean;
watermarkContent?: boolean;
viewComments?: boolean;
addComments?: boolean;
canQuery?: boolean;
isVisible?: boolean;
};

// Folder-specific Permission Type (Optional, but helps clarity)
export type FolderPermission = {
allowUploads: boolean;
createFolders: boolean;
addComments: boolean;
viewComments: boolean;
viewContents: boolean;
viewTags: boolean;
addTags: boolean;
canQuery: boolean;
isVisible: boolean;
moveContents: boolean;
renameContents: boolean;
deleteContents: boolean;
inheritFileAccess?: FilePermission;
inheritFolderAccess?: Omit<FolderPermission, 'inheritFileAccess' | 'inheritFolderAccess'>;
};

// Permission Group Type Update - Reflects the NEW structure provided
export type PermissionGroup = {
id: string;
name: string;
isDefault?: boolean;
dataroomId?: string;
allAccess: boolean;
canQueryEntireDataroom?: boolean;
canOrganize?: boolean;
canRetryProcessing?: boolean;
canDeleteDataroom?: boolean;
canAccessIssuesPanel?: boolean;
canCreateIssue?: boolean;
canAnswerIssue?: boolean;
canAccessAuditLogsPanel?: boolean;
canViewAuditLogs?: boolean;
canExportAuditLogs?: boolean;
canAccessDiligenceDashboard?: boolean;
canCreateDiligenceWidget?: boolean;
canMoveWidgets?: boolean;
canDeleteWidgets?: boolean;
canAccessQuestionairePanel?: boolean;
canAddQuestionnaire?: boolean;
canAccessUserManagementPanel?: boolean;
canViewUsers?: boolean;
canViewPermissionGroupDetails?: boolean;
canInviteUsers?: string[];
canUpdateUserPermissions?: string[];
canUpdatePeerPermissions?: boolean;
canRemoveUsers?: string[];
canRemovePeerPermission?: boolean;
canCreatePermissionGroups?: boolean;
defaultFilePerms: {
    viewAccess: boolean;
    watermarkContent: boolean;
    deleteAccess?: boolean;
    editAccess?: boolean;
    deleteEditAccess?: boolean;
    viewComments: boolean;
    addComments: boolean;
    downloadAccess: boolean;
    viewTags: boolean;
    addTags?: boolean;
    canQuery: boolean;
    isVisible: boolean;
    moveAccess?: boolean;
    renameAccess?: boolean;
};
defaultFolderPerms: {
    allowUploads: boolean;
    createFolders: boolean;
    addComments: boolean;
    viewComments: boolean;
    viewContents: boolean;
    viewTags: boolean;
    addTags?: boolean;
    canQuery: boolean;
    isVisible: boolean;
    moveContents?: boolean;
    renameContents?: boolean;
    deleteContents?: boolean;
};
folderIdAccess?: Record<string, Partial<FolderPermission>>;
fileIdAccess?: Record<string, Partial<FilePermission>>;
};

// Define Default Role Structures (Constants) - Placed BEFORE the component
export const DEFAULT_ROLES: Array<Omit<PermissionGroup, 'id' | 'dataroomId'>> = [
{
    name: 'Owner',
    isDefault: true,
    defaultFilePerms: {
        viewAccess: true,
        watermarkContent: false,
        deleteAccess: true,
        editAccess: true,
        viewComments: true,
        addComments: true,
        downloadAccess: true,
        viewTags: true,
        addTags: true,
        canQuery: true,
        isVisible: true,
        moveAccess: true,
        renameAccess: true
    },
    defaultFolderPerms: {
        allowUploads: true,
        createFolders: true,
        addComments: true,
        viewComments: true,
        viewContents: true,
        viewTags: true,
        addTags: true,
        canQuery: true,
        isVisible: true,
        moveContents: true,
        renameContents: true,
        deleteContents: true
    },
    allAccess: true,
    canQueryEntireDataroom: true,
    canOrganize: true,
    canRetryProcessing: true,
    canDeleteDataroom: true,
    canAccessIssuesPanel: true,
    canCreateIssue: true,
    canAnswerIssue: true,
    canAccessAuditLogsPanel: true,
    canViewAuditLogs: true,
    canExportAuditLogs: true,
    canAccessDiligenceDashboard: true,
    canCreateDiligenceWidget: true,
    canMoveWidgets: true,
    canDeleteWidgets: true,
    canAccessQuestionairePanel: true,
    canAddQuestionnaire: true,
    canAccessUserManagementPanel: true,
    canViewUsers: true,
    canViewPermissionGroupDetails: true,
    canInviteUsers: ['*'],
    canUpdateUserPermissions: ['*'],
    canUpdatePeerPermissions: false,
    canRemoveUsers: ['*'],
    canRemovePeerPermission: false,
    canCreatePermissionGroups: true
},
{
    name: 'Admin',
    isDefault: true,
    allAccess: true,
    canOrganize: true,
    canViewAuditLogs: true,
    canInviteUsers: ['READ', 'WRITE', 'ADMIN'],
    canUpdateUserPermissions: ['READ', 'WRITE', 'ADMIN'],
    canCreatePermissionGroups: true,
    canDeleteDataroom: false,
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
    },
},
{
    name: 'Editor',
    isDefault: true,
    allAccess: true,
    canOrganize: false,
    canViewAuditLogs: false,
    canInviteUsers: [],
    canUpdateUserPermissions: [],
    canCreatePermissionGroups: false,
    canDeleteDataroom: false,
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
    },
    folderIdAccess: {},
    fileIdAccess: {}
},
{
    name: 'Viewer',
    isDefault: true,
    allAccess: true,
    canOrganize: false,
    canViewAuditLogs: false,
    canInviteUsers: [],
    canUpdateUserPermissions: [],
    canCreatePermissionGroups: false,
    canDeleteDataroom: false,
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
    },
    folderIdAccess: {},
    fileIdAccess: {}
}
];