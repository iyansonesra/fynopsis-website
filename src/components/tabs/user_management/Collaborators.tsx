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
import type { FilePermission, FileTreeItem as FileTreeItemType, User, UserManagementProps, TransferOwnershipDialog, PermissionGroup, Role } from './CollaboratorsTypes';
import { DEFAULT_ROLES } from './CollaboratorsTypes';
import { FolderPermissionTree, ItemPermissionsPanel } from './PermissionFolderTree';

// Import service functions
import { 
  fetchUsers, 
  fetchPermissionLevel, 
  fetchPermissionGroups,
  changeUserPermission,
  transferOwnership,
  removeUser,
  inviteUser,
  createPermissionGroup
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

const UserManagement: React.FC<UserManagementProps> = ({ dataroomId }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUsers, setOtherUsers] = useState<User[]>([]);
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
  const [newGroup, setNewGroup] = useState<PermissionGroup>({
    id: '',
    name: '',
    allAccess: false,
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
        watermarkContent: false,
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
  });
  const [activeTab, setActiveTab] = useState('users');
  
  // Add view details dialog state
  const [viewGroupDetails, setViewGroupDetails] = useState<{isOpen: boolean, group: PermissionGroup | null}>({
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
  const handleRoleChange = (userEmail: string, newRole: string) => {
    if (newRole === 'OWNER' && currentUser?.role === 'OWNER') {
      setOwnerTransfer({
        isOpen: true,
        targetUser: users.find(u => u.email === userEmail) || null
      });
    } else {
      handleChangePermission(userEmail, newRole);
    }
  };

  // Use the service to handle permission changes
  const handleChangePermission = async (userEmail: string, newRole: string) => {
    try {
      await changeUserPermission(bucketUuid, userEmail, newRole);
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
      const fetchedUsers = await fetchUsers(bucketUuid);
      setUsers(fetchedUsers);
      
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
      setUsers([]);
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
      setNewGroup({
        id: '', name: '', allAccess: false, canQuery: true, canOrganize: false,
        canViewAuditLogs: false, canInviteUsers: [], canUpdateUserPermissions: [],
        canCreatePermissionGroups: false, canDeleteDataroom: false, canUseQA: true,
        canReadAnswerQuestions: true,
        defaultFilePerms: {
          viewAccess: true, watermarkContent: false, deleteEditAccess: false, 
          viewComments: true, addComments: false, downloadAccess: false, 
          viewTags: true, canQuery: true, isVisible: true
        },
        defaultFolderPerms: {
          allowUploads: false, createFolders: false, addComments: false, 
          viewComments: true, viewContents: true, viewTags: true, 
          canQuery: true, isVisible: true,
          inheritFileAccess: {
            viewAccess: true, watermarkContent: false, deleteEditAccess: false, 
            viewComments: true, addComments: false, downloadAccess: false, 
            viewTags: true, canQuery: true, isVisible: true
          },
          inheritFolderAccess: {
            allowUploads: false, createFolders: false, addComments: false, 
            viewComments: true, viewContents: true, viewTags: true, 
            canQuery: true, isVisible: true
          }
        },
        folderIdAccess: {},
        fileIdAccess: {}
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
        deleteEditAccess: false,
        requireAgreement: false,
        viewTags: true,
        allowUploads: false,
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
          const prevPermissions = prevState.fileIdAccess || {};
          const updates: Record<string, Partial<FilePermission>> = {}; // Store all partial updates needed
  
          // Helper: Get descendants
          const getAllDescendantIds = (itemId: string): string[] => {
            const result: string[] = [];
            const queue: string[] = [...(dialogChildrenMap[itemId] || [])];
            while (queue.length > 0) {
              const currentId = queue.shift()!;
              if(currentId) {
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
            const mergedUpdate = { ...currentCompletePerms, ...partialUpdate }; 
            nextPermissions[id] = {
                show: mergedUpdate.show,
                viewAccess: mergedUpdate.viewAccess ?? defaultPermValues.viewAccess,
                downloadAccess: mergedUpdate.downloadAccess ?? defaultPermValues.downloadAccess,
                deleteEditAccess: mergedUpdate.deleteEditAccess ?? defaultPermValues.deleteEditAccess,
                requireAgreement: mergedUpdate.requireAgreement ?? defaultPermValues.requireAgreement,
                viewTags: mergedUpdate.viewTags ?? defaultPermValues.viewTags,
                allowUploads: mergedUpdate.allowUploads ?? defaultPermValues.allowUploads,
            };
          });
  
          console.log("Final updates being applied:", updates);
          console.log("Resulting permissions state:", nextPermissions);
  
          return {
            ...prevState,
            allAccess: false, 
            fileIdAccess: nextPermissions,
          };
        });
  
    } else {
      // Apply non-visibility or combined updates
      setNewGroup(prevState => {
          const prevSpecificPermissions = prevState.fileIdAccess || {};
          const currentCompletePerms = prevSpecificPermissions[fileId] || defaultPermValues;
          const mergedUpdate = { ...currentCompletePerms, ...permissionUpdate };
          // Ensure complete object even for single updates
          const nextPermission = {
              show: mergedUpdate.show,
              viewAccess: mergedUpdate.viewAccess ?? defaultPermValues.viewAccess,
              downloadAccess: mergedUpdate.downloadAccess ?? defaultPermValues.downloadAccess,
              deleteEditAccess: mergedUpdate.deleteEditAccess ?? defaultPermValues.deleteEditAccess,
              requireAgreement: mergedUpdate.requireAgreement ?? defaultPermValues.requireAgreement,
              viewTags: mergedUpdate.viewTags ?? defaultPermValues.viewTags,
              allowUploads: mergedUpdate.allowUploads ?? defaultPermValues.allowUploads,
           };
         
          return {
              ...prevState,
              allAccess: false, 
              fileIdAccess: {
                  ...prevSpecificPermissions,
                  [fileId]: nextPermission,
              },
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
              <TabsTrigger value="permissionGroups" className="data-[state=active]:dark:bg-slate-700">
                <Settings className="h-4 w-4 mr-2" />
                Permission Groups
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'users' ? (
              <Button
                onClick={() => setIsInviteDialogOpen(true)}
                className="flex items-center gap-2 text-white"
              >
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
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
          
          <TabsContent value="users" className="mt-0">
            {isLoading ? (
              // Render a few skeleton cards while loading
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
            ) :
              users.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No users found</div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {/* Current User Section */}
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
                            <RoleSelect user={currentUser} currentUserRole={currentUser.role as Role} onRoleChange={handleRoleChange} currentUserEmail={currentUser.email} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Other Users Section */}
                    {otherUsers.map((user) => (
                      <UserCard 
                        key={user.userId} 
                        user={user} 
                        currentUserRole={currentUser?.role as Role} 
                        currentUserEmail={currentUser?.email || null}
                        onRoleChange={handleRoleChange}
                        onRemoveUser={setUserToRemove}
                      />
                    ))}
                  </div>
                </div>
              )
            }
          </TabsContent>
          
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
                      <div className="text-sm dark:text-gray-300">
                         <p className="mb-1">
                           <span className="font-semibold">AI Query:</span> {group.canQuery ? 'Yes' : 'No'}
                         </p>
                         <p className="mb-1">
                           <span className="font-semibold">Organize Files:</span> {group.canOrganize ? 'Yes' : 'No'}
                         </p>
                         <p>
                           <span className="font-semibold">View Audit Logs:</span> {group.canViewAuditLogs ? 'Yes' : 'No'}
                         </p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      {/* Conditionally render buttons only for non-default groups */}
                      {!group.isDefault ? (
                        <>
                          <Button variant="outline" size="sm" className="dark:text-white">
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm">
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
        setNewGroupName={(value) => setNewGroupName(value)}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        folderStructure={folderStructure}
        dialogItemsMap={dialogItemsMap}
        dialogParentMap={dialogParentMap}
        onFilePermissionChange={handleFilePermissionChange}
        isCreatingGroup={isCreatingGroup}
        onCreateGroup={handleCreatePermissionGroup}
      />

      <ViewGroupDetailsDialog 
        isOpen={viewGroupDetails.isOpen}
        group={viewGroupDetails.group}
        onClose={() => setViewGroupDetails({isOpen: false, group: null})}
      />
    </>
  );
};

export default UserManagement;