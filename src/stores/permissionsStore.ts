import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PermissionDetails {
  allAccess: boolean;
  canAccessAuditLogsPanel: boolean;
  canAccessDiligenceDashboard: boolean;
  canAccessIssuesPanel: boolean;
  canAccessQuestionairePanel: boolean;
  canAccessUserManagementPanel: boolean;
  canAddQuestionaire: boolean;
  canAnswerIssue: boolean;
  canCreateDiligenceWidget: boolean;
  canCreateIssue: boolean;
  canCreatePermissionGroups: boolean;
  canDeleteDataroom: boolean;
  canDeleteWidgets: boolean;
  canExportAuditLogs: boolean;
  canInviteUsers: string[];
  canMoveWidgets: boolean;
  canOrganize: boolean;
  canQueryEntireDataroom: boolean;
  canRemovePeerPermission: boolean;
  canRemoveUsers: string[];
  canRetryProcessing: boolean;
  canUpdatePeerPermissions: boolean;
  canUpdateUserPermissions: string[];
  canViewAuditLogs: boolean;
  canViewPermissionGroupDetails: boolean;
  canViewUsers: boolean;
  dataroomId: string;
  defaultFilePerms: {
    viewAccess: boolean;
    watermarkContent: boolean;
    deleteAccess: boolean;
    editAccess: boolean;
    viewComments: boolean;
  };
  defaultFolderPerms: {
    allowUploads: boolean;
    createFolders: boolean;
    addComments: boolean;
    viewComments: boolean;
    viewContents: boolean;
  };
  id: string;
  name: string;
  role: string;
  sharedBy: string;
}

interface PermissionsState {
  permissionDetails: PermissionDetails | null;
  isLoadingPermissions: boolean;
  hasPermission: boolean;
  dataroomId: string | null;
  setPermissions: (permissions: PermissionDetails) => void;
  clearPermissions: () => void;
  setLoading: (loading: boolean) => void;
  setHasPermission: (hasPermission: boolean) => void;
  setDataroomId: (id: string | null) => void;
  // Individual permission setters
  setAllAccess: (value: boolean) => void;
  setCanAccessAuditLogsPanel: (value: boolean) => void; // done
  setCanAccessDiligenceDashboard: (value: boolean) => void; // done
  setCanAccessIssuesPanel: (value: boolean) => void; // done
  setCanAccessQuestionairePanel: (value: boolean) => void; // true
  setCanAccessUserManagementPanel: (value: boolean) => void; // true
  setCanAddQuestionaire: (value: boolean) => void;  // done
  setCanAnswerIssue: (value: boolean) => void; // done
  setCanCreateDiligenceWidget: (value: boolean) => void; // done
  setCanCreateIssue: (value: boolean) => void; // done
  setCanCreatePermissionGroups: (value: boolean) => void; // done
  setCanDeleteDataroom: (value: boolean) => void; 
  setCanDeleteWidgets: (value: boolean) => void; // done
  setCanExportAuditLogs: (value: boolean) => void; // done
  setCanInviteUsers: (value: string[]) => void; // done
  setCanMoveWidgets: (value: boolean) => void; // done
  setCanOrganize: (value: boolean) => void; 
  setCanQueryEntireDataroom: (value: boolean) => void; // done
  setCanRemovePeerPermission: (value: boolean) => void;
  setCanRemoveUsers: (value: string[]) => void;
  setCanRetryProcessing: (value: boolean) => void;
  setCanUpdatePeerPermissions: (value: boolean) => void;
  setCanUpdateUserPermissions: (value: string[]) => void;
  setCanViewAuditLogs: (value: boolean) => void;
  setCanViewPermissionGroupDetails: (value: boolean) => void;
  setCanViewUsers: (value: boolean) => void;
  setDefaultFilePerms: (value: PermissionDetails['defaultFilePerms']) => void;
  setDefaultFolderPerms: (value: PermissionDetails['defaultFolderPerms']) => void;
  setId: (value: string) => void;
  setName: (value: string) => void;
  setRole: (value: string) => void;
  setSharedBy: (value: string) => void;
}

// Create a secure store with encryption
export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set) => ({
      permissionDetails: null,
      isLoadingPermissions: true,
      hasPermission: false,
      dataroomId: null,
      setPermissions: (permissions) => set({ permissionDetails: permissions }),
      clearPermissions: () => set({ permissionDetails: null }),
      setLoading: (loading) => set({ isLoadingPermissions: loading }),
      setHasPermission: (hasPermission) => set({ hasPermission }),
      setDataroomId: (id) => set({ dataroomId: id }),
      
      // Individual permission setters
      setAllAccess: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, allAccess: value } : null
      })),
      setCanAccessAuditLogsPanel: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canAccessAuditLogsPanel: value } : null
      })),
      setCanAccessDiligenceDashboard: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canAccessDiligenceDashboard: value } : null
      })),
      setCanAccessIssuesPanel: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canAccessIssuesPanel: value } : null
      })),
      setCanAccessQuestionairePanel: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canAccessQuestionairePanel: value } : null
      })),
      setCanAccessUserManagementPanel: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canAccessUserManagementPanel: value } : null
      })),
      setCanAddQuestionaire: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canAddQuestionaire: value } : null
      })),
      setCanAnswerIssue: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canAnswerIssue: value } : null
      })),
      setCanCreateDiligenceWidget: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canCreateDiligenceWidget: value } : null
      })),
      setCanCreateIssue: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canCreateIssue: value } : null
      })),
      setCanCreatePermissionGroups: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canCreatePermissionGroups: value } : null
      })),
      setCanDeleteDataroom: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canDeleteDataroom: value } : null
      })),
      setCanDeleteWidgets: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canDeleteWidgets: value } : null
      })),
      setCanExportAuditLogs: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canExportAuditLogs: value } : null
      })),
      setCanInviteUsers: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canInviteUsers: value } : null
      })),
      setCanMoveWidgets: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canMoveWidgets: value } : null
      })),
      setCanOrganize: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canOrganize: value } : null
      })),
      setCanQueryEntireDataroom: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canQueryEntireDataroom: value } : null
      })),
      setCanRemovePeerPermission: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canRemovePeerPermission: value } : null
      })),
      setCanRemoveUsers: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canRemoveUsers: value } : null
      })),
      setCanRetryProcessing: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canRetryProcessing: value } : null
      })),
      setCanUpdatePeerPermissions: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canUpdatePeerPermissions: value } : null
      })),
      setCanUpdateUserPermissions: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canUpdateUserPermissions: value } : null
      })),
      setCanViewAuditLogs: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canViewAuditLogs: value } : null
      })),
      setCanViewPermissionGroupDetails: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canViewPermissionGroupDetails: value } : null
      })),
      setCanViewUsers: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, canViewUsers: value } : null
      })),
      setDefaultFilePerms: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, defaultFilePerms: value } : null
      })),
      setDefaultFolderPerms: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, defaultFolderPerms: value } : null
      })),
      setId: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, id: value } : null
      })),
      setName: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, name: value } : null
      })),
      setRole: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, role: value } : null
      })),
      setSharedBy: (value) => set((state) => ({
        permissionDetails: state.permissionDetails ? { ...state.permissionDetails, sharedBy: value } : null
      })),
    }),
    {
      name: 'permissions-storage',
      // Use encryption for the stored data
      partialize: (state) => ({
        permissionDetails: state.permissionDetails,
        dataroomId: state.dataroomId,
      }),
    }
  )
);

// Helper functions to check specific permissions
export const hasPermission = (permission: keyof PermissionDetails): boolean => {
  const { permissionDetails } = usePermissionsStore.getState();
  return permissionDetails?.[permission] === true;
};

export const canInviteUsers = (): boolean => {
  const { permissionDetails } = usePermissionsStore.getState();
  return permissionDetails?.canInviteUsers?.includes('*') ?? false;
};

export const canRemoveUsers = (): boolean => {
  const { permissionDetails } = usePermissionsStore.getState();
  return permissionDetails?.canRemoveUsers?.includes('*') ?? false;
};

export const canUpdateUserPermissions = (): boolean => {
  const { permissionDetails } = usePermissionsStore.getState();
  return permissionDetails?.canUpdateUserPermissions?.includes('*') ?? false;
}; 