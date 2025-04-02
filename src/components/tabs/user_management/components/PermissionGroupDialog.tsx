import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, FolderOpen, Users, Database, HelpCircle, 
  AlertCircle, ChevronRight, FileIcon
} from 'lucide-react';
import type { FilePermission, FileTreeItem as FileTreeItemType, PermissionGroup } from '../CollaboratorsTypes';
import { FolderPermissionTree } from '../PermissionFolderTree';
import { ItemPermissionsPanel } from '../PermissionFolderTree';
import { cn } from "@/lib/utils";

interface PermissionGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  onNameChange?: (value: string) => void;
  newGroup: PermissionGroup;
  setNewGroup: (group: PermissionGroup | ((prev: PermissionGroup) => PermissionGroup)) => void;
  onCreateGroup: () => Promise<void>;
  isCreatingGroup: boolean;
  folderStructure: FileTreeItemType[];
  dialogItemsMap: Record<string, FileTreeItemType>;
  dialogParentMap: Record<string, string | undefined>;
  onFilePermissionChange: (fileId: string, permissionUpdate: Partial<FilePermission>) => void;
  // Optional external control props
  showSpecificPermissions?: boolean;
  setShowSpecificPermissions?: (show: boolean) => void;
  selectedFileId?: string | null;
  setSelectedFileId?: (id: string | null) => void;
  // Optional additional handler
  handleAllAccessChange?: (checked: boolean) => void;
}

type TabType = 'general' | 'specific' | 'user' | 'dataroom' | 'qa';

export const PermissionGroupDialog: React.FC<PermissionGroupDialogProps> = ({
  isOpen,
  onClose,
  newGroupName,
  setNewGroupName,
  onNameChange,
  newGroup,
  setNewGroup,
  onCreateGroup,
  isCreatingGroup,
  folderStructure,
  dialogItemsMap,
  dialogParentMap,
  onFilePermissionChange,
  // Optional external control props
  showSpecificPermissions: externalShowSpecificPermissions,
  setShowSpecificPermissions: externalSetShowSpecificPermissions,
  selectedFileId: externalSelectedFileId,
  setSelectedFileId: externalSetSelectedFileId,
  // Optional additional handler
  handleAllAccessChange: externalHandleAllAccessChange
}) => {
  // Initialize internal state, using external state if provided
  const [internalSelectedFileId, setInternalSelectedFileId] = useState<string | null>(null);
  const [internalShowSpecificPermissions, setInternalShowSpecificPermissions] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Use external or internal state
  const selectedFileId = externalSelectedFileId !== undefined ? externalSelectedFileId : internalSelectedFileId;
  const showSpecificPermissions = externalShowSpecificPermissions !== undefined ? externalShowSpecificPermissions : internalShowSpecificPermissions;
  
  // Combined setter functions that use external setters if available, otherwise use internal
  const setSelectedFileId = (id: string | null) => {
    if (externalSetSelectedFileId) {
      externalSetSelectedFileId(id);
    } else {
      setInternalSelectedFileId(id);
    }
  };
  
  const setShowSpecificPermissions = (show: boolean) => {
    if (externalSetShowSpecificPermissions) {
      externalSetShowSpecificPermissions(show);
    } else {
      setInternalShowSpecificPermissions(show);
    }
  };

  const handleAllAccessChangeInternal = (checked: boolean) => {
    if (checked) {
      // When enabling all access
      setNewGroup({
        ...newGroup,
        allAccess: true,
      });
      // If enabling all access, switch to general tab
      if (activeTab === 'specific') {
        setActiveTab('general');
      }
      setShowSpecificPermissions(false);
    } else {
      // When disabling all access, keep current permissions
      setNewGroup({
        ...newGroup,
        allAccess: false,
      });
    }
  };
  
  // Use the external handler if provided, otherwise use the internal one
  const handleAllAccessChange = externalHandleAllAccessChange || handleAllAccessChangeInternal;

  // Update the input change handler to use either function based on availability
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onNameChange) {
      onNameChange(value);
    } else {
      setNewGroupName(value);
    }
  };

  // Switch to specific file permissions tab
  const switchToSpecificPermissions = () => {
    setActiveTab('specific');
    setShowSpecificPermissions(true);
    // When switching to specific permissions, ensure allAccess is false
    if (newGroup.allAccess) {
      handleAllAccessChange(false);
    }
  };

  // Navigate to a tab
  const navigateToTab = (tab: TabType) => {
    setActiveTab(tab);
    // If navigating to specific tab, ensure we're in specific permissions mode
    if (tab === 'specific') {
      setShowSpecificPermissions(true);
      if (newGroup.allAccess) {
        handleAllAccessChange(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl">Create New Permission Group</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-[240px_1fr] h-[70vh]">
          {/* Left Sidebar */}
          <div className="border-r dark:border-gray-700 flex flex-col">
            {/* Group Name */}
            <div className="p-4 border-b dark:border-gray-700">
              <Label htmlFor="group-name" className="text-sm mb-2 block">
                Group Name
              </Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={handleNameChange}
                placeholder="Marketing Team"
                required
              />
            </div>
            
            {/* Permission Mode Toggle */}
            <div className="p-4 border-b dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="access-mode" className="text-sm">
                  General Access Mode
                </Label>
                <Switch 
                  id="access-mode" 
                  checked={newGroup.allAccess}
                  onCheckedChange={handleAllAccessChange}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {newGroup.allAccess 
                  ? "Using general permissions for all files" 
                  : "Using specific file/folder permissions"}
              </p>
            </div>
            
            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto p-2">
              <ul className="space-y-1">
                <li>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-md text-sm font-medium",
                      activeTab === 'general' && "bg-gray-100 dark:bg-gray-800"
                    )}
                    onClick={() => navigateToTab('general')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    File Permissions
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-md text-sm font-medium",
                      activeTab === 'specific' && "bg-gray-100 dark:bg-gray-800"
                    )}
                    onClick={switchToSpecificPermissions}
                    disabled={newGroup.allAccess}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Specific File Permissions
                    {newGroup.allAccess && (
                      <AlertCircle className="ml-1 h-3 w-3 text-yellow-500" />
                    )}
                  </Button>
                  {newGroup.allAccess && activeTab === 'specific' && (
                    <p className="text-xs text-yellow-500 ml-8 mt-1">
                      Disable general access first
                    </p>
                  )}
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-md text-sm font-medium",
                      activeTab === 'user' && "bg-gray-100 dark:bg-gray-800"
                    )}
                    onClick={() => navigateToTab('user')}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    User Management
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-md text-sm font-medium",
                      activeTab === 'dataroom' && "bg-gray-100 dark:bg-gray-800"
                    )}
                    onClick={() => navigateToTab('dataroom')}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Dataroom Access
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-md text-sm font-medium",
                      activeTab === 'qa' && "bg-gray-100 dark:bg-gray-800"
                    )}
                    onClick={() => navigateToTab('qa')}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Q&A Permissions
                  </Button>
                </li>
              </ul>
            </nav>
          </div>
          
          {/* Right Content Area */}
          <div className="overflow-auto p-6">
            {/* General File Permissions Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">File & Folder Permissions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  These permissions apply to all files and folders in the dataroom.
                </p>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* File Permissions */}
                  <div className="border dark:border-gray-700 rounded-md p-4">
                    <h4 className="text-sm font-medium mb-3">File Permissions</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">View files</label>
                        <Switch 
                          checked={newGroup.defaultFilePerms.viewAccess}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFilePerms: { 
                                ...prev.defaultFilePerms, 
                                viewAccess: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Download files</label>
                        <Switch 
                          checked={newGroup.defaultFilePerms.downloadAccess}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFilePerms: { 
                                ...prev.defaultFilePerms, 
                                downloadAccess: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Edit/Delete files</label>
                        <Switch 
                          checked={newGroup.defaultFilePerms.deleteEditAccess}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFilePerms: { 
                                ...prev.defaultFilePerms, 
                                deleteEditAccess: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Apply watermark</label>
                        <Switch 
                          checked={newGroup.defaultFilePerms.watermarkContent}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFilePerms: { 
                                ...prev.defaultFilePerms, 
                                watermarkContent: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">View comments</label>
                        <Switch 
                          checked={newGroup.defaultFilePerms.viewComments}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFilePerms: { 
                                ...prev.defaultFilePerms, 
                                viewComments: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Add comments</label>
                        <Switch 
                          checked={newGroup.defaultFilePerms.addComments}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFilePerms: { 
                                ...prev.defaultFilePerms, 
                                addComments: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">View tags</label>
                        <Switch 
                          checked={newGroup.defaultFilePerms.viewTags}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFilePerms: { 
                                ...prev.defaultFilePerms, 
                                viewTags: checked 
                              } 
                            }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Folder Permissions */}
                  <div className="border dark:border-gray-700 rounded-md p-4">
                    <h4 className="text-sm font-medium mb-3">Folder Permissions</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">View folder contents</label>
                        <Switch 
                          checked={newGroup.defaultFolderPerms.viewContents}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFolderPerms: { 
                                ...prev.defaultFolderPerms, 
                                viewContents: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Create folders</label>
                        <Switch 
                          checked={newGroup.defaultFolderPerms.createFolders}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFolderPerms: { 
                                ...prev.defaultFolderPerms, 
                                createFolders: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Upload to folders</label>
                        <Switch 
                          checked={newGroup.defaultFolderPerms.allowUploads}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFolderPerms: { 
                                ...prev.defaultFolderPerms, 
                                allowUploads: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">View comments</label>
                        <Switch 
                          checked={newGroup.defaultFolderPerms.viewComments}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFolderPerms: { 
                                ...prev.defaultFolderPerms, 
                                viewComments: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Add comments</label>
                        <Switch 
                          checked={newGroup.defaultFolderPerms.addComments}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFolderPerms: { 
                                ...prev.defaultFolderPerms, 
                                addComments: checked 
                              } 
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">View tags</label>
                        <Switch 
                          checked={newGroup.defaultFolderPerms.viewTags}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFolderPerms: { 
                                ...prev.defaultFolderPerms, 
                                viewTags: checked 
                              } 
                            }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Specific File Permissions Tab */}
            {activeTab === 'specific' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Specific File & Folder Permissions</h3>
                  {newGroup.allAccess && (
                    <div className="flex items-center text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 px-3 py-1 rounded-md text-sm">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span>Disable general access mode first</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure access permissions for specific files and folders. These settings override the general permissions.
                </p>
                
                {!newGroup.allAccess ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
                    <FolderPermissionTree
                      folderStructure={folderStructure}
                      selectedPermissions={newGroup.fileIdAccess || {}}
                      onPermissionChange={onFilePermissionChange} 
                      selectedItem={selectedFileId}
                      onSelectItem={setSelectedFileId}
                      itemsMap={dialogItemsMap}
                      parentMap={dialogParentMap}
                    />
                    <ItemPermissionsPanel
                      selectedItemId={selectedFileId}
                      items={Object.values(dialogItemsMap)}
                      permissions={newGroup.fileIdAccess || {}}
                      onPermissionChange={onFilePermissionChange}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] border dark:border-gray-700 rounded-md">
                    <div className="text-center p-8">
                      <div className="bg-gray-100 dark:bg-gray-800 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">General access mode is active</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                        To configure specific file and folder permissions, disable the general access mode in the sidebar.
                      </p>
                      <Button 
                        className="mt-4"
                        variant="outline"
                        onClick={() => handleAllAccessChange(false)}
                      >
                        Disable General Access Mode
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* User Management Permissions Tab */}
            {activeTab === 'user' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">User Management Permissions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure who this permission group can invite and manage.
                </p>
                
                <div className="border dark:border-gray-700 rounded-md p-6 space-y-6">
                  {/* Can invite users section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Can invite users with roles:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                        <label htmlFor="invite-read" className="text-sm">Viewer</label>
                      </div>
                      
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
                        <label htmlFor="invite-write" className="text-sm">Editor</label>
                      </div>
                      
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
                        <label htmlFor="invite-admin" className="text-sm">Admin</label>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Can update user permissions section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Can update permissions for:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="update-read" 
                          checked={newGroup.canUpdateUserPermissions.includes('READ')}
                          onCheckedChange={(checked) => {
                            const newUpdateUsers = [...newGroup.canUpdateUserPermissions];
                            if (checked) {
                              if (!newUpdateUsers.includes('READ')) newUpdateUsers.push('READ');
                            } else {
                              const index = newUpdateUsers.indexOf('READ');
                              if (index > -1) newUpdateUsers.splice(index, 1);
                            }
                            setNewGroup({...newGroup, canUpdateUserPermissions: newUpdateUsers});
                          }}
                        />
                        <label htmlFor="update-read" className="text-sm">Viewers</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="update-write" 
                          checked={newGroup.canUpdateUserPermissions.includes('WRITE')}
                          onCheckedChange={(checked) => {
                            const newUpdateUsers = [...newGroup.canUpdateUserPermissions];
                            if (checked) {
                              if (!newUpdateUsers.includes('WRITE')) newUpdateUsers.push('WRITE');
                            } else {
                              const index = newUpdateUsers.indexOf('WRITE');
                              if (index > -1) newUpdateUsers.splice(index, 1);
                            }
                            setNewGroup({...newGroup, canUpdateUserPermissions: newUpdateUsers});
                          }}
                        />
                        <label htmlFor="update-write" className="text-sm">Editors</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="update-admin" 
                          checked={newGroup.canUpdateUserPermissions.includes('ADMIN')}
                          onCheckedChange={(checked) => {
                            const newUpdateUsers = [...newGroup.canUpdateUserPermissions];
                            if (checked) {
                              if (!newUpdateUsers.includes('ADMIN')) newUpdateUsers.push('ADMIN');
                            } else {
                              const index = newUpdateUsers.indexOf('ADMIN');
                              if (index > -1) newUpdateUsers.splice(index, 1);
                            }
                            setNewGroup({...newGroup, canUpdateUserPermissions: newUpdateUsers});
                          }}
                        />
                        <label htmlFor="update-admin" className="text-sm">Admins</label>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Can create permission groups */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Can create permission groups</label>
                    <Switch 
                      checked={newGroup.canCreatePermissionGroups}
                      onCheckedChange={(checked) => 
                        setNewGroup({...newGroup, canCreatePermissionGroups: checked})}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Dataroom Permissions Tab */}
            {activeTab === 'dataroom' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Dataroom Permissions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure dataroom-level permissions for this group.
                </p>
                
                <div className="border dark:border-gray-700 rounded-md p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can query dataroom</label>
                      <Switch 
                        checked={newGroup.canQuery}
                        onCheckedChange={(checked) => 
                          setNewGroup({...newGroup, canQuery: checked})}
                      />
                    </div>
                    
                    {newGroup.canQuery && (
                      <div className="ml-8 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-3 rounded-md">
                        <p>
                          Queries may use data from files that users may not have access to with specific permissions (granular querying coming soon).
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can organize files and folders</label>
                      <Switch 
                        checked={newGroup.canOrganize}
                        onCheckedChange={(checked) => 
                          setNewGroup({...newGroup, canOrganize: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can view audit logs</label>
                      <Switch 
                        checked={newGroup.canViewAuditLogs}
                        onCheckedChange={(checked) => 
                          setNewGroup({...newGroup, canViewAuditLogs: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can delete dataroom</label>
                      <Switch 
                        checked={newGroup.canDeleteDataroom}
                        onCheckedChange={(checked) => 
                          setNewGroup({...newGroup, canDeleteDataroom: checked})}
                      />
                    </div>
                    
                    {newGroup.canDeleteDataroom && (
                      <div className="ml-8 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md">
                        <p>
                          Warning: This will allow users with this permission group to permanently delete the entire dataroom and all its content.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Q&A Permissions Tab */}
            {activeTab === 'qa' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Q&A Permissions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure permissions for the Q&A section of the dataroom.
                </p>
                
                <div className="border dark:border-gray-700 rounded-md p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can read Q&A</label>
                      <Switch 
                        checked={newGroup.canUseQA}
                        onCheckedChange={(checked) => 
                          setNewGroup({...newGroup, canUseQA: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can answer Q&A</label>
                      <Switch 
                        checked={newGroup.canReadAnswerQuestions}
                        onCheckedChange={(checked) => 
                          setNewGroup({...newGroup, canReadAnswerQuestions: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can retry processing</label>
                      <Switch 
                        checked={newGroup.canRetryProcessing !== false} // Default to true if not explicitly set
                        onCheckedChange={(checked) => {
                          // Add the property explicitly to the object
                          setNewGroup({
                            ...newGroup, 
                            canRetryProcessing: checked
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="p-6 border-t dark:border-gray-700">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isCreatingGroup}
          >
            Cancel
          </Button>
          <Button 
            onClick={onCreateGroup} 
            disabled={!newGroupName.trim() || isCreatingGroup}
          >
            {isCreatingGroup ? 'Creating...' : 'Create Permission Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 