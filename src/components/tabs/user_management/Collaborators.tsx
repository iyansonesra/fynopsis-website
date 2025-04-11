import React, { useEffect, useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { usePathname } from 'next/navigation';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Users, Plus, Settings, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Amplify } from 'aws-amplify';
import { 
  FilePermission, 
  FileTreeItem as FileTreeItemType, 
  User, 
  UserManagementProps, 
  TransferOwnershipDialog, 
  PermissionGroup, 
  Role 
} from './CollaboratorsTypes';
import { DEFAULT_ROLES } from './CollaboratorsTypes';
import { FolderPermissionTree, ItemPermissionsPanel } from './PermissionFolderTree';
import { usePermissionsStore } from '@/stores/permissionsStore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Import service functions
import { 
  fetchUsers, 
  fetchPermissionLevel, 
  fetchPermissionGroups,
  changeUserPermission,
  transferOwnership,
  removeUser,
  inviteUser,
  createPermissionGroup,
  updatePermissionGroup,
  deletePermissionGroup
} from '../../services/userService';

// Import components
import { SkeletonCard } from './components/SkeletonCard';
import { UserCard, RoleSelect, formatRoleDisplay } from './components/UserCard';
import { InviteUserDialog } from './components/InviteUserDialog';
import { RemoveUserDialog } from './components/RemoveUserDialog';
import { TransferOwnershipDialog as TransferOwnershipDialogComponent } from './components/TransferOwnershipDialog';
import { PermissionGroupDialog } from './components/PermissionGroupDialog';
import { PermissionGroupsTabContent } from './components/PermissionGroupsTabContent';
import { UsersTabContent } from './components/UsersTabContent';
import { ViewGroupDetailsDialog } from './components/ViewGroupDetailsDialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { DeletePermissionGroupDialog } from './components/DeletePermissionGroupDialog';

// Define RoleInfo locally to avoid import issues
interface RoleInfo {
  id: string;
  name: string;
  type: 'ROLE' | 'GROUP';
  description?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ dataroomId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUsers, setOtherUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Record<string, RoleInfo>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [ownerTransfer, setOwnerTransfer] = useState<TransferOwnershipDialog>({
    isOpen: false,
    targetUser: null
  });
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'READ' | 'WRITE' | 'ADMIN'>('READ');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const pathname = usePathname() || '';
  const pathArray = pathname.split('/');
  const bucketUuid = pathArray[2] || '';

  const { toast } = useToast(); // Initialize toast
  const [customPermissionGroups, setCustomPermissionGroups] = useState<PermissionGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const { permissionDetails } = usePermissionsStore();
  
  // Use the service function to fetch permission groups
  const loadPermissionGroups = async () => {
    if (!bucketUuid) return;
    setIsLoadingGroups(true);
    try {
      const groups = await fetchPermissionGroups(bucketUuid);
      setPermissionGroups(groups);
    } catch (error) {
      console.error('Error fetching permission groups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch permission groups.",
        variant: "destructive"
      });
      setGroupsError('Failed to fetch permission groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Add a useEffect to fetch data when the component mounts
  useEffect(() => {
    if (bucketUuid) {
      loadUsers();
      loadPermissionLevel();
      loadPermissionGroups(); // Load permission groups
    }
  }, [bucketUuid]);

  // Permission group state variables
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroup, setNewGroup] = useState<PermissionGroup>(() => {
    // Initialize with a structure reflecting the NEW PermissionGroup type
    // Start with restrictive defaults for a *new* custom group.
    const initialGroup: PermissionGroup = {
      id: '', // Will be set by backend
      name: '', // Will be set by user input
      isDefault: false,
      // dataroomId: '', // This likely comes from context/props, not part of creation form

      // Direct Permissions
      allAccess: true, // Start with general access ON by default
      canQueryEntireDataroom: false,
      canOrganize: false,
      canRetryProcessing: false,
      canDeleteDataroom: false, // Should always be false for non-owners

      // Issues Panel
      canAccessIssuesPanel: false,
      canCreateIssue: false,
      canAnswerIssue: false,

      // Audit Logs Panel
      canAccessAuditLogsPanel: false,
      canViewAuditLogs: false,
      canExportAuditLogs: false,

      // Diligence Dashboard Panel
      canAccessDiligenceDashboard: false,
      canCreateDiligenceWidget: false,
      canMoveWidgets: false,
      canDeleteWidgets: false,

      // Questionnaire Panel
      canAccessQuestionairePanel: false, // Using standard spelling
      canAddQuestionnaire: false,

      // User Management Panel
      canAccessUserManagementPanel: false,
      canViewUsers: false,
      canViewPermissionGroupDetails: false,
      canInviteUsers: [], // Start empty, user adds roles
      canUpdateUserPermissions: [], // Start empty
      canUpdatePeerPermissions: false,
      canRemoveUsers: [], // Start empty
      canRemovePeerPermission: false,
      canCreatePermissionGroups: false,

      // Default Permissions (Apply when allAccess: true)
      defaultFilePerms: {
          viewAccess: true, // Basic view access is a reasonable default
          watermarkContent: false,
          deleteAccess: false,
          editAccess: false,
          // deleteEditAccess: false, // Use separate delete/edit flags now
          viewComments: true,
          addComments: false,
          downloadAccess: false,
          viewTags: true,
          addTags: false,
          canQuery: false, // Default to false for files unless specified
          isVisible: true, // Default to visible
          moveAccess: false,
          renameAccess: false,
      },
      defaultFolderPerms: {
          allowUploads: false,
          createFolders: false,
          addComments: false,
          viewComments: true,
          viewContents: true, // Basic view access
          viewTags: true,
          addTags: false,
          canQuery: false,
          isVisible: true,
          moveContents: false,
          renameContents: false,
          deleteContents: false,
      },

      // Specific Overrides (Start empty)
      folderIdAccess: {},
      fileIdAccess: {}
    };
    return initialGroup;
  });
  const [activeTab, setActiveTab] = useState('users');
  
  // Add view details dialog state
  const [viewGroupDetails, setViewGroupDetails] = useState<{ isOpen: boolean, group: PermissionGroup | null }>({
    isOpen: false,
    group: null
  });
  
  // Sample folder structure - this would come from an API in production
  const [folderStructure, setFolderStructure] = useState<FileTreeItemType[]>([
    {
      id: 'folder1',
      name: 'Financials',
      type: 'folder',
      children: [
        {
          id: 'file1',
          name: 'Q1 Report.pdf',
          type: 'file',
          parentId: 'folder1'
        },
        {
          id: 'file2',
          name: 'Q2 Report.pdf',
          type: 'file',
          parentId: 'folder1'
        },
        {
          id: 'folder2',
          name: 'Quarterly Breakdowns',
          type: 'folder',
          parentId: 'folder1',
          children: [
            {
              id: 'file3',
              name: 'Jan-Mar Details.xlsx',
              type: 'file',
              parentId: 'folder2'
            },
            {
              id: 'file4',
              name: 'Apr-Jun Details.xlsx',
              type: 'file',
              parentId: 'folder2'
            }
          ]
        }
      ]
    },
    {
      id: 'folder3',
      name: 'Legal Documents',
      type: 'folder',
      children: [
        {
          id: 'file5',
          name: 'NDA.pdf',
          type: 'file',
          parentId: 'folder3'
        },
        {
          id: 'file6',
          name: 'Contract.pdf',
          type: 'file',
          parentId: 'folder3'
        }
      ]
    }
  ]);

  // --- Lifted State for Maps (for Create Group Dialog scope) ---
  const [dialogItemsMap, setDialogItemsMap] = useState<Record<string, FileTreeItemType>>({});
  const [dialogChildrenMap, setDialogChildrenMap] = useState<Record<string, string[]>>({});
  const [dialogParentMap, setDialogParentMap] = useState<Record<string, string | undefined>>({});

  // Effect to build maps when folderStructure changes (within UserManagement scope)
  useEffect(() => {
    const itemMap: Record<string, FileTreeItemType> = {};
    const childMap: Record<string, string[]> = {};
    const pMap: Record<string, string | undefined> = {};

    const processItem = (item: FileTreeItemType, parentId?: string) => {
      itemMap[item.id] = item;
      pMap[item.id] = parentId;
      if (item.children && item.children.length > 0) {
        childMap[item.id] = item.children.map((child: FileTreeItemType) => child.id);
        item.children.forEach((child: FileTreeItemType) => processItem(child, item.id));
      } else {
        childMap[item.id] = [];
      }
    };
    folderStructure.forEach((item: FileTreeItemType) => processItem(item));

    setDialogItemsMap(itemMap);
    setDialogChildrenMap(childMap);
    setDialogParentMap(pMap);
  }, [folderStructure]); // Rebuild maps if folder structure changes
  // --- End Lifted State ---

  const canModifyUserRole = (currentUserRole: Role, targetUserRole: Role, isCurrentUser: boolean = false) => {
    // Owner cannot modify their own permission
    if (isCurrentUser && currentUserRole === 'OWNER') {
      return false;
    }
    
    if (currentUserRole === 'OWNER') {
      return true;  // OWNER can modify any other role
    }
    if (currentUserRole === 'ADMIN') {
      return targetUserRole !== 'OWNER' && targetUserRole !== 'ADMIN';  // ADMIN can only modify READ and WRITE roles
    }
    return false;  // Other roles cannot modify any roles
  };

  const canRemoveUser = (currentUserRole: Role, targetUserRole: Role) => {
    if (currentUserRole === 'OWNER') {
      return true;  // OWNER can remove anyone
    }
    if (currentUserRole === 'ADMIN') {
      return targetUserRole === 'READ' || targetUserRole === 'WRITE';  // ADMIN can only remove READ and WRITE roles
    }
    return false;  // Other roles cannot remove anyone
  };

  // Use the service to handle role changes
  const handleRoleChange = (userEmail: string, newRoleId: string) => {
    // Get role info from availableRoles
    const roleInfo = availableRoles[newRoleId];
    
    // Special case for transferring ownership
    if (newRoleId === 'OWNER' && currentUser?.role === 'OWNER') {
      setOwnerTransfer({
        isOpen: true,
        targetUser: users.find(u => u.email === userEmail) || null
      });
    } else {
      handleChangePermission(userEmail, newRoleId);
    }
  };

  // Use the service to handle permission changes
  const handleChangePermission = async (userEmail: string, newRoleId: string) => {
    try {
      await changeUserPermission(bucketUuid, userEmail, newRoleId);
      await loadUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error changing user permission:', error);
      toast({
        title: "Error",
        description: "Failed to change user permission.",
        variant: "destructive"
      });
    }
  };

  // Use the service to handle ownership transfer
  const handleOwnershipTransfer = async () => {
    if (!ownerTransfer.targetUser) return;

    try {
      await transferOwnership(bucketUuid, ownerTransfer.targetUser.email);
      setOwnerTransfer({ isOpen: false, targetUser: null });
      await loadUsers(); // Refresh user list
      toast({
        title: "Success",
        description: "Ownership transferred successfully."
      });
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast({
        title: "Error",
        description: "Failed to transfer ownership.",
        variant: "destructive"
      });
    }
  };

  // Use the service to load current user permissions
  const loadPermissionLevel = async () => {
    try {
      const permissions = await fetchPermissionLevel(bucketUuid);
      // You can use the permissions if needed
    } catch (error) {
      setError('Failed to fetch permissions');
      console.error('Error fetching permissions:', error);
    }
  };

  useEffect(() => {
    const fetchAttributes = async () => {
      const userAttributes = await fetchUserAttributes();
      const currentUserEmail = userAttributes.email;

      if (users.length > 0) {
        const current = users.find(user => user.email === currentUserEmail);
        const others = users.filter(user => user.email !== currentUserEmail);

        setCurrentUser(current || null);
        setOtherUsers(others);
      }
    };
    fetchAttributes();
  }, [users]);

  // Use the service to load users
  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchUsers(bucketUuid);
      setUsers(response.users);
      setAvailableRoles(response.roles);
      
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
      setUsers([]);
      setAvailableRoles({});
      setIsLoading(false);
    }
  };

  // Use the service to handle user invitation
  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || isInviting) return;
    setIsInviting(true);
    setInviteError(null);
    try {
      await inviteUser(bucketUuid, inviteEmail, inviteRole);
      
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('READ');
      await loadUsers(); // Refresh the user list
      toast({
        title: "Success",
        description: `Invitation sent to ${inviteEmail}.`
      });
    } catch (error) {
      console.error('Error inviting user:', error);
      setInviteError(error instanceof Error ? error.message : 'Failed to invite user');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to invite user.",
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Use the service to handle permission group creation
  const handleCreatePermissionGroup = async () => {
    if (!newGroupName.trim() || !bucketUuid) return;
    setIsCreatingGroup(true);
    try {
      await createPermissionGroup(bucketUuid, newGroupName, newGroup);

      toast({
        title: "Success",
        description: `Permission group "${newGroupName}" created successfully.`
      });

      // Reset state and close dialog
      setIsCreateGroupDialogOpen(false);
      setNewGroupName('');
      // Reset newGroup to the initial state function to ensure clean slate
      setNewGroup(() => { 
         const initialGroup: PermissionGroup = {
            id: '', name: '', isDefault: false, allAccess: true, 
            canQueryEntireDataroom: false, canOrganize: false, canRetryProcessing: false, canDeleteDataroom: false,
            canAccessIssuesPanel: false, canCreateIssue: false, canAnswerIssue: false,
            canAccessAuditLogsPanel: false, canViewAuditLogs: false, canExportAuditLogs: false,
            canAccessDiligenceDashboard: false, canCreateDiligenceWidget: false, canMoveWidgets: false, canDeleteWidgets: false,
            canAccessQuestionairePanel: false, canAddQuestionnaire: false,
            canAccessUserManagementPanel: false, canViewUsers: false, canViewPermissionGroupDetails: false,
            canInviteUsers: [], canUpdateUserPermissions: [], canUpdatePeerPermissions: false, canRemoveUsers: [], canRemovePeerPermission: false, canCreatePermissionGroups: false,
            defaultFilePerms: {
                viewAccess: true, watermarkContent: false, deleteAccess: false, editAccess: false, 
                viewComments: true, addComments: false, downloadAccess: false, 
                viewTags: true, addTags: false, canQuery: false, isVisible: true, 
                moveAccess: false, renameAccess: false
            },
            defaultFolderPerms: {
                allowUploads: false, createFolders: false, addComments: false, viewComments: true, 
                viewContents: true, viewTags: true, addTags: false, canQuery: false, 
                isVisible: true, moveContents: false, renameContents: false, deleteContents: false
            },
            folderIdAccess: {}, fileIdAccess: {}
         };
         return initialGroup;
       });
      
      // Refresh the permission groups list
      await loadPermissionGroups();
    } catch (error) {
      console.error("Error creating permission group:", error);
      toast({
        title: "Error",
        description: "Failed to create permission group.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAllAccessChange = (checked: boolean) => {
    if (checked) {
      // When enabling all access
      setNewGroup({
        ...newGroup,
        allAccess: true,
      });
    } else {
      // When disabling all access, keep current permissions
      setNewGroup({
        ...newGroup,
        allAccess: false,
      });
    }
  };
  
  // --- Enhanced handleFilePermissionChange with Cascade Logic ---
  const handleFilePermissionChange = (fileId: string, permissionUpdate: Partial<FilePermission>) => {
    console.log(`handleFilePermissionChange called for ${fileId} with update:`, permissionUpdate);
  
    // Default Permission Values (used when creating/updating to ensure type compliance)
    const defaultPermValues: FilePermission = {
        show: true,
        viewAccess: true,
        downloadAccess: false,
        deleteEditAccess: false, // Using combined field now
        requireAgreement: false,
        viewTags: true,
        addTags: false,
        allowUploads: false,
        moveAccess: false,
        renameAccess: false,
        watermarkContent: false,
        viewComments: true,
        addComments: false,
        canQuery: false,
        isVisible: true
    };
  
    // Check if this is purely a visibility toggle
    const isVisibilityToggle = Object.keys(permissionUpdate).length === 1 && permissionUpdate.hasOwnProperty('show');
    const newVisibility = permissionUpdate.show;
  
    if (isVisibilityToggle && typeof newVisibility === 'boolean') {
      const item = dialogItemsMap[fileId];
      if (!item) {
          console.error("Item not found in map for visibility toggle:", fileId);
          return; 
      }
  
      setNewGroup(prevState => {
          // Explicitly type prevPermissions and cast the potentially partial state value
          const prevPermissions: Record<string, FilePermission> = (prevState.fileIdAccess as Record<string, FilePermission>) || {};
          const updates: Record<string, Partial<FilePermission>> = {}; // Store all partial updates needed
  
          // Helper: Get descendants
          const getAllDescendantIds = (itemId: string): string[] => {
            const result: string[] = [];
            const queue: string[] = [...(dialogChildrenMap[itemId] || [])];
            while (queue.length > 0) {
              const currentId = queue.shift()!;
            if (currentId) {
                  result.push(currentId);
                  const children = dialogChildrenMap[currentId] || [];
                  queue.push(...children);
              }
            }
            return result;
          };
  
          // 1. Prepare the direct update
          const directUpdate: Partial<FilePermission> = { show: newVisibility };
          if (!newVisibility) {
            directUpdate.viewAccess = false;
            directUpdate.downloadAccess = false;
            directUpdate.deleteEditAccess = false;
            directUpdate.requireAgreement = false;
            directUpdate.viewTags = false;
            directUpdate.allowUploads = false; 
          }
          updates[fileId] = directUpdate;
         
          // 2. Prepare Cascade Downwards updates (if folder)
          if (item.type === 'folder') {
            const descendants = getAllDescendantIds(fileId);
            console.log(`Cascading visibility ${newVisibility} to ${descendants.length} descendants`);
            descendants.forEach(descId => {
              const descPrevPerms = prevPermissions[descId] || {};
              if (descPrevPerms.show !== newVisibility) { 
                const descUpdate: Partial<FilePermission> = { show: newVisibility };
                if (!newVisibility) {
                  descUpdate.viewAccess = false;
                  descUpdate.downloadAccess = false;
                  descUpdate.deleteEditAccess = false;
                  descUpdate.requireAgreement = false;
                  descUpdate.viewTags = false;
                  descUpdate.allowUploads = false;
                }
                // Add or merge the update for the descendant
                updates[descId] = { ...(updates[descId] || {}), ...descUpdate };
              }
            });
         }
         
          // 3. Prepare Cascade Upwards updates (if showing)
          if (newVisibility) {
            let currentParentId = dialogParentMap[fileId];
            while (currentParentId) {
              const parentPrevPerms = prevPermissions[currentParentId] || {};
              if (parentPrevPerms.show !== true) { 
                console.log(`Auto-showing parent ${currentParentId}`);
                // Add or merge the update for the parent
                updates[currentParentId] = { ...(updates[currentParentId] || {}), show: true }; 
              }
              currentParentId = dialogParentMap[currentParentId];
            }
          }
  
          // Apply all updates atomically, ensuring complete FilePermission objects
          const nextPermissions: Record<string, FilePermission> = { ...prevPermissions }; 
          Object.keys(updates).forEach((id) => {
            const currentCompletePerms = prevPermissions[id] || defaultPermValues; // Start with previous or defaults
            const partialUpdate = updates[id];
            // Merge and ensure all fields exist, using defaults if needed after merge
            // Explicitly defining all fields to satisfy FilePermission type
            const mergedUpdate = { ...currentCompletePerms, ...partialUpdate }; 
            nextPermissions[id] = {
                show: mergedUpdate.show ?? defaultPermValues.show,
                viewAccess: mergedUpdate.viewAccess ?? defaultPermValues.viewAccess,
                downloadAccess: mergedUpdate.downloadAccess ?? defaultPermValues.downloadAccess,
                deleteEditAccess: mergedUpdate.deleteEditAccess ?? defaultPermValues.deleteEditAccess,
                requireAgreement: mergedUpdate.requireAgreement ?? defaultPermValues.requireAgreement,
                viewTags: mergedUpdate.viewTags ?? defaultPermValues.viewTags,
                addTags: mergedUpdate.addTags ?? defaultPermValues.addTags,
                allowUploads: mergedUpdate.allowUploads ?? defaultPermValues.allowUploads,
                moveAccess: mergedUpdate.moveAccess ?? defaultPermValues.moveAccess,
                renameAccess: mergedUpdate.renameAccess ?? defaultPermValues.renameAccess,
                watermarkContent: mergedUpdate.watermarkContent ?? defaultPermValues.watermarkContent,
                viewComments: mergedUpdate.viewComments ?? defaultPermValues.viewComments,
                addComments: mergedUpdate.addComments ?? defaultPermValues.addComments,
                canQuery: mergedUpdate.canQuery ?? defaultPermValues.canQuery,
                isVisible: mergedUpdate.isVisible ?? defaultPermValues.isVisible,
            };
          });
  
          console.log("Final updates being applied:", updates);
          console.log("Resulting permissions state:", nextPermissions);
  
          // Ensure the final object assigned matches the state type
          const finalPermissionsForState: Record<string, FilePermission> = nextPermissions;

          return {
            ...prevState,
            allAccess: false, 
            fileIdAccess: finalPermissionsForState as Record<string, FilePermission>, // Explicit cast
          };
        });
  
    } else {
      // Apply non-visibility or combined updates
      setNewGroup(prevState => {
          // Explicitly type prevSpecificPermissions and cast the potentially partial state value
          const prevSpecificPermissions: Record<string, FilePermission> = (prevState.fileIdAccess as Record<string, FilePermission>) || {};
          const currentCompletePerms = prevSpecificPermissions[fileId] || defaultPermValues;
          const mergedUpdate = { ...currentCompletePerms, ...permissionUpdate };
          // Ensure complete object even for single updates, satisfying FilePermission type
          const nextPermission: FilePermission = {
              show: mergedUpdate.show ?? defaultPermValues.show,
              viewAccess: mergedUpdate.viewAccess ?? defaultPermValues.viewAccess,
              downloadAccess: mergedUpdate.downloadAccess ?? defaultPermValues.downloadAccess,
              deleteEditAccess: mergedUpdate.deleteEditAccess ?? defaultPermValues.deleteEditAccess,
              requireAgreement: mergedUpdate.requireAgreement ?? defaultPermValues.requireAgreement,
              viewTags: mergedUpdate.viewTags ?? defaultPermValues.viewTags,
              addTags: mergedUpdate.addTags ?? defaultPermValues.addTags,
              allowUploads: mergedUpdate.allowUploads ?? defaultPermValues.allowUploads,
              moveAccess: mergedUpdate.moveAccess ?? defaultPermValues.moveAccess,
              renameAccess: mergedUpdate.renameAccess ?? defaultPermValues.renameAccess,
              watermarkContent: mergedUpdate.watermarkContent ?? defaultPermValues.watermarkContent,
              viewComments: mergedUpdate.viewComments ?? defaultPermValues.viewComments,
              addComments: mergedUpdate.addComments ?? defaultPermValues.addComments,
              canQuery: mergedUpdate.canQuery ?? defaultPermValues.canQuery,
              isVisible: mergedUpdate.isVisible ?? defaultPermValues.isVisible,
           };
         
          // Construct the final object for the state update with explicit typing
          const finalSpecificPermissionsForState: Record<string, FilePermission> = {
            ...prevSpecificPermissions,
            [fileId]: nextPermission,
          };

          return {
              ...prevState,
              allAccess: false, 
              fileIdAccess: finalSpecificPermissionsForState as Record<string, FilePermission>, // Explicit cast
          };
      });
    }
  };
  // --- End Enhanced handleFilePermissionChange ---

  useEffect(() => {
    if (bucketUuid) {
      loadUsers();
      loadPermissionLevel();
    }
  }, [bucketUuid]);

  // Add state for the selected file/folder
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Add state for showing specific file permissions
  const [showSpecificPermissions, setShowSpecificPermissions] = useState(false);

  // Combine default roles and custom groups for display
  // Use the globally defined DEFAULT_ROLES constant
  const allGroupsToDisplay: PermissionGroup[] = [
    // Map default roles, providing a unique ID and ensuring type compatibility
    ...DEFAULT_ROLES.map((role): PermissionGroup => ({
      ...role,
      id: `default-${role.name.toLowerCase()}`,
      // Ensure properties match PermissionGroup structure if needed (though Omit handles this)
    })),
    ...permissionGroups // Append custom groups fetched or created
  ];

  // Add a function to handle opening the view details dialog
  const handleViewGroupDetails = (group: PermissionGroup) => {
    setViewGroupDetails({
      isOpen: true,
      group: group
    });
  };

  const handleOpenDialog = () => {
    // Reset specific permissions and selection when opening dialog
    setNewGroup(prev => ({ ...prev, fileIdAccess: {} }));
    setIsCreateGroupDialogOpen(true);
  };

  // Add the handleRemoveUser function
  const handleRemoveUser = async (user: User): Promise<void> => {
    try {
      await removeUser(bucketUuid, user.email);
      toast({
        title: "Success",
        description: `${user.name} has been removed from the dataroom.`,
      });
      // Refresh the user list
      loadUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add state for delete dialog
  const [groupToDelete, setGroupToDelete] = useState<PermissionGroup | null>(null);
  
  // Add state for edit group
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);

  // Function to handle editing a permission group
  const handleEditGroup = (group: PermissionGroup) => {
    setEditingGroup(group);
    // Copy the group properties to newGroup
    setNewGroupName(group.name);
    setNewGroup(group);
    setIsEditGroupDialogOpen(true);
  };

  // Function to save edited group
  const handleUpdatePermissionGroup = async () => {
    if (!editingGroup || !newGroupName.trim() || !bucketUuid) return;
    
    setIsCreatingGroup(true); // Reuse the loading state
    try {
      await updatePermissionGroup(bucketUuid, editingGroup.id, newGroupName, newGroup);
      
      toast({
        title: "Success",
        description: `Permission group "${newGroupName}" updated successfully.`
      });
      
      // Reset state and close dialog
      setIsEditGroupDialogOpen(false);
      setEditingGroup(null);
      setNewGroupName('');
      setNewGroup({} as PermissionGroup); // Reset newGroup
      
      // Refresh the permission groups list
      await loadPermissionGroups();
    } catch (error) {
      console.error("Error updating permission group:", error);
      toast({
        title: "Error",
        description: "Failed to update permission group.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Function to handle deleting a permission group
  const handleDeleteGroup = async (groupId: string) => {
    if (!bucketUuid) return;
    
    try {
      await deletePermissionGroup(bucketUuid, groupId);
      
      toast({
        title: "Success",
        description: "Permission group deleted successfully."
      });
      
      // Refresh the permission groups list
      await loadPermissionGroups();
    } catch (error) {
      console.error("Error deleting permission group:", error);
      // Re-throw to be caught by the dialog component
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to delete permission group');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto px-4 py-6 flex flex-col w-full dark:bg-darkbg">
        <div className="flex justify-between items-center mb-6">
          {/* Header skeleton */}
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {/* Current user skeleton with blue tint */}
          <div className="bg-blue-50/50 dark:bg-slate-800 p-6 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-blue-200/50 dark:bg-blue-900/30 h-10 w-10 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-blue-200/50 dark:bg-blue-900/30 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-blue-200/50 dark:bg-blue-900/30 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-blue-200/50 dark:bg-blue-900/30 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-[140px] bg-blue-200/50 dark:bg-blue-900/30 rounded animate-pulse" />
            </div>
          </div>

          {/* Other users skeletons */}
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <>
      <div className="mx-auto px-4 py-6 flex flex-col w-full dark:bg-darkbg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-6">
            <TabsList className="dark:bg-slate-800">
              <TabsTrigger value="users" className="data-[state=active]:dark:bg-slate-700">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              {permissionDetails?.canViewPermissionGroupDetails && (
              <TabsTrigger value="permissionGroups" className="data-[state=active]:dark:bg-slate-700">
                <Settings className="h-4 w-4 mr-2" />
                Permission Groups
              </TabsTrigger>
              )}
            </TabsList>
            
            <div className="flex items-center gap-2">
            {activeTab === 'users' ? (
                <div className="flex items-center gap-2">
                  {!permissionDetails?.canInviteUsers?.includes('*') ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
          <Button
            onClick={() => setIsInviteDialogOpen(true)}
            className="flex items-center gap-2 text-white"
                              disabled
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Adding users is disabled
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button
                      onClick={() => setIsInviteDialogOpen(true)}
                      className="flex items-center gap-2 text-white"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add User
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {!permissionDetails?.canCreatePermissionGroups ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button
                              onClick={handleOpenDialog}
                              className="flex items-center gap-2 text-white"
                              disabled
                            >
                              <Plus className="h-4 w-4" />
                              Create New Permission Group
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Creating permission groups is disabled
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
              <Button
                onClick={handleOpenDialog}
                className="flex items-center gap-2 text-white"
              >
                <Plus className="h-4 w-4" />
                Create New Permission Group
              </Button>
            )}
                </div>
              )}
            </div>
        </div>
          
          <TabsContent value="users" className="mt-0">
          {isLoading ? (
            // Render a few skeleton cards while loading
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                {/* Current user skeleton with blue tint */}
                <div className="bg-blue-50 dark:bg-slate-800 p-6 border-b dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full bg-blue-200/50 dark:bg-blue-900/30 h-10 w-10 animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-5 w-40 bg-blue-200/50 dark:bg-blue-900/30 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-blue-200/50 dark:bg-blue-900/30 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-blue-200/50 dark:bg-blue-900/30 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-8 w-[140px] bg-blue-200/50 dark:bg-blue-900/30 rounded animate-pulse" />
                  </div>
                </div>

                {/* Other users skeletons */}
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
          ) :
            users.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No users found</div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Current User Section - Always visible */}
                {currentUser && (
                  <div className="bg-blue-50 dark:bg-slate-800 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-grow">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500 flex items-center justify-center">
                            <span className="text-blue-600 font-medium dark:text-white">
                              {currentUser.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {currentUser.name} <span className="text-blue-600 text-sm">(You)</span>
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-300">{currentUser.email}</p>
                            <p className="text-xs text-gray-400 mt-1 dark:text-gray-200">
                              Added: {new Date(currentUser.addedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-6">
                            <RoleSelect user={currentUser} currentUserRole={currentUser.role as Role} onRoleChange={handleRoleChange} currentUserEmail={currentUser.email} availableRoles={availableRoles} />
                      </div>
                    </div>
                  </div>
                )}

                    {/* Other Users Section - Only visible if canViewUsers is true */}
                    {permissionDetails?.canViewUsers && otherUsers.map((user) => (
                      <UserCard 
                        key={user.userId} 
                        user={user} 
                        currentUserRole={currentUser?.role as Role} 
                        currentUserEmail={currentUser?.email || null}
                        onRoleChange={handleRoleChange}
                        onRemoveUser={setUserToRemove}
                        availableRoles={availableRoles}
                      />
                ))}
              </div>
        </div>
              )
            }
          </TabsContent>
          
          {permissionDetails?.canViewPermissionGroupDetails && (
          <TabsContent value="permissionGroups" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allGroupsToDisplay.length > 0 ? (
                // Map over the combined list
                allGroupsToDisplay.map(group => (
                  <Card key={group.id} className="dark:bg-gray-800 dark:text-white">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{group.name}</span>
                        {/* Use the isDefault flag added to the type */}
                        {group.isDefault && (
                          <span className="text-xs font-normal px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            Default Role
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="dark:text-gray-400">
                        {group.allAccess ? 'Full access by default' : 'Custom permissions defined'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm dark:text-gray-300 space-y-1">
                         <p>
                           <span className="font-semibold">Query Dataroom:</span> {group.canQueryEntireDataroom ? 'Yes' : 'No'}
                         </p>
                         <p>
                           <span className="font-semibold">Organize Files:</span> {group.canOrganize ? 'Yes' : 'No'}
                         </p>
                         <p>
                           <span className="font-semibold">View Audit Logs:</span> {group.canViewAuditLogs ? 'Yes' : 'No'}
                         </p>
                         {/* Add a few more key indicators */}
                         <p>
                           <span className="font-semibold">Manage Users:</span> {group.canAccessUserManagementPanel ? 'Yes' : 'No'}
                         </p>
                          <p>
                           <span className="font-semibold">Manage Issues:</span> {group.canAccessIssuesPanel ? 'Yes' : 'No'}
                         </p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 justify-end">
                      {/* Conditionally render buttons only for non-default groups */}
                      {!group.isDefault ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="dark:text-white"
                            onClick={() => handleEditGroup(group)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => setGroupToDelete(group)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                         /* For default roles, show view details button */
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="dark:text-white dark:border-gray-600"
                          onClick={() => handleViewGroupDetails(group)}
                        >
                          View Details
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))
              ) : (
                // No groups defined message
                <div className="col-span-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No permission groups found</p>
                   {(currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN') && (
                     <Button 
                       onClick={() => setIsCreateGroupDialogOpen(true)}
                       className="mx-auto"
                     >
                       <Plus className="h-4 w-4 mr-2" />
                       Create First Custom Group
                     </Button>
                   )} 
                </div>
              )}
            </div>
          </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Dialog Components */}
      <InviteUserDialog 
        isOpen={isInviteDialogOpen}
        onClose={() => {
          setIsInviteDialogOpen(false);
            setInviteError(null);
        }}
        email={inviteEmail}
        onEmailChange={(value) => setInviteEmail(value)}
        role={inviteRole}
        onRoleChange={setInviteRole}
        onInvite={handleInviteUser}
        isInviting={isInviting}
        error={inviteError}
      />

      <RemoveUserDialog 
        isOpen={!!userToRemove}
        user={userToRemove}
        onClose={() => setUserToRemove(null)}
        onConfirm={handleRemoveUser}
      />

      <TransferOwnershipDialogComponent 
        isOpen={ownerTransfer.isOpen}
        targetUser={ownerTransfer.targetUser}
        onClose={() => setOwnerTransfer({ isOpen: false, targetUser: null })}
        onConfirm={handleOwnershipTransfer}
      />

      <PermissionGroupDialog 
        isOpen={isCreateGroupDialogOpen}
        onClose={() => setIsCreateGroupDialogOpen(false)}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        onCreateGroup={handleCreatePermissionGroup}
        isCreatingGroup={isCreatingGroup}
        folderStructure={folderStructure}
        dialogItemsMap={dialogItemsMap}
        dialogParentMap={dialogParentMap}
        onFilePermissionChange={handleFilePermissionChange}
        handleAllAccessChange={handleAllAccessChange}
        availablePermissionGroups={availableRoles}
      />

      {/* Edit Group Dialog - reuse the same PermissionGroupDialog but with different props */}
      <PermissionGroupDialog 
        isOpen={isEditGroupDialogOpen}
        onClose={() => setIsEditGroupDialogOpen(false)}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        onCreateGroup={handleUpdatePermissionGroup}
        isCreatingGroup={isCreatingGroup}
        folderStructure={folderStructure}
        dialogItemsMap={dialogItemsMap}
        dialogParentMap={dialogParentMap}
        onFilePermissionChange={handleFilePermissionChange}
        handleAllAccessChange={handleAllAccessChange}
        availablePermissionGroups={availableRoles}
      />

      <ViewGroupDetailsDialog 
        isOpen={viewGroupDetails.isOpen}
        group={viewGroupDetails.group}
        onClose={() => setViewGroupDetails({ isOpen: false, group: null })}
      />

      <DeletePermissionGroupDialog
        isOpen={groupToDelete !== null}
        group={groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onConfirm={handleDeleteGroup}
      />
    </>
  );
};

export default UserManagement;