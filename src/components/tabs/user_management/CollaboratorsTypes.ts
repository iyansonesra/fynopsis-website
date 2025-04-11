export type Role = 'OWNER' | 'ADMIN' | 'WRITE' | 'READ';

/**
 * Information about a role or permission group
 */
export interface RoleInfo {
  id: string;
  name: string;
  type: 'ROLE' | 'GROUP';
  description?: string;
}

// Add RolesData to the user management props
export interface UserManagementProps {
  dataroomId: string;
  // Add any other props here
}

/**
 * User interface with all properties
 */
export interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
  invitedRole?: string;
  permissionInfo?: {
    type: string;
    displayName: string;
    id: string;
  };
  invitedPermissionInfo?: {
    type: string;
    displayName: string;
    id?: string;
  } | null;
  status: string;
  sharedBy: string;
  addedAt: string;
  isInvited?: boolean;
}

export interface FilePermission {
  show?: boolean;  
  viewAccess?: boolean;
  downloadAccess?: boolean;
  deleteEditAccess?: boolean;
  requireAgreement?: boolean;
  viewTags?: boolean;
  addTags?: boolean;
  allowUploads?: boolean;
  moveAccess?: boolean;
  renameAccess?: boolean;
  watermarkContent?: boolean;
  viewComments?: boolean;
  addComments?: boolean;
  canQuery?: boolean;
  isVisible?: boolean;
  deleteAccess?: boolean;
  editAccess?: boolean;
}

export interface FileTreeItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId?: string;
  children?: FileTreeItem[];
}

export interface TransferOwnershipDialog {
  isOpen: boolean;
  targetUser: User | null;
}

export interface PermissionGroup {
  id: string;
  name: string;
  isDefault?: boolean;
  
  // Direct Permissions
  allAccess: boolean;
  canQueryEntireDataroom?: boolean;
  canOrganize?: boolean;
  canRetryProcessing?: boolean;
  canDeleteDataroom?: boolean;
  
  // Panel Permissions
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
  
  // User Management Permissions
  canAccessUserManagementPanel?: boolean;
  canViewUsers?: boolean;
  canViewPermissionGroupDetails?: boolean;
  canInviteUsers?: string[];
  canUpdateUserPermissions?: string[];
  canUpdatePeerPermissions?: boolean;
  canRemoveUsers?: string[];
  canRemovePeerPermission?: boolean;
  canCreatePermissionGroups?: boolean;
  
  // Default Permissions
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
  
  // Specific Permission Overrides
  folderIdAccess?: Record<string, any>;
  fileIdAccess?: Record<string, FilePermission>;
}

// Default roles for rendering
export const DEFAULT_ROLES: PermissionGroup[] = [
  {
    id: 'default-owner',
    name: 'Owner',
    isDefault: true,
    allAccess: true,
    canQueryEntireDataroom: true,
    canOrganize: true,
    canRetryProcessing: true,
    defaultFilePerms: {
      viewAccess: true,
      watermarkContent: false,
      downloadAccess: true,
      viewComments: true,
      addComments: true,
      viewTags: true,
      addTags: true,
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
      addTags: true,
      canQuery: true, 
      isVisible: true
    }
  },
  {
    id: 'default-admin',
    name: 'Admin',
    isDefault: true,
    allAccess: true,
    canQueryEntireDataroom: true,
    canOrganize: true,
    canRetryProcessing: true,
    defaultFilePerms: {
      viewAccess: true,
      watermarkContent: false,
      downloadAccess: true,
      viewComments: true,
      addComments: true,
      viewTags: true,
      addTags: true,
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
      addTags: true,
      canQuery: true,
      isVisible: true
    }
  },
  {
    id: 'default-write',
    name: 'Editor',
    isDefault: true,
    allAccess: true,
    canQueryEntireDataroom: true,
    canOrganize: false,
    canRetryProcessing: false,
    defaultFilePerms: {
      viewAccess: true,
      watermarkContent: false,
      downloadAccess: true,
      viewComments: true,
      addComments: true,
      viewTags: true,
      addTags: true,
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
      addTags: true,
      canQuery: true,
      isVisible: true
    }
  },
  {
    id: 'default-read',
    name: 'Viewer',
    isDefault: true,
    allAccess: true,
    canQueryEntireDataroom: true,
    canOrganize: false,
    canRetryProcessing: false,
    defaultFilePerms: {
      viewAccess: true,
      watermarkContent: false,
      downloadAccess: false,
      viewComments: true,
      addComments: false,
      viewTags: true,
      addTags: false,
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
      addTags: false,
      canQuery: true,
      isVisible: true
    }
  }
]; 