import React, { useEffect, useState } from 'react';
import { get, post } from '@aws-amplify/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { usePathname } from 'next/navigation';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Trash2, UserPlus, Users, Plus, Settings, ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Update the User type to include invitation status
type User = {
  userId: string;
  email: string;
  name: string;
  role: string;
  addedAt: string;
  isInvited?: boolean;
  invitedRole?: string; // The role they will have after accepting
};

type TransferOwnershipDialog = {
  isOpen: boolean;
  targetUser: User | null;
};

interface UserManagementProps {
  dataroomId: string;
}

type Role = 'READ' | 'WRITE' | 'ADMIN' | 'OWNER';

// File/Folder type for tree structure
type FileTreeItem = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeItem[];
  parentId?: string;
};

// File/Folder permission type
type FilePermission = {
  show: boolean;
  viewAccess: boolean;
  downloadAccess: boolean;
  deleteEditAccess: boolean;
  requireAgreement: boolean;
  viewTags: boolean;
};

// Permission Group Type
type PermissionGroup = {
  id: string;
  name: string;
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
  };
  defaultFolderPerms: {
    allowUploads: boolean;
    viewComments: boolean;
    addComments: boolean;
    viewContents: boolean;
    viewTags: boolean;
  };
  fileSpecificPermissions?: Record<string, FilePermission>;
};

// Create helper function to format role display names at the top of the file
// Add this after the type definitions
const formatRoleDisplay = (role: string): string => {
  if (role === 'READ') return 'Viewer';
  if (role === 'WRITE') return 'Editor';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

// Add this component at the top (or where appropriate)
const SkeletonCard: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
      <div className="flex items-center space-x-4">
        {/* Avatar skeleton */}
        <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10 animate-pulse" />

        {/* Text content skeleton */}
        <div className="space-y-2">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Right side actions skeleton */}
      <div className="flex items-center space-x-3">
        <div className="h-8 w-[140px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

// Update FolderPermissionTree component to have a selection mechanism
const FolderPermissionTree = ({ 
  folderStructure, 
  selectedPermissions, 
  onPermissionChange,
  selectedItem,
  onSelectItem
}: { 
  folderStructure: FileTreeItem[]; 
  selectedPermissions: Record<string, FilePermission>;
  onPermissionChange: (id: string, permissions: FilePermission) => void;
  selectedItem: string | null;
  onSelectItem: (id: string) => void;
}) => {
  return (
    <div className="border rounded-md dark:border-gray-700 h-full">
      <div className="p-3 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 font-medium">
        <span>Files & Folders</span>
      </div>
      <div className="p-2 overflow-y-auto" style={{ height: '450px' }}>
        {folderStructure.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Loading file structure...
          </div>
        ) : (
          folderStructure.map((item) => (
            <FileTreeItem 
              key={item.id}
              item={item} 
              level={0}
              selectedPermissions={selectedPermissions}
              onPermissionChange={onPermissionChange}
              selectedItem={selectedItem}
              onSelectItem={onSelectItem}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Update FileTreeItem to support selection
const FileTreeItem = ({ 
  item, 
  level, 
  selectedPermissions, 
  onPermissionChange,
  selectedItem,
  onSelectItem
}: { 
  item: FileTreeItem; 
  level: number;
  selectedPermissions: Record<string, FilePermission>;
  onPermissionChange: (id: string, permissions: FilePermission) => void;
  selectedItem: string | null;
  onSelectItem: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const itemPermissions = selectedPermissions[item.id] || {
    show: true,
    viewAccess: true,
    downloadAccess: false,
    deleteEditAccess: false,
    requireAgreement: false,
    viewTags: true
  };
  
  const isSelected = selectedItem === item.id;
  
  return (
    <div className="mb-2">
      <div 
        className={`flex items-center mb-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''} ${expanded ? 'font-medium' : ''}`}
        onClick={() => onSelectItem(item.id)}
      >
        <div style={{ width: `${level * 12}px` }} />
        {item.children?.length ? (
          <button 
            className="mr-1 w-5 h-5 flex items-center justify-center text-gray-500"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            type="button"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="mr-1 w-5 h-5"></div>
        )}
        
        <div className="w-6 h-6 mr-2 text-gray-500">
          {item.type === 'folder' ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />}
        </div>
        
        <div className="flex-1 text-sm">{item.name}</div>
        
        <div className="flex items-center">
          <Checkbox 
            id={`${item.id}-show`}
            checked={itemPermissions.show}
            onCheckedChange={(checked) => {
              onPermissionChange(item.id, { ...itemPermissions, show: checked as boolean });
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      
      {expanded && item.children && item.children.length > 0 && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              selectedPermissions={selectedPermissions}
              onPermissionChange={onPermissionChange}
              selectedItem={selectedItem}
              onSelectItem={onSelectItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Update the ItemPermissionsPanel component to disable and deselect other permissions when visibility is off
const ItemPermissionsPanel: React.FC<{
  selectedItemId: string | null;
  items: any[];
  permissions: Record<string, any>;
  onPermissionChange: (id: string, permissions: any) => void;
}> = ({ selectedItemId, items, permissions, onPermissionChange }) => {
  if (!selectedItemId) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Select a file or folder to view and edit its permissions
        </p>
      </div>
    );
  }

  const itemPermissions = permissions[selectedItemId] || {};
  const selectedItem = items.find((item: any) => item.id === selectedItemId) || 
                      items.flatMap((item: any) => item.children || []).find((child: any) => child.id === selectedItemId);
  const isFolder = selectedItem?.type === 'folder';

  // Safe handler that ensures we have a valid ID
  const handlePermissionChange = (id: string | null, newPermissions: any) => {
    if (id) {
      // If visibility is being turned off, deselect all other permissions too
      if (newPermissions.hasOwnProperty('show') && newPermissions.show === false) {
        onPermissionChange(id, {
          ...newPermissions,
          viewAccess: false,
          downloadAccess: false,
          deleteEditAccess: false,
          requireAgreement: false,
          viewTags: false,
          // For folders
          allowUploads: false,
          viewComments: false,
          addComments: false,
          viewContents: false
        });
      } else {
        onPermissionChange(id, newPermissions);
      }
    }
  };
  
  // Determine if the item is visible
  const isVisible = itemPermissions.show !== false; // Default to true if not explicitly set to false

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
      <h3 className="font-medium text-sm mb-3 dark:text-white">
        {selectedItem?.name || 'Item'} Permissions
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Visibility</h4>
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox 
              id={`${selectedItemId}-show`}
              checked={isVisible}
              onCheckedChange={(checked) => 
                handlePermissionChange(selectedItemId, { ...itemPermissions, show: checked as boolean })}
            />
            <label htmlFor={`${selectedItemId}-show`} className="text-sm">
              Visible to group members
            </label>
          </div>
        </div>
        
        <div>
          <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Access Permissions</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`${selectedItemId}-view`}
                checked={isVisible && itemPermissions.viewAccess}
                onCheckedChange={(checked) => 
                  handlePermissionChange(selectedItemId, { ...itemPermissions, viewAccess: checked as boolean })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-view`} className={`text-sm ${!isVisible ? 'text-gray-400' : ''}`}>
                View content
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`${selectedItemId}-download`}
                checked={isVisible && itemPermissions.downloadAccess}
                onCheckedChange={(checked) => 
                  handlePermissionChange(selectedItemId, { ...itemPermissions, downloadAccess: checked as boolean })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-download`} className={`text-sm ${!isVisible ? 'text-gray-400' : ''}`}>
                Download
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`${selectedItemId}-edit`}
                checked={isVisible && itemPermissions.deleteEditAccess}
                onCheckedChange={(checked) => 
                  handlePermissionChange(selectedItemId, { ...itemPermissions, deleteEditAccess: checked as boolean })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-edit`} className={`text-sm ${!isVisible ? 'text-gray-400' : ''}`}>
                Edit/Delete
              </label>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Special Settings</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`${selectedItemId}-watermark`}
                checked={isVisible && (!itemPermissions.viewAccess || (itemPermissions.requireAgreement || false))}
                onCheckedChange={(checked) => 
                  handlePermissionChange(selectedItemId, { ...itemPermissions, requireAgreement: checked as boolean })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-watermark`} className={`text-sm ${!isVisible ? 'text-gray-400' : ''}`}>
                Require NDA/agreement to view
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={`${selectedItemId}-viewtags`}
                checked={isVisible && itemPermissions.viewTags}
                onCheckedChange={(checked) => 
                  handlePermissionChange(selectedItemId, { ...itemPermissions, viewTags: checked as boolean })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-viewtags`} className={`text-sm ${!isVisible ? 'text-gray-400' : ''}`}>
                View tags
              </label>
            </div>
            
            {isFolder && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`${selectedItemId}-uploads`}
                  checked={isVisible && itemPermissions.deleteEditAccess}
                  onCheckedChange={(checked) => 
                    handlePermissionChange(selectedItemId, { ...itemPermissions, deleteEditAccess: checked as boolean })}
                  disabled={!isVisible}
                />
                <label htmlFor={`${selectedItemId}-uploads`} className={`text-sm ${!isVisible ? 'text-gray-400' : ''}`}>
                  Allow uploads to this folder
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const UserManagement: React.FC<UserManagementProps> = () => {
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
      viewTags: true
    },
    defaultFolderPerms: {
      allowUploads: false,
      viewComments: true,
      addComments: false,
      viewContents: true,
      viewTags: true
    },
    fileSpecificPermissions: {}
  });
  const [activeTab, setActiveTab] = useState('users');
  
  // Sample folder structure - this would come from an API in production
  const [folderStructure, setFolderStructure] = useState<FileTreeItem[]>([
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

  const handleRoleChange = (userEmail: string, newRole: string) => {
    if (newRole === 'OWNER' && currentUser?.role === 'OWNER') {
      setOwnerTransfer({
        isOpen: true,
        targetUser: users.find(u => u.email === userEmail) || null
      });
    } else {
      changeUserPermission(userEmail, newRole);
    }
  };

  const handleOwnershipTransfer = async () => {
    if (!ownerTransfer.targetUser) return;

    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/transfer-ownership`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            newOwnerEmail: ownerTransfer.targetUser.email
          },
          withCredentials: true
        },
      });

      await restOperation.response;
      setOwnerTransfer({ isOpen: false, targetUser: null });
      await fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('Error transferring ownership:', error);
    }
  };

  const RoleSelect = ({ user, currentUserRole }: { user: User; currentUserRole: Role }) => {
    const isCurrentUser = user.userId === currentUser?.userId;
    const canModify = canModifyUserRole(currentUserRole, user.role as Role, isCurrentUser);

    if (!canModify) {
      return <div className="text-gray-600 font-medium dark:text-white text-sm">
        {formatRoleDisplay(user.role)}
      </div>;
    }

    return (
      <Select
        value={user.role}
        onValueChange={(newValue) => handleRoleChange(user.email, newValue)}
      >
        <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800 dark:text-white dark:border-gray-700 select-none outline-none">
          <SelectValue placeholder="Select permission" />
        </SelectTrigger>
        <SelectContent className='dark:text-white dark:bg-slate-800'>
          <SelectItem value="READ" className='dark:text-white text-sm'>Viewer</SelectItem>
          <SelectItem value="WRITE" className='dark:text-white text-sm'>Editor</SelectItem>
          <SelectItem value="ADMIN" className='dark:text-white text-sm'>Admin</SelectItem>
          {currentUserRole === 'OWNER' && !isCurrentUser && (
            <SelectItem value="OWNER" className='dark:text-white text-sm'>Owner</SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  };

  const handleRemoveUser = async (user: User) => {
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/remove-user`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            userEmail: user.email
          },
          withCredentials: true
        },
      });

      await restOperation.response;
      setUserToRemove(null);
      await fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

  const UserCard = ({ user, currentUserRole }: { user: User; currentUserRole: Role }) => (
    <div className={`flex items-center justify-between p-6 transition-colors dark:bg-slate-700 
      ${user.isInvited
        ? 'bg-yellow-50 dark:bg-slate-800/50 border-l-4 border-yellow-400'
        : 'hover:bg-gray-50'}`}
    >
      <div className="flex-grow">
        <div className="flex items-center space-x-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center
            ${user.isInvited
              ? 'bg-yellow-100 dark:bg-yellow-900'
              : 'bg-gray-100 dark:bg-blue-400'}`}
          >
            <span className={`font-medium 
              ${user.isInvited
                ? 'text-yellow-800 dark:text-yellow-200'
                : 'text-gray-600 dark:text-white'}`}
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
              {user.isInvited && (
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                  Pending Invite
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-300">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1 dark:text-gray-200">
              {user.isInvited ? 'Invited' : 'Added'}: {new Date(user.addedAt).toLocaleDateString()}
            </p>
            {user.isInvited && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Will join as: {user.invitedRole?.toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {canRemoveUser(currentUserRole, user.role as Role) && user.email !== currentUser?.email && (
          <button
            onClick={() => setUserToRemove(user)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <RoleSelect user={user} currentUserRole={currentUserRole} />
      </div>
    </div>
  );

  const fetchPermissionLevel = async () => {

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
      const permissions = {
        role: response.role,
        sharedBy: response.sharedBy,
        addedAt: response.addedAt
      };
      setUsers(response);
     
    } catch (error) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      // setIsLoading(false);
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

  // Update the fetch users function to transform the data
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

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

      // Transform the users data to include invitation status
      const transformedUsers = response.users.map((user: any) => ({
        ...user,
        isInvited: user.role === 'INVITED',
        invitedRole: user.invitedRole || user.role,
        role: user.role === 'INVITED' ? user.invitedRole : user.role
      }));

      setUsers(transformedUsers);
      if(response && transformedUsers.length > 0) {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    } catch (error) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
    }
  };

  const changeUserPermission = async (userEmail: string, newPermissionLevel: string) => {
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
      const response = JSON.parse(responseText);

      await fetchUsers();

    } catch (error) {
      console.error('Error changing user permissions:', error);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || isInviting) return;
    setIsInviting(true);
    setInviteError(null);
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/invite-user`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            userEmail: inviteEmail.trim(),
            permissionLevel: inviteRole
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
      
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('READ');
      await fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error inviting user:', error);
      setInviteError(error instanceof Error ? error.message : 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCreatePermissionGroup = () => {
    // For now, just add to local state
    const newGroupWithId = {
      ...newGroup,
      id: `group_${Date.now()}`,
      name: newGroupName
    };
    
    setPermissionGroups([...permissionGroups, newGroupWithId]);
    setIsCreateGroupDialogOpen(false);
    setNewGroupName('');
    setNewGroup({
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
        viewTags: true
      },
      defaultFolderPerms: {
        allowUploads: false,
        viewComments: true,
        addComments: false,
        viewContents: true,
        viewTags: true
      },
      fileSpecificPermissions: {}
    });
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
  
  const handleFilePermissionChange = (fileId: string, permissions: FilePermission) => {
    setNewGroup({
      ...newGroup,
      // Turn off all access when specific file permissions are set
      allAccess: false,
      fileSpecificPermissions: {
        ...(newGroup.fileSpecificPermissions || {}),
        [fileId]: permissions
      }
    });
  };

  useEffect(() => {
    if (bucketUuid) {
      fetchUsers();
      fetchPermissionLevel();
    }
  }, [bucketUuid]);

  // Add state for the selected file/folder
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Add state for showing specific file permissions
  const [showSpecificPermissions, setShowSpecificPermissions] = useState(false);

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
                onClick={() => setIsCreateGroupDialogOpen(true)}
                className="flex items-center gap-2 text-white"
              >
                <Plus className="h-4 w-4" />
                Create Permission Group
              </Button>
            )}
          </div>
          
          <TabsContent value="users" className="mt-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {isLoading ? (
                // Render a few skeleton cards while loading
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
              ) :
                users.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No users found</div>
                ) : (
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
                            <RoleSelect user={currentUser} currentUserRole={currentUser.role as Role} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Other Users Section */}
                    {otherUsers.map((user) => (
                      <UserCard key={user.userId} user={user} currentUserRole={currentUser?.role as Role} />
                    ))}
                  </div>
                )}
            </div>
          </TabsContent>
          
          <TabsContent value="permissionGroups" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissionGroups.length > 0 ? (
                permissionGroups.map(group => (
                  <Card key={group.id} className="dark:bg-gray-800 dark:text-white">
                    <CardHeader>
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription className="dark:text-gray-400">
                        {group.allAccess ? 'Full access' : 'Custom permissions'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm dark:text-gray-300">
                        <p>
                          <span className="font-semibold">Access type:</span> {group.allAccess ? 'Full access' : 'Limited access'}
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold">Key permissions:</span>
                        </p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          {group.canOrganize && <li>Organize files</li>}
                          {group.canViewAuditLogs && <li>View audit logs</li>}
                          {group.canInviteUsers.length > 0 && <li>Invite users</li>}
                          {group.canUseQA && <li>Use Q&A</li>}
                        </ul>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button variant="outline" size="sm" className="dark:text-white">Edit</Button>
                      <Button variant="destructive" size="sm">Delete</Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No permission groups defined yet</p>
                  <Button 
                    onClick={() => setIsCreateGroupDialogOpen(true)}
                    className="mx-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Permission Group
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add invite user dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
        if (!isInviting) {
          setIsInviteDialogOpen(open);
          if (!open) {
            setInviteError(null);
          }
        }
      }}>
        <DialogContent className="sm:max-w-[425px] dark:bg-darkbg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold dark:text-white">Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="dark:bg-slate-800 dark:text-white dark:border-gray-700"
                disabled={isInviting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">Permission Level</label>
              <Select
                value={inviteRole}
                onValueChange={(value: 'READ' | 'WRITE' | 'ADMIN') => setInviteRole(value)}
                disabled={isInviting}
              >
                <SelectTrigger className="w-full dark:bg-slate-800 dark:text-white dark:border-gray-700">
                  <SelectValue placeholder="Select permission level" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="READ" className="dark:text-white">Viewer</SelectItem>
                  <SelectItem value="WRITE" className="dark:text-white">Editor</SelectItem>
                  <SelectItem value="ADMIN" className="dark:text-white">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteError && (
              <div className="text-red-500 text-sm mt-2">
                {inviteError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
              disabled={isInviting}
              className="dark:bg-transparent dark:text-white dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={!inviteEmail.trim() || isInviting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isInviting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Inviting...
                </span>
              ) : (
                'Invite User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add remove user confirmation dialog */}
      <Dialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to remove {userToRemove?.name} ({userToRemove?.email}) from this dataroom?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToRemove && handleRemoveUser(userToRemove)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add owner transfer confirmation dialog */}
      <Dialog open={ownerTransfer.isOpen} onOpenChange={(open) => !open && setOwnerTransfer({ isOpen: false, targetUser: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to transfer ownership to {ownerTransfer.targetUser?.name} ({ownerTransfer.targetUser?.email})?
            </p>
            <p className="text-yellow-600 dark:text-yellow-400">
              ⚠️ You will lose owner privileges and become an Admin instead.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone unless the new owner transfers ownership back to you.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOwnerTransfer({ isOpen: false, targetUser: null })}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleOwnershipTransfer}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Permission Group Dialog */}
      <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
        <DialogContent className="max-w-5xl dark:bg-darkbg overflow-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold dark:text-white">Create Permission Group</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-6">
              <label className="text-sm font-medium dark:text-gray-200 mb-2 block">Group Name</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="E.g., External Auditors"
                className="dark:bg-slate-800 dark:text-white dark:border-gray-700"
              />
            </div>
            
            <div className="mb-6">
              <div className="flex flex-col space-y-4">
                <div>
                  <h3 className="text-sm font-medium dark:text-gray-200 mb-2">Permission Mode</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant={!showSpecificPermissions ? "default" : "outline"}
                        onClick={() => {
                          setShowSpecificPermissions(false);
                          // Don't automatically set allAccess to true
                        }}
                        className={`w-full ${!showSpecificPermissions ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                      >
                        General Permissions
                      </Button>
                    </div>
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant={showSpecificPermissions ? "default" : "outline"}
                        onClick={() => {
                          setShowSpecificPermissions(true);
                          // Only set allAccess to false if it's currently true
                          if (newGroup.allAccess) {
                            handleAllAccessChange(false);
                          }
                        }}
                        className={`w-full ${showSpecificPermissions ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                      >
                        Specific Permissions
                      </Button>
                    </div>
                  </div>
                </div>
                
                {!showSpecificPermissions && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    General permissions makes all the files visible in the dataroombut may require specific settings for viewing content or downloading
                  </p>
                )}
                {showSpecificPermissions && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configure granular permissions for specific files and folders
                  </p>
                )}
              </div>
            </div>
            
            {/* File Permissions Section - Only show when specific permissions are not enabled */}
            {!showSpecificPermissions && (
              <Accordion type="single" collapsible defaultValue="file-permissions" className="w-full mb-6">
                <AccordionItem value="file-permissions" className="border-b dark:border-gray-700">
                  <AccordionTrigger className="dark:text-white py-4">
                    File Permissions
                  </AccordionTrigger>
                  <AccordionContent className="dark:text-gray-300 space-y-4 px-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="file-view-access" 
                          checked={newGroup.defaultFilePerms.viewAccess}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                viewAccess: checked as boolean
                              }
                            })}
                          disabled={false}
                        />
                        <label htmlFor="file-view-access" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          View files
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="file-download" 
                          checked={newGroup.defaultFilePerms.downloadAccess}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                downloadAccess: checked as boolean
                              }
                            })}
                          disabled={false}
                        />
                        <label htmlFor="file-download" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Download files
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="file-watermark" 
                          checked={newGroup.defaultFilePerms.watermarkContent}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                watermarkContent: checked as boolean
                              }
                            })}
                          disabled={false}
                        />
                        <label htmlFor="file-watermark" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Apply watermark to content
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="file-delete-edit" 
                          checked={newGroup.defaultFilePerms.deleteEditAccess}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                deleteEditAccess: checked as boolean
                              }
                            })}
                          disabled={false}
                        />
                        <label htmlFor="file-delete-edit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Delete/edit files
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="file-view-comments" 
                          checked={newGroup.defaultFilePerms.viewComments}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                viewComments: checked as boolean
                              }
                            })}
                          disabled={false}
                        />
                        <label htmlFor="file-view-comments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          View comments
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="file-add-comments" 
                          checked={newGroup.defaultFilePerms.addComments}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                addComments: checked as boolean
                              }
                            })}
                          disabled={false}
                        />
                        <label htmlFor="file-add-comments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Add comments
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="file-view-tags" 
                          checked={newGroup.defaultFilePerms.viewTags}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                viewTags: checked as boolean
                              }
                            })}
                          disabled={false}
                        />
                        <label htmlFor="file-view-tags" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          View tags
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="folder-view-contents" 
                          checked={newGroup.defaultFolderPerms.viewContents}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFolderPerms: {
                                ...newGroup.defaultFolderPerms,
                                viewContents: checked as boolean
                              }
                            })}
                          disabled={false}
                        />
                        <label htmlFor="folder-view-contents" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          View folder contents
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="folder-allow-uploads" 
                          checked={newGroup.defaultFolderPerms.allowUploads}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFolderPerms: {
                                ...newGroup.defaultFolderPerms,
                                allowUploads: checked as boolean
                              }
                            })}
                          disabled={false}
                        />
                        <label htmlFor="folder-allow-uploads" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Allow uploads to folder
                        </label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            
            {/* Specific Permissions Section - Only shown when enabled */}
            {showSpecificPermissions && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Select specific files and folders to customize access. These settings will override the default permissions.
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <FolderPermissionTree
                    folderStructure={folderStructure}
                    selectedPermissions={newGroup.fileSpecificPermissions || {}}
                    onPermissionChange={handleFilePermissionChange}
                    selectedItem={selectedFileId}
                    onSelectItem={setSelectedFileId}
                  />
                  
                  <ItemPermissionsPanel
                    selectedItemId={selectedFileId}
                    items={folderStructure}
                    permissions={newGroup.fileSpecificPermissions || {}}
                    onPermissionChange={handleFilePermissionChange}
                  />
                </div>
              </div>
            )}
            
            {/* Dataroom Permissions */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="dataroom-permissions" className="border-b dark:border-gray-700">
                <AccordionTrigger className="dark:text-white py-4">
                  Dataroom Permissions
                </AccordionTrigger>
                <AccordionContent className="dark:text-gray-300 space-y-3 px-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="can-query" 
                      checked={newGroup.canQuery}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canQuery: checked as boolean})}
                    />
                    <label htmlFor="can-query" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Can query dataroom
                    </label>
                  </div>
                  
                  <div className="text-xs text-amber-500 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md mb-2">
                    Note: Queries may use data from files that users may not have access to with Specific Permissions (granular querying coming soon)
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="can-organize" 
                      checked={newGroup.canOrganize}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canOrganize: checked as boolean})}
                    />
                    <label htmlFor="can-organize" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Can organize files and folders
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="can-view-audit" 
                      checked={newGroup.canViewAuditLogs}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canViewAuditLogs: checked as boolean})}
                    />
                    <label htmlFor="can-view-audit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Can view audit logs
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="can-create-permission-groups" 
                      checked={newGroup.canCreatePermissionGroups}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canCreatePermissionGroups: checked as boolean})}
                    />
                    <label htmlFor="can-create-permission-groups" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Can create permission groups
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="can-delete-dataroom" 
                      checked={newGroup.canDeleteDataroom}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canDeleteDataroom: checked as boolean})}
                    />
                    <label htmlFor="can-delete-dataroom" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Can delete dataroom
                    </label>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-medium block">Can invite users with roles:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="invite-read" 
                          checked={newGroup.canInviteUsers.includes('READ')}
                          onCheckedChange={(checked) => {
                            const newInviteUsers = [...newGroup.canInviteUsers];
                            if (checked) {
                              if (!newInviteUsers.includes('READ')) newInviteUsers.push('READ');
                            } else {
                              const index = newInviteUsers.indexOf('READ');
                              if (index > -1) newInviteUsers.splice(index, 1);
                            }
                            setNewGroup({...newGroup, canInviteUsers: newInviteUsers});
                          }}
                        />
                        <label htmlFor="invite-read" className="text-sm">Viewer</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="invite-write" 
                          checked={newGroup.canInviteUsers.includes('WRITE')}
                          onCheckedChange={(checked) => {
                            const newInviteUsers = [...newGroup.canInviteUsers];
                            if (checked) {
                              if (!newInviteUsers.includes('WRITE')) newInviteUsers.push('WRITE');
                            } else {
                              const index = newInviteUsers.indexOf('WRITE');
                              if (index > -1) newInviteUsers.splice(index, 1);
                            }
                            setNewGroup({...newGroup, canInviteUsers: newInviteUsers});
                          }}
                        />
                        <label htmlFor="invite-write" className="text-sm">Editor</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="invite-admin" 
                          checked={newGroup.canInviteUsers.includes('ADMIN')}
                          onCheckedChange={(checked) => {
                            const newInviteUsers = [...newGroup.canInviteUsers];
                            if (checked) {
                              if (!newInviteUsers.includes('ADMIN')) newInviteUsers.push('ADMIN');
                            } else {
                              const index = newInviteUsers.indexOf('ADMIN');
                              if (index > -1) newInviteUsers.splice(index, 1);
                            }
                            setNewGroup({...newGroup, canInviteUsers: newInviteUsers});
                          }}
                        />
                        <label htmlFor="invite-admin" className="text-sm">Admin</label>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="qa-permissions" className="border-b dark:border-gray-700">
                <AccordionTrigger className="dark:text-white py-4">
                  Q&A Permissions
                </AccordionTrigger>
                <AccordionContent className="dark:text-gray-300 space-y-3 px-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="can-read-qa" 
                      checked={newGroup.canUseQA}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canUseQA: checked as boolean})}
                      defaultChecked={true}
                    />
                    <label htmlFor="can-read-qa" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Read Q&A
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="can-answer-qa" 
                      checked={newGroup.canReadAnswerQuestions}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canReadAnswerQuestions: checked as boolean})}
                      defaultChecked={true}
                    />
                    <label htmlFor="can-answer-qa" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Answer Q&A
                    </label>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateGroupDialogOpen(false)}
              className="dark:bg-transparent dark:text-white dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePermissionGroup}
              disabled={!newGroupName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagement;