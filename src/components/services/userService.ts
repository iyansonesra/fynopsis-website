import { get, post, put, del } from 'aws-amplify/api';
import type { 
  User, 
  TransferOwnershipDialog, 
  PermissionGroup, 
  FilePermission, 
  FileTreeItem as FileTreeItemType 
} from '../tabs/user_management/CollaboratorsTypes';

/**
 * Fetch all users associated with a dataroom
 * @param bucketUuid The dataroom/bucket identifier
 * @returns Array of users with their permissions
 */
export const fetchUsers = async (bucketUuid: string): Promise<User[]> => {
  try {
    const restOperation = get({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/get-all-users`,
      options: {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      },
    });

    const { body } = await restOperation.response;
    const responseText = await body.text();
    const response = JSON.parse(responseText);
    
    // Handle response when it's an array
    if (Array.isArray(response)) {
      return response.map((user: any) => ({
        ...user,
        isInvited: user.status === 'INVITED',
        role: user.role,
        invitedRole: user.invitedRole,
        permissionInfo: user.permissionInfo || {
          type: 'ROLE',
          displayName: formatRoleDisplay(user.role),
        },
        invitedPermissionInfo: user.invitedPermissionInfo || (user.invitedRole ? {
          type: 'ROLE',
          displayName: formatRoleDisplay(user.invitedRole),
        } : undefined)
      }));
    } 
    // Handle response when it has a users property
    else if (response.users && Array.isArray(response.users)) {
      return response.users.map((user: any) => ({
        ...user,
        isInvited: user.status === 'INVITED',
        role: user.role,
        invitedRole: user.invitedRole,
        permissionInfo: user.permissionInfo || {
          type: 'ROLE',
          displayName: formatRoleDisplay(user.role),
        },
        invitedPermissionInfo: user.invitedPermissionInfo || (user.invitedRole ? {
          type: 'ROLE',
          displayName: formatRoleDisplay(user.invitedRole),
        } : undefined)
      }));
    } 
    else {
      console.error('Unexpected response format:', response);
      return [];
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Helper function to format role display names
 * @param role Role identifier string
 * @returns Formatted display name for the role
 */
const formatRoleDisplay = (role: string): string => {
  if (role === 'READ') return 'Viewer';
  if (role === 'WRITE') return 'Editor';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

/**
 * Fetch the current user's permission level for a dataroom
 * @param bucketUuid The dataroom/bucket identifier
 * @returns Permission details for the current user
 */
export const fetchPermissionLevel = async (bucketUuid: string) => {
  try {
    const restOperation = get({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/get-permissions`,
      options: {
        headers: {
          'Content-Type': 'application/json'
        },
      },
    });

    const { body } = await restOperation.response;
    const responseText = await body.text();
    const response = JSON.parse(responseText);
    
    return {
      role: response.role,
      sharedBy: response.sharedBy,
      addedAt: response.addedAt
    };
  } catch (error) {
    console.error('Error fetching permission level:', error);
    throw error;
  }
};

/**
 * Fetch custom permission groups for a dataroom
 * @param bucketUuid The dataroom/bucket identifier
 * @returns Array of permission groups
 */
export const fetchPermissionGroups = async (bucketUuid: string): Promise<PermissionGroup[]> => {
  try {
    const restOperation = get({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/permission-groups`,
      options: { 
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true 
      }
    });
    
    const response = await restOperation.response;
    const groups = await response.body.json();
    
    if (Array.isArray(groups)) {
      return groups as PermissionGroup[];
    } else {
      console.error("Unexpected response format for permission groups:", groups);
      return [];
    }
  } catch (error) {
    console.error('Error fetching permission groups:', error);
    throw error;
  }
};

/**
 * Change a user's permission level in a dataroom
 * @param bucketUuid The dataroom/bucket identifier
 * @param userEmail Email of the user whose permissions to change
 * @param newPermissionLevel New permission level to assign
 * @returns API response from the operation
 */
export const changeUserPermission = async (
  bucketUuid: string, 
  userEmail: string, 
  newPermissionLevel: string
) => {
  try {
    const restOperation = post({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/change-user-permissions`,
      options: {
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          userEmail,
          newPermissionLevel
        },
        withCredentials: true
      },
    });

    const { body } = await restOperation.response;
    const responseText = await body.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error changing user permissions:', error);
    throw error;
  }
};

/**
 * Transfer ownership of a dataroom to another user
 * @param bucketUuid The dataroom/bucket identifier
 * @param newOwnerEmail Email of the user to receive ownership
 * @returns API response from the operation
 */
export const transferOwnership = async (bucketUuid: string, newOwnerEmail: string) => {
  try {
    const restOperation = post({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/transfer-ownership`,
      options: {
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          newOwnerEmail
        },
        withCredentials: true
      },
    });

    const response = await restOperation.response;
    return response;
  } catch (error) {
    console.error('Error transferring ownership:', error);
    throw error;
  }
};

/**
 * Remove a user from a dataroom
 * @param bucketUuid The dataroom/bucket identifier
 * @param userEmail Email of the user to remove
 * @returns API response from the operation
 */
export const removeUser = async (bucketUuid: string, userEmail: string) => {
  try {
    const restOperation = post({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/remove-user`,
      options: {
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          userEmail
        },
        withCredentials: true
      },
    });

    const response = await restOperation.response;
    return response;
  } catch (error) {
    console.error('Error removing user:', error);
    throw error;
  }
};

/**
 * Invite a user to a dataroom
 * @param bucketUuid The dataroom/bucket identifier
 * @param userEmail Email of the user to invite
 * @param permissionIdentifier Permission level to assign
 * @returns API response from the operation
 */
export const inviteUser = async (
  bucketUuid: string, 
  userEmail: string, 
  permissionIdentifier: string
) => {
  try {
    const restOperation = post({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/invite-user`,
      options: {
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          userEmail: userEmail.trim(),
          permissionIdentifier
        },
        withCredentials: true
      },
    });

    const { statusCode, body } = await restOperation.response;
    
    if (statusCode >= 400) {
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      throw new Error(response.message || 'Failed to invite user');
    }
    
    return true;
  } catch (error) {
    console.error('Error inviting user:', error);
    throw error;
  }
};

/**
 * Create a new permission group
 * @param bucketUuid The dataroom/bucket identifier
 * @param groupName Name for the new permission group
 * @param permissions Permission settings for the group
 * @returns API response from the operation
 */
export const createPermissionGroup = async (
  bucketUuid: string, 
  groupName: string, 
  permissions: PermissionGroup
) => {
  try {
    // Map frontend state (NEW structure) to the backend expected structure
    // NOTE: This assumes the backend API has been updated to accept the NEW structure.
    // If the backend still expects the OLD structure, this mapping needs adjustment.
    const backendPermissionsPayload = {
      // Pass the relevant fields from the NEW frontend structure
      name: groupName, // Name is passed separately but could be part of payload too
      allAccess: permissions.allAccess,
      
      // Direct Permissions
      canQueryEntireDataroom: permissions.canQueryEntireDataroom ?? false,
      canOrganize: permissions.canOrganize ?? false,
      canRetryProcessing: permissions.canRetryProcessing ?? false,
      canDeleteDataroom: permissions.canDeleteDataroom ?? false,
      
      // Panel Permissions
      canAccessIssuesPanel: permissions.canAccessIssuesPanel ?? false,
      canCreateIssue: permissions.canCreateIssue ?? false,
      canAnswerIssue: permissions.canAnswerIssue ?? false,
      canAccessAuditLogsPanel: permissions.canAccessAuditLogsPanel ?? false,
      canViewAuditLogs: permissions.canViewAuditLogs ?? false, // Kept
      canExportAuditLogs: permissions.canExportAuditLogs ?? false,
      canAccessDiligenceDashboard: permissions.canAccessDiligenceDashboard ?? false,
      canCreateDiligenceWidget: permissions.canCreateDiligenceWidget ?? false,
      canMoveWidgets: permissions.canMoveWidgets ?? false,
      canDeleteWidgets: permissions.canDeleteWidgets ?? false,
      canAccessQuestionairePanel: permissions.canAccessQuestionairePanel ?? false, // Using frontend spelling
      canAddQuestionnaire: permissions.canAddQuestionnaire ?? false, // Using frontend spelling
      
      // User Management Permissions
      canAccessUserManagementPanel: permissions.canAccessUserManagementPanel ?? false,
      canViewUsers: permissions.canViewUsers ?? false,
      canViewPermissionGroupDetails: permissions.canViewPermissionGroupDetails ?? false,
      canInviteUsers: permissions.canInviteUsers ?? [], // Default to empty array
      canUpdateUserPermissions: permissions.canUpdateUserPermissions ?? [], // Default to empty array
      canUpdatePeerPermissions: permissions.canUpdatePeerPermissions ?? false,
      canRemoveUsers: permissions.canRemoveUsers ?? [], // Default to empty array
      canRemovePeerPermission: permissions.canRemovePeerPermission ?? false,
      canCreatePermissionGroups: permissions.canCreatePermissionGroups ?? false, // Kept
      
      // Default Permissions (Flattened structure, ensure defaults for optional fields)
      defaultFilePerms: {
        viewAccess: permissions.defaultFilePerms.viewAccess,
        watermarkContent: permissions.defaultFilePerms.watermarkContent,
        deleteAccess: permissions.defaultFilePerms.deleteAccess ?? false,
        editAccess: permissions.defaultFilePerms.editAccess ?? false,
        deleteEditAccess: permissions.defaultFilePerms.deleteEditAccess ?? false, // Keep or remove based on backend expectation
        viewComments: permissions.defaultFilePerms.viewComments,
        addComments: permissions.defaultFilePerms.addComments,
        downloadAccess: permissions.defaultFilePerms.downloadAccess,
        viewTags: permissions.defaultFilePerms.viewTags,
        addTags: permissions.defaultFilePerms.addTags ?? false,
        canQuery: permissions.defaultFilePerms.canQuery,
        isVisible: permissions.defaultFilePerms.isVisible,
        moveAccess: permissions.defaultFilePerms.moveAccess ?? false,
        renameAccess: permissions.defaultFilePerms.renameAccess ?? false,
      },
      defaultFolderPerms: {
        allowUploads: permissions.defaultFolderPerms.allowUploads,
        createFolders: permissions.defaultFolderPerms.createFolders,
        addComments: permissions.defaultFolderPerms.addComments,
        viewComments: permissions.defaultFolderPerms.viewComments,
        viewContents: permissions.defaultFolderPerms.viewContents,
        viewTags: permissions.defaultFolderPerms.viewTags,
        addTags: permissions.defaultFolderPerms.addTags ?? false,
        canQuery: permissions.defaultFolderPerms.canQuery,
        isVisible: permissions.defaultFolderPerms.isVisible,
        moveContents: permissions.defaultFolderPerms.moveContents ?? false,
        renameContents: permissions.defaultFolderPerms.renameContents ?? false,
        deleteContents: permissions.defaultFolderPerms.deleteContents ?? false,
      },
      
      // Specific Overrides
      folderIdAccess: permissions.folderIdAccess || {},
      fileIdAccess: permissions.fileIdAccess || {}
      
      // Removed old/deprecated mappings: canQuery, canUseQA, canReadAnswerQuestions
    };

    const restOperation = post({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/permission-groups`,
      options: {
        body: {
          groupName,
          permissions: backendPermissionsPayload
        },
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      }
    });

    const response = await restOperation.response;
    const result = await response.body.json();
    return result;
  } catch (error) {
    console.error("Error creating permission group:", error);
    throw error;
  }
};

/**
 * Update an existing permission group
 * @param bucketUuid The dataroom/bucket identifier
 * @param permissionGroupId ID of the permission group to update
 * @param groupName Name for the updated permission group
 * @param permissions Permission settings for the group
 * @returns API response from the operation
 */
export const updatePermissionGroup = async (
  bucketUuid: string,
  permissionGroupId: string,
  groupName: string,
  permissions: PermissionGroup
) => {
  try {
    // Map frontend state to the backend expected structure
    const backendPermissionsPayload = {
      // Direct Permissions
      allAccess: permissions.allAccess,
      canQueryEntireDataroom: permissions.canQueryEntireDataroom ?? false,
      canOrganize: permissions.canOrganize ?? false,
      canRetryProcessing: permissions.canRetryProcessing ?? false,
      canDeleteDataroom: permissions.canDeleteDataroom ?? false,
      
      // Panel Permissions
      canAccessIssuesPanel: permissions.canAccessIssuesPanel ?? false,
      canCreateIssue: permissions.canCreateIssue ?? false,
      canAnswerIssue: permissions.canAnswerIssue ?? false,
      canAccessAuditLogsPanel: permissions.canAccessAuditLogsPanel ?? false,
      canViewAuditLogs: permissions.canViewAuditLogs ?? false,
      canExportAuditLogs: permissions.canExportAuditLogs ?? false,
      canAccessDiligenceDashboard: permissions.canAccessDiligenceDashboard ?? false,
      canCreateDiligenceWidget: permissions.canCreateDiligenceWidget ?? false,
      canMoveWidgets: permissions.canMoveWidgets ?? false,
      canDeleteWidgets: permissions.canDeleteWidgets ?? false,
      canAccessQuestionairePanel: permissions.canAccessQuestionairePanel ?? false,
      canAddQuestionnaire: permissions.canAddQuestionnaire ?? false,
      
      // User Management Permissions
      canAccessUserManagementPanel: permissions.canAccessUserManagementPanel ?? false,
      canViewUsers: permissions.canViewUsers ?? false,
      canViewPermissionGroupDetails: permissions.canViewPermissionGroupDetails ?? false,
      canInviteUsers: permissions.canInviteUsers ?? [],
      canUpdateUserPermissions: permissions.canUpdateUserPermissions ?? [],
      canUpdatePeerPermissions: permissions.canUpdatePeerPermissions ?? false,
      canRemoveUsers: permissions.canRemoveUsers ?? [],
      canRemovePeerPermission: permissions.canRemovePeerPermission ?? false,
      canCreatePermissionGroups: permissions.canCreatePermissionGroups ?? false,
      
      // Default Permissions
      defaultFilePerms: permissions.defaultFilePerms,
      defaultFolderPerms: permissions.defaultFolderPerms,
      
      // Specific Overrides
      folderIdAccess: permissions.folderIdAccess || {},
      fileIdAccess: permissions.fileIdAccess || {}
    };

    const restOperation = put({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/permission-groups/${permissionGroupId}`,
      options: {
        headers: { 'Content-Type': 'application/json' },
        body: {
          name: groupName,
          ...backendPermissionsPayload
        },
        withCredentials: true
      }
    });

    const response = await restOperation.response;
    const result = await response.body.json();
    return result;
  } catch (error) {
    console.error("Error updating permission group:", error);
    throw error;
  }
};

/**
 * Delete a permission group
 * @param bucketUuid The dataroom/bucket identifier
 * @param permissionGroupId ID of the permission group to delete
 * @returns API response from the operation
 */
export const deletePermissionGroup = async (
  bucketUuid: string,
  permissionGroupId: string
) => {
  try {
    // Using del function from aws-amplify/api as used in metricsService.ts
    const restOperation = del({
      apiName: 'S3_API',
      path: `/share-folder/${bucketUuid}/permission-groups/${permissionGroupId}`,
      options: {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      }
    });
    
    await restOperation.response;
    return { success: true, message: 'Permission group deleted successfully' };
  } catch (error) {
    console.error("Error deleting permission group:", error);
    
    // Check if the error contains a message about users
    if (error instanceof Error && 
        (error.message.includes('in use by users') || 
         error.message.includes('Cannot delete permission group'))) {
      throw new Error('Cannot delete permission group that is in use by users');
    }
    
    throw error;
  }
}; 