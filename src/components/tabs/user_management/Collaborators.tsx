import React, { useEffect, useState, useCallback } from 'react';
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
import { useToast } from "@/components/ui/use-toast";
import { Amplify } from 'aws-amplify';

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
  allowUploads?: boolean; // Added allowUploads
};

// Permission Group Type Update
type PermissionGroup = {
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
const DEFAULT_ROLES: Array<Omit<PermissionGroup, 'id'>> = [
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

// Completely rewrite the tree and permission handling to use a simpler approach
const FolderPermissionTree = ({
  folderStructure,
  selectedPermissions,
  onPermissionChange,
  selectedItem,
  onSelectItem,
  itemsMap,
  parentMap
}: {
  folderStructure: FileTreeItem[];
  selectedPermissions: Record<string, FilePermission>;
  onPermissionChange: (id: string, permissions: Partial<FilePermission>) => void;
  selectedItem: string | null;
  onSelectItem: (id: string) => void;
  itemsMap: Record<string, FileTreeItem>;
  parentMap: Record<string, string | undefined>;
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return newExpanded;
    });
  };
  
  useEffect(() => {
    if (selectedItem && parentMap) {
      const parentsToExpand = new Set<string>();
      let currentParentId = parentMap[selectedItem];
      while (currentParentId) {
        parentsToExpand.add(currentParentId);
        currentParentId = parentMap[currentParentId];
      }

      if (parentsToExpand.size > 0) {
        setExpandedFolders(prevExpanded => {
          const newExpanded = new Set(prevExpanded);
          parentsToExpand.forEach(id => newExpanded.add(id));
          if (Array.from(parentsToExpand).some(id => !prevExpanded.has(id))) {
            return newExpanded;
          }
          return prevExpanded; 
        });
      }
    }
  }, [selectedItem, parentMap]);

  return (
    <div className="border rounded-md overflow-auto dark:border-gray-700" style={{ height: '500px' }}>
      <div className="p-3 border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700 font-medium">
        <span className="dark:text-white">Files and Folders</span>
      </div>
      <div className="p-2">
        {folderStructure.map((item) => (
          <FileTreeItem
            key={item.id} 
            item={item}
            level={0}
            selectedPermissions={selectedPermissions}
            onPermissionChange={onPermissionChange} 
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            isExpanded={expandedFolders.has(item.id)} 
            onToggleExpand={handleToggleExpand} 
            expandedFolders={expandedFolders} 
            itemsMap={itemsMap}
            parentMap={parentMap}
          />
        ))}
      </div>
    </div>
  );
};

// FileTreeItem component update
const FileTreeItem = ({
  item,
  level,
  selectedPermissions,
  onPermissionChange,
  selectedItem,
  onSelectItem,
  isExpanded, 
  onToggleExpand, 
  expandedFolders,
  itemsMap,
  parentMap
}: {
  item: FileTreeItem;
  level: number;
  selectedPermissions: Record<string, FilePermission>;
  onPermissionChange: (itemId: string, permissions: Partial<FilePermission>) => void;
  selectedItem: string | null;
  onSelectItem: (id: string) => void;
  isExpanded: boolean; 
  onToggleExpand: (folderId: string) => void; 
  expandedFolders: Set<string>; 
  itemsMap: Record<string, FileTreeItem>;
  parentMap: Record<string, string | undefined>;
}) => {
  const isSelectedForHighlight = selectedItem === item.id;
  const itemPermissions = selectedPermissions[item.id] || { show: true };

  const handleToggleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(item.id);
  };

  const handleSelect = () => {
    onSelectItem(item.id);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPermissionChange(item.id, { show: !itemPermissions.show });
  };

  return (
    <div className="mb-2">
      <div
        key={`item-${item.id}-${itemPermissions.show}`}
        className={`flex items-center mb-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded
          ${isSelectedForHighlight ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''}
          ${isExpanded ? 'font-medium' : ''}`}
        onClick={handleSelect}
      >
        <div style={{ width: `${level * 12}px` }} />
        <div className="flex items-center mr-1" onClick={(e) => e.stopPropagation()}> 
          <div className="relative w-5 h-5"> 
            <Checkbox
              id={`tree-item-${item.id}`}
              key={`checkbox-${item.id}-${itemPermissions.show}`}
              checked={itemPermissions.show}
              onCheckedChange={() => {}}
              className="cursor-pointer h-4 w-4 border-gray-300 dark:border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
            />
            <div
              className="absolute inset-0 cursor-pointer z-10"
              onClick={handleCheckboxClick} 
            ></div>
          </div>
        </div>
        {item.children?.length ? (
          <button
            className="mr-1 w-5 h-5 flex items-center justify-center text-gray-500"
            onClick={handleToggleExpandClick} 
            type="button"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="mr-1 w-5 h-5"></div> 
        )}
        <div className="w-5 h-5 mr-2 text-gray-500"> 
          {item.type === 'folder' ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />}
        </div>
        <div className="flex-1 text-xs mr-1">{item.name}</div>
      </div>

      {isExpanded && item.children && item.children.length > 0 && (
        <div>
          {item.children.map((child) => {
            const childPermissions = selectedPermissions[child.id] || { show: true };
            return (
              <FileTreeItem
                key={`${child.id}-${childPermissions.show}`}
                item={child}
                level={level + 1}
                selectedPermissions={selectedPermissions}
                onPermissionChange={onPermissionChange} 
                selectedItem={selectedItem}
                onSelectItem={onSelectItem}
                isExpanded={expandedFolders.has(child.id)} 
                onToggleExpand={onToggleExpand} 
                expandedFolders={expandedFolders} 
                itemsMap={itemsMap}
                parentMap={parentMap}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ItemPermissionsPanel Component Update
const ItemPermissionsPanel: React.FC<{
  selectedItemId: string | null;
  items: any[];
  permissions: Record<string, any>;
  onPermissionChange: (id: string, permissions: Partial<FilePermission>) => void;
}> = ({ selectedItemId, items, permissions, onPermissionChange }) => {
  if (!selectedItemId) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md h-full flex items-center justify-center min-h-[500px]">
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
  const isVisible = itemPermissions.show !== false;

  const handleVisibilitySwitchChange = (checked: boolean) => {
    if (selectedItemId) {
      onPermissionChange(selectedItemId, { show: checked });
    }
  };

  const handleDetailPermissionChange = (update: Partial<FilePermission>) => {
    if (selectedItemId) {
      onPermissionChange(selectedItemId, update);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
      <h3 className="font-medium text-sm mb-3 dark:text-white">
        {selectedItem?.name || 'Item'} Permissions
      </h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Visibility</h4>
          <div className="flex items-center space-x-2 mb-2">
            <Switch 
              id={`${selectedItemId}-panel-show`}
              checked={isVisible}
              onCheckedChange={handleVisibilitySwitchChange}
            />
            <label htmlFor={`${selectedItemId}-panel-show`} className="text-sm">
              Visible to group members
            </label>
          </div>
        </div>
        
        <div>
          <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Access Permissions</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id={`${selectedItemId}-panel-view`}
                checked={isVisible && itemPermissions.viewAccess}
                onCheckedChange={(checked) => 
                  handleDetailPermissionChange({ viewAccess: checked })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-panel-view`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                View content
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id={`${selectedItemId}-panel-download`}
                checked={isVisible && itemPermissions.downloadAccess}
                onCheckedChange={(checked) => 
                  handleDetailPermissionChange({ downloadAccess: checked })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-panel-download`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                Download
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id={`${selectedItemId}-panel-edit`}
                checked={isVisible && itemPermissions.deleteEditAccess}
                onCheckedChange={(checked) => 
                  handleDetailPermissionChange({ deleteEditAccess: checked })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-panel-edit`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                Edit/Delete
              </label>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Special Settings</h4>
          <div className="space-y-2">
             <div className="flex items-center space-x-2">
              <Switch 
                id={`${selectedItemId}-panel-watermark`}
                checked={isVisible && itemPermissions.requireAgreement}
                onCheckedChange={(checked) => 
                  handleDetailPermissionChange({ requireAgreement: checked })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-panel-watermark`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                Require NDA/agreement to view
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id={`${selectedItemId}-panel-viewtags`}
                checked={isVisible && itemPermissions.viewTags}
                onCheckedChange={(checked) => 
                  handleDetailPermissionChange({ viewTags: checked })}
                disabled={!isVisible}
              />
              <label htmlFor={`${selectedItemId}-panel-viewtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                View tags
              </label>
            </div>
            
            {isFolder && (
              <div className="flex items-center space-x-2">
                <Switch 
                  id={`${selectedItemId}-panel-uploads`}
                  checked={isVisible && itemPermissions.allowUploads}
                  onCheckedChange={(checked) => 
                    handleDetailPermissionChange({ allowUploads: checked })}
                  disabled={!isVisible}
                />
                <label htmlFor={`${selectedItemId}-panel-uploads`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
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
  
  // Add a useEffect to fetch permission groups when the component mounts
  useEffect(() => {
    if (bucketUuid) {
      fetchUsers();
      fetchPermissionLevel();
      fetchPermissionGroups(); // Add this to load permission groups
    }
  }, [bucketUuid]);
  
  // Function to fetch permission groups
  const fetchPermissionGroups = async () => {
    if (!bucketUuid) return;
    setIsLoadingGroups(true);
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
      
      console.log("Fetched Permission Groups:", groups);
      
      if (Array.isArray(groups)) {
        setPermissionGroups(groups as PermissionGroup[]);
      } else {
        console.error("Unexpected response format:", groups);
        setPermissionGroups([]);
      }
    } catch (error) {
      console.error('Error fetching permission groups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch permission groups.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingGroups(false);
    }
  };

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

  // --- Lifted State for Maps (for Create Group Dialog scope) ---
  const [dialogItemsMap, setDialogItemsMap] = useState<Record<string, FileTreeItem>>({});
  const [dialogChildrenMap, setDialogChildrenMap] = useState<Record<string, string[]>>({});
  const [dialogParentMap, setDialogParentMap] = useState<Record<string, string | undefined>>({});

  // Effect to build maps when folderStructure changes (within UserManagement scope)
  useEffect(() => {
    const itemMap: Record<string, FileTreeItem> = {};
    const childMap: Record<string, string[]> = {};
    const pMap: Record<string, string | undefined> = {};

    const processItem = (item: FileTreeItem, parentId?: string) => {
      itemMap[item.id] = item;
      pMap[item.id] = parentId;
      if (item.children && item.children.length > 0) {
        childMap[item.id] = item.children.map(child => child.id);
        item.children.forEach(child => processItem(child, item.id));
      } else {
        childMap[item.id] = [];
      }
    };
    folderStructure.forEach(item => processItem(item));

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

      // Add debugging logs
      console.log('Raw API Response:', response);
      console.log('Response type:', typeof response);
      console.log('Response has users property:', response.hasOwnProperty('users'));
      
      // Check if response is directly an array
      if (Array.isArray(response)) {
        console.log('Response is an array with length:', response.length);
        
        // Transform the users data when response is an array
        const transformedUsers = response.map((user: any) => ({
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

        setUsers(transformedUsers);
      } 
      // Original approach (response.users is an array)
      else if (response.users && Array.isArray(response.users)) {
        console.log('Using response.users with length:', response.users.length);
        
        // Transform the users data to include invitation status and permission info
        const transformedUsers = response.users.map((user: any) => ({
          ...user,
          isInvited: user.status === 'INVITED',
          // Keep the raw role and invitedRole for compatibility with existing code
          role: user.role,
          invitedRole: user.invitedRole,
          // Store detailed permission info if available from API
          permissionInfo: user.permissionInfo || {
            type: 'ROLE',
            displayName: formatRoleDisplay(user.role),
          },
          invitedPermissionInfo: user.invitedPermissionInfo || (user.invitedRole ? {
            type: 'ROLE',
            displayName: formatRoleDisplay(user.invitedRole),
          } : undefined)
        }));

        setUsers(transformedUsers);
      } 
      else {
        console.error('Unexpected response format:', response);
        setError('Invalid response format from server');
        setUsers([]);
      }
      
      if (response || Array.isArray(response)) {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
      setUsers([]);
      setIsLoading(false);
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
            permissionIdentifier: inviteRole
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

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const handleCreatePermissionGroup = async () => {
    if (!newGroupName.trim() || !bucketUuid) return;
    setIsCreatingGroup(true);
    try {
      // Map frontend state to the backend expected structure
      const backendPermissionsPayload = {
        // General dataroom permissions
        allAccess: newGroup.allAccess,
        canQueryEntireDataroom: newGroup.canQuery,
        canOrganize: newGroup.canOrganize,
        canViewAuditLogs: newGroup.canViewAuditLogs,
        canInviteUsers: newGroup.canInviteUsers,
        canUpdateUserPermissions: newGroup.canUpdateUserPermissions,
        canCreatePermissionGroups: newGroup.canCreatePermissionGroups,
        canDeleteDataroom: newGroup.canDeleteDataroom,
        canReadQA: newGroup.canUseQA,
        canAnswerQA: newGroup.canReadAnswerQuestions,
        canRetryProcessing: true, // Default to true 
        
        // Default file permissions
        defaultFilePerms: {
          ...newGroup.defaultFilePerms
        },
        
        // Default folder permissions with complete nested structure
        defaultFolderPerms: {
          // Direct folder permissions
          allowUploads: newGroup.defaultFolderPerms.allowUploads,
          createFolders: newGroup.defaultFolderPerms.createFolders,
          addComments: newGroup.defaultFolderPerms.addComments,
          viewComments: newGroup.defaultFolderPerms.viewComments,
          viewContents: newGroup.defaultFolderPerms.viewContents,
          viewTags: newGroup.defaultFolderPerms.viewTags,
          canQuery: newGroup.defaultFolderPerms.canQuery,
          isVisible: newGroup.defaultFolderPerms.isVisible,
          
          // Nested permissions for inheritance
          inheritFileAccess: {
            ...newGroup.defaultFolderPerms.inheritFileAccess || newGroup.defaultFilePerms // Fallback to defaultFilePerms if not set
          },
          inheritFolderAccess: {
            ...(newGroup.defaultFolderPerms.inheritFolderAccess || {
              // If not explicitly set, copy the direct folder permissions
              allowUploads: newGroup.defaultFolderPerms.allowUploads,
              createFolders: newGroup.defaultFolderPerms.createFolders,
              addComments: newGroup.defaultFolderPerms.addComments,
              viewComments: newGroup.defaultFolderPerms.viewComments,
              viewContents: newGroup.defaultFolderPerms.viewContents,
              viewTags: newGroup.defaultFolderPerms.viewTags,
              canQuery: newGroup.defaultFolderPerms.canQuery,
              isVisible: newGroup.defaultFolderPerms.isVisible
            })
          }
        },
        
        // Empty folder and file specific access maps
        folderIdAccess: newGroup.folderIdAccess || {},
        fileIdAccess: newGroup.fileIdAccess || {}
      };

      const restOperation = post({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/permission-groups`,
        options: {
          body: {
            groupName: newGroupName,
            permissions: backendPermissionsPayload
          },
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        }
      });

      const response = await restOperation.response;
      const result = await response.body.json();

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
      await fetchPermissionGroups();
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
      fetchUsers();
      fetchPermissionLevel();
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
          {/* ... Create Group Dialog Content ... */}
         <DialogContent className="max-w-5xl dark:bg-darkbg overflow-auto max-h-[90vh] p-6">
           {/* ... Header, Name Input, Permission Mode Buttons ... */}
           {/* ... The rest of the Create Group Dialog content ... */} 
           {/* ... (This part remains unchanged) ... */} 
            <DialogHeader>
            <DialogTitle className="text-xl font-semibold dark:text-white">Create Permission Group</DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-6"> 
            <div> {/* Group Name Section */} 
              <label className="text-sm font-medium dark:text-gray-200 mb-1 block">Group Name</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="E.g., External Auditors"
                className="dark:bg-slate-800 dark:text-white dark:border-gray-700"
              />
            </div>
            
            <div className="space-y-2"> {/* Permission Mode Section */} 
              <h3 className="text-sm font-medium dark:text-gray-200">Permission Mode</h3>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Button
                    type="button"
                    variant={!showSpecificPermissions ? "default" : "outline"}
                    onClick={() => {
                      setShowSpecificPermissions(false);
                      // Reset specific permissions and selection when switching back to General
                      setNewGroup(prev => ({ ...prev, fileIdAccess: {} }));
                      setSelectedFileId(null);
                    }}
                    className={`w-full ${!showSpecificPermissions ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 dark:border-slate-600'}`}
                  >
                    General File Permissions
                  </Button>
                </div>
                <div className="flex-1">
                  <Button
                    type="button"
                    variant={showSpecificPermissions ? "default" : "outline"}
                    onClick={() => {
                      setShowSpecificPermissions(true);
                      if (newGroup.allAccess) {
                        handleAllAccessChange(false);
                      }
                    }}
                    className={`w-full ${showSpecificPermissions ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 dark:border-slate-600'}`}
                  >
                    Specific File Permissions
                  </Button>
                </div>
              </div>
              {!showSpecificPermissions && (
                <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                  Apply a consistent set of permissions to all files and folders in dataroom.
                </p>
              )}
              {showSpecificPermissions && (
                <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                  Configure granular permissions for specific files and folders below.
                </p>
              )}
            </div>
            
            {/* General Permissions Accordion - Only show when specific permissions are not enabled */} 
            {!showSpecificPermissions && (
              <Accordion type="single" collapsible defaultValue="general-permissions" className="w-full border dark:border-gray-700 rounded-md">
                <AccordionItem value="general-permissions" className="border-b-0"> {/* Remove internal border */} 
                  <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                    General Permissions Settings
                  </AccordionTrigger>
                  <AccordionContent className="dark:text-gray-300 space-y-4 px-4 pb-4 pt-2"> {/* Adjusted padding */} 
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3"> {/* Adjusted gaps */} 
                      
                      {/* View files */}
                      <div className="flex items-center space-x-2"> {/* Changed from justify-between */} 
                        <Switch 
                          id="general-file-view-access" 
                          checked={newGroup.defaultFilePerms.viewAccess}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                viewAccess: checked
                              }
                            })}
                        />
                        {/* Removed conditional styling */}
                        <label htmlFor="general-file-view-access" className="text-xs font-medium leading-none dark:text-gray-300">
                          View files
                        </label>
                      </div>
                      
                      {/* Download files */}
                      <div className="flex items-center space-x-2"> 
                        <Switch 
                          id="general-file-download" 
                          checked={newGroup.defaultFilePerms.downloadAccess}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                downloadAccess: checked
                              }
                            })}
                        />
                        {/* Removed conditional styling */}
                        <label htmlFor="general-file-download" className="text-xs font-medium leading-none dark:text-gray-300">
                          Download files
                        </label>
                      </div>
                      
                      {/* Apply watermark */}
                      <div className="flex items-center space-x-2"> 
                        <Switch 
                          id="general-file-watermark" 
                          checked={newGroup.defaultFilePerms.watermarkContent}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                watermarkContent: checked
                              }
                            })}
                        />
                        {/* Removed conditional styling */}
                        <label htmlFor="general-file-watermark" className="text-xs font-medium leading-none dark:text-gray-300">
                          Apply watermark
                        </label>
                      </div>
                      
                      {/* Delete/edit files */}
                      <div className="flex items-center space-x-2"> 
                        <Switch 
                          id="general-file-delete-edit" 
                          checked={newGroup.defaultFilePerms.deleteEditAccess}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                deleteEditAccess: checked
                              }
                            })}
                        />
                        {/* Removed conditional styling */}
                        <label htmlFor="general-file-delete-edit" className="text-xs font-medium leading-none dark:text-gray-300">
                          Delete/edit files
                        </label>
                      </div>
                      
                      {/* View comments */}
                      <div className="flex items-center space-x-2"> 
                        <Switch 
                          id="general-file-view-comments" 
                          checked={newGroup.defaultFilePerms.viewComments}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                viewComments: checked
                              },
                              defaultFolderPerms: {
                                ...newGroup.defaultFolderPerms,
                                viewComments: checked
                              }
                            })}
                        />
                        <label htmlFor="general-file-view-comments" className="text-xs font-medium leading-none dark:text-gray-300">
                          View comments
                        </label>
                      </div>
                      
                      {/* Add comments */}
                      <div className="flex items-center space-x-2"> 
                        <Switch 
                          id="general-file-add-comments" 
                          checked={newGroup.defaultFilePerms.addComments}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                addComments: checked
                              },
                              defaultFolderPerms: {
                                ...newGroup.defaultFolderPerms,
                                addComments: checked
                              }
                            })}
                        />
                        <label htmlFor="general-file-add-comments" className="text-xs font-medium leading-none dark:text-gray-300">
                          Add comments
                        </label>
                      </div>
                      
                      {/* View tags */}
                      <div className="flex items-center space-x-2"> 
                        <Switch 
                          id="general-file-view-tags" 
                          checked={newGroup.defaultFilePerms.viewTags}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFilePerms: {
                                ...newGroup.defaultFilePerms,
                                viewTags: checked
                              },
                              defaultFolderPerms: {
                                ...newGroup.defaultFolderPerms,
                                viewTags: checked
                              }
                            })}
                        />
                        <label htmlFor="general-file-view-tags" className="text-xs font-medium leading-none dark:text-gray-300">
                          View tags
                        </label>
                      </div>

                      {/* View folder contents - REMOVED since always true for general permissions */}
                      
                      {/* Create folders */}
                      <div className="flex items-center space-x-2"> 
                        <Switch 
                          id="general-folder-create-folders" 
                          checked={newGroup.defaultFolderPerms.createFolders}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFolderPerms: {
                                ...newGroup.defaultFolderPerms,
                                createFolders: checked
                              }
                            })}
                        />
                        <label htmlFor="general-folder-create-folders" className="text-xs font-medium leading-none dark:text-gray-300">
                          Create folders
                        </label>
                      </div>
                      
                      {/* Allow uploads to folder */}
                      <div className="flex items-center space-x-2"> 
                        <Switch 
                          id="general-folder-allow-uploads" 
                          checked={newGroup.defaultFolderPerms.allowUploads}
                          onCheckedChange={(checked) => 
                            setNewGroup({
                              ...newGroup, 
                              defaultFolderPerms: {
                                ...newGroup.defaultFolderPerms,
                                allowUploads: checked
                              }
                            })}
                        />
                        <label htmlFor="general-folder-allow-uploads" className="text-xs font-medium leading-none dark:text-gray-300">
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
              <div className="border dark:border-gray-700 rounded-md p-4"> {/* Added container */} 
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Select specific files and folders to customize access. These settings will override the default permissions.
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]"> {/* Adjusted grid for responsiveness */} 
                  <FolderPermissionTree
                    folderStructure={folderStructure}
                    selectedPermissions={newGroup.fileIdAccess || {}}
                    onPermissionChange={handleFilePermissionChange} 
                    selectedItem={selectedFileId}
                    onSelectItem={setSelectedFileId}
                    itemsMap={dialogItemsMap}
                    parentMap={dialogParentMap}
                  />
                  
                  <ItemPermissionsPanel
                    selectedItemId={selectedFileId}
                    items={folderStructure}
                    permissions={newGroup.fileIdAccess || {}}
                    onPermissionChange={handleFilePermissionChange} 
                  />
                </div>
              </div>
            )}
            
            {/* Dataroom Permissions Accordion */} 
            <Accordion type="single" collapsible className="w-full border dark:border-gray-700 rounded-md">
              <AccordionItem value="dataroom-permissions" className="border-b-0"> {/* Remove internal border */} 
                <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                  Dataroom Permissions
                </AccordionTrigger>
                <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2"> {/* Adjusted padding and spacing */} 
                  {/* Can query dataroom */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="can-query" 
                      checked={newGroup.canQuery}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canQuery: checked})}
                    />
                    <label htmlFor="can-query" className="text-xs font-medium leading-none dark:text-gray-300">
                      AI Query dataroom
                    </label>
                  </div>
                  
                  {/* ... (warning text remains the same) ... */}
                  <div className="text-xs text-amber-600 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md my-2"> 
                    Note: Queries may use data from files that users may not have access to with Specific Permissions (granular querying coming soon)
                  </div>
                  
                  {/* Can organize files and folders */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="can-organize" 
                      checked={newGroup.canOrganize}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canOrganize: checked})}
                    />
                    <label htmlFor="can-organize" className="text-xs font-medium leading-none dark:text-gray-300">
                      Organize files and folders
                    </label>
                  </div>
                  
                  {/* Can view audit logs */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="can-view-audit" 
                      checked={newGroup.canViewAuditLogs}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canViewAuditLogs: checked})}
                    />
                    <label htmlFor="can-view-audit" className="text-xs font-medium leading-none dark:text-gray-300">
                      View audit logs
                    </label>
                  </div>
                  
                  {/* Can create permission groups */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="can-create-permission-groups" 
                      checked={newGroup.canCreatePermissionGroups}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canCreatePermissionGroups: checked})}
                    />
                    <label htmlFor="can-create-permission-groups" className="text-xs font-medium leading-none dark:text-gray-300">
                      Create permission groups
                    </label>
                  </div>
                  
                  {/* Can delete dataroom */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="can-delete-dataroom" 
                      checked={newGroup.canDeleteDataroom}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canDeleteDataroom: checked})}
                    />
                    <label htmlFor="can-delete-dataroom" className="text-xs font-medium leading-none dark:text-gray-300">
                      Delete dataroom
                    </label>
                  </div>
                  
                  {/* Can invite users */} 
                  <div className="pt-2"> 
                    <label className="text-xs font-medium block mb-2 dark:text-gray-300">Invite other users with roles:</label>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2"> 
                      {/* Invite Viewer */} 
                      <div className="flex items-center space-x-2">
                        <Switch 
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
                        <label htmlFor="invite-read" className="text-xs dark:text-gray-300">Viewer</label>
                      </div>
                      
                      {/* Invite Editor */} 
                      <div className="flex items-center space-x-2">
                        <Switch 
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
                        <label htmlFor="invite-write" className="text-xs dark:text-gray-300">Editor</label>
                      </div>
                      
                      {/* Invite Admin */} 
                      <div className="flex items-center space-x-2">
                        <Switch 
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
                        <label htmlFor="invite-admin" className="text-xs dark:text-gray-300">Admin</label>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="qa-permissions" className="border-b-0"> {/* Remove internal border */} 
                <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                  Q&A Permissions
                </AccordionTrigger>
                <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2"> {/* Adjusted padding and spacing */} 
                  {/* Read Q&A */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="can-read-qa" 
                      checked={newGroup.canUseQA}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canUseQA: checked})}
                      defaultChecked={true}
                    />
                    <label htmlFor="can-read-qa" className="text-xs font-medium leading-none dark:text-gray-300">
                      Read Q&A
                    </label>
                  </div>
                  
                  {/* Answer Q&A */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="can-answer-qa" 
                      checked={newGroup.canReadAnswerQuestions}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canReadAnswerQuestions: checked})}
                      defaultChecked={true}
                    />
                    <label htmlFor="can-answer-qa" className="text-xs font-medium leading-none dark:text-gray-300">
                      Answer Q&A
                    </label>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
           </div>
           
          <DialogFooter className="pt-4"> {/* Added spacing */} 
            <Button
              variant="outline"
              onClick={() => setIsCreateGroupDialogOpen(false)}
              className="dark:bg-transparent dark:text-white dark:hover:bg-slate-800 dark:border-slate-700"
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

      {/* View Group Details Dialog */}
      <Dialog open={viewGroupDetails.isOpen} onOpenChange={(open) => !open && setViewGroupDetails({isOpen: false, group: null})}>
        <DialogContent className="max-w-5xl dark:bg-darkbg overflow-auto max-h-[90vh] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold dark:text-white">
              {viewGroupDetails.group?.name} Details <span className="text-xs font-normal ml-2 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Default Role</span>
            </DialogTitle>
          </DialogHeader>
            
          <div className="py-4 space-y-6">
            <div>
              <label className="text-sm font-medium dark:text-gray-200 mb-1 block">Group Name</label>
              <Input
                value={viewGroupDetails.group?.name || ''}
                readOnly
                disabled
                className="dark:bg-slate-800 dark:text-white dark:border-gray-700 opacity-70"
              />
            </div>
            
            {/* Permission Mode Section - always showing general permissions for view details */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium dark:text-gray-200">Permission Mode</h3>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="default"
                    disabled
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white opacity-80"
                  >
                    General File Permissions
                  </Button>
                </div>
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="w-full dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600 opacity-60"
                  >
                    Specific File Permissions
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Default roles use consistent permissions across all files and folders.
              </p>
            </div>
            
            {/* General Permissions Accordion - Read Only */}
            <Accordion type="single" collapsible defaultValue="general-permissions" className="w-full border dark:border-gray-700 rounded-md">
              <AccordionItem value="general-permissions" className="border-b-0">
                <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                  General Permissions Settings
                </AccordionTrigger>
                <AccordionContent className="dark:text-gray-300 space-y-4 px-4 pb-4 pt-2">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    
                    {/* All switches set to disabled and using the group data */}
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-general-file-view-access" 
                        checked={viewGroupDetails.group?.defaultFilePerms.viewAccess}
                        disabled
                      />
                      <label htmlFor="view-general-file-view-access" className="text-xs font-medium leading-none dark:text-gray-300">
                        View files
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-general-file-download" 
                        checked={viewGroupDetails.group?.defaultFilePerms.downloadAccess}
                        disabled
                      />
                      <label htmlFor="view-general-file-download" className="text-xs font-medium leading-none dark:text-gray-300">
                        Download files
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-general-file-watermark" 
                        checked={viewGroupDetails.group?.defaultFilePerms.watermarkContent}
                        disabled
                      />
                      <label htmlFor="view-general-file-watermark" className="text-xs font-medium leading-none dark:text-gray-300">
                        Apply watermark
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-general-file-delete-edit" 
                        checked={viewGroupDetails.group?.defaultFilePerms.deleteEditAccess}
                        disabled
                      />
                      <label htmlFor="view-general-file-delete-edit" className="text-xs font-medium leading-none dark:text-gray-300">
                        Delete/edit files
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-general-file-view-comments" 
                        checked={viewGroupDetails.group?.defaultFilePerms.viewComments}
                        disabled
                      />
                      <label htmlFor="view-general-file-view-comments" className="text-xs font-medium leading-none dark:text-gray-300">
                        View comments
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-general-file-add-comments" 
                        checked={viewGroupDetails.group?.defaultFilePerms.addComments}
                        disabled
                      />
                      <label htmlFor="view-general-file-add-comments" className="text-xs font-medium leading-none dark:text-gray-300">
                        Add comments
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-general-file-view-tags" 
                        checked={viewGroupDetails.group?.defaultFilePerms.viewTags}
                        disabled
                      />
                      <label htmlFor="view-general-file-view-tags" className="text-xs font-medium leading-none dark:text-gray-300">
                        View tags
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-general-folder-view-contents" 
                        checked={viewGroupDetails.group?.defaultFolderPerms.viewContents}
                        disabled
                      />
                      <label htmlFor="view-general-folder-view-contents" className="text-xs font-medium leading-none dark:text-gray-300">
                        View folder contents
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-general-folder-allow-uploads" 
                        checked={viewGroupDetails.group?.defaultFolderPerms.allowUploads}
                        disabled
                      />
                      <label htmlFor="view-general-folder-allow-uploads" className="text-xs font-medium leading-none dark:text-gray-300">
                        Allow uploads to folder
                      </label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {/* Dataroom Permissions Accordion - Read Only */}
            <Accordion type="single" collapsible className="w-full border dark:border-gray-700 rounded-md">
              <AccordionItem value="dataroom-permissions" className="border-b-0">
                <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                  Dataroom Permissions
                </AccordionTrigger>
                <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-can-query" 
                      checked={viewGroupDetails.group?.canQuery}
                      disabled
                    />
                    <label htmlFor="view-can-query" className="text-xs font-medium leading-none dark:text-gray-300">
                      AI Query dataroom
                    </label>
                  </div>
                  
                  <div className="text-xs text-amber-600 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md my-2">
                    Note: Queries may use data from files that users may not have access to with Specific Permissions (granular querying coming soon)
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-can-organize" 
                      checked={viewGroupDetails.group?.canOrganize}
                      disabled
                    />
                    <label htmlFor="view-can-organize" className="text-xs font-medium leading-none dark:text-gray-300">
                      Organize files and folders
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-can-view-audit" 
                      checked={viewGroupDetails.group?.canViewAuditLogs}
                      disabled
                    />
                    <label htmlFor="view-can-view-audit" className="text-xs font-medium leading-none dark:text-gray-300">
                      View audit logs
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-can-create-permission-groups" 
                      checked={viewGroupDetails.group?.canCreatePermissionGroups}
                      disabled
                    />
                    <label htmlFor="view-can-create-permission-groups" className="text-xs font-medium leading-none dark:text-gray-300">
                      Create permission groups
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-can-delete-dataroom" 
                      checked={viewGroupDetails.group?.canDeleteDataroom}
                      disabled
                    />
                    <label htmlFor="view-can-delete-dataroom" className="text-xs font-medium leading-none dark:text-gray-300">
                      Delete dataroom
                    </label>
                  </div>
                  
                  <div className="pt-2">
                    <label className="text-xs font-medium block mb-2 dark:text-gray-300">Invite other users with roles:</label>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="view-invite-read" 
                          checked={viewGroupDetails.group?.canInviteUsers.includes('READ')}
                          disabled
                        />
                        <label htmlFor="view-invite-read" className="text-xs dark:text-gray-300">Viewer</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="view-invite-write" 
                          checked={viewGroupDetails.group?.canInviteUsers.includes('WRITE')}
                          disabled
                        />
                        <label htmlFor="view-invite-write" className="text-xs dark:text-gray-300">Editor</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="view-invite-admin" 
                          checked={viewGroupDetails.group?.canInviteUsers.includes('ADMIN')}
                          disabled
                        />
                        <label htmlFor="view-invite-admin" className="text-xs dark:text-gray-300">Admin</label>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="qa-permissions" className="border-b-0">
                <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                  Q&A Permissions
                </AccordionTrigger>
                <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-can-read-qa" 
                      checked={viewGroupDetails.group?.canUseQA}
                      disabled
                    />
                    <label htmlFor="view-can-read-qa" className="text-xs font-medium leading-none dark:text-gray-300">
                      Read Q&A
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-can-answer-qa" 
                      checked={viewGroupDetails.group?.canReadAnswerQuestions}
                      disabled
                    />
                    <label htmlFor="view-can-answer-qa" className="text-xs font-medium leading-none dark:text-gray-300">
                      Answer Q&A
                    </label>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
           
          <DialogFooter className="pt-4">
            <Button
              onClick={() => setViewGroupDetails({isOpen: false, group: null})}
              className="dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </> // Closing tag for the main fragment
  );
};

export default UserManagement;