import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FilePermission, FileTreeItem as FileTreeItemType, PermissionGroup } from '../CollaboratorsTypes';
import { FolderPermissionTree } from '../PermissionFolderTree';
import { ItemPermissionsPanel } from '../PermissionFolderTree';

interface PermissionGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  newGroup: PermissionGroup;
  setNewGroup: (group: PermissionGroup | ((prev: PermissionGroup) => PermissionGroup)) => void;
  onCreateGroup: () => Promise<void>;
  isCreatingGroup: boolean;
  folderStructure: FileTreeItemType[];
  dialogItemsMap: Record<string, FileTreeItemType>;
  dialogParentMap: Record<string, string | undefined>;
  onFilePermissionChange: (fileId: string, permissionUpdate: Partial<FilePermission>) => void;
}

export const PermissionGroupDialog: React.FC<PermissionGroupDialogProps> = ({
  isOpen,
  onClose,
  newGroupName,
  setNewGroupName,
  newGroup,
  setNewGroup,
  onCreateGroup,
  isCreatingGroup,
  folderStructure,
  dialogItemsMap,
  dialogParentMap,
  onFilePermissionChange
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showSpecificPermissions, setShowSpecificPermissions] = useState(false);
  const [permissionTab, setPermissionTab] = useState("general");

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Permission Group</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="group-name" className="text-right text-sm">
              Group Name
            </label>
            <Input
              id="group-name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="col-span-3"
              placeholder="Marketing Team"
              required
            />
          </div>
          
          <div className="mt-4">
            <Tabs value={permissionTab} onValueChange={setPermissionTab}>
              <TabsList className="w-full">
                <TabsTrigger 
                  value="general" 
                  className={`w-full ${permissionTab === 'general' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 dark:border-slate-600'}`}
                  onClick={() => {
                    setPermissionTab("general");
                    setShowSpecificPermissions(false);
                    // Reset specific permissions and selection when switching back to General
                    setNewGroup(prev => ({ ...prev, fileIdAccess: {} }));
                    setSelectedFileId(null);
                  }}
                >
                  General Permissions
                </TabsTrigger>
                <TabsTrigger 
                  value="specific" 
                  className={`w-full ${permissionTab === 'specific' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600 dark:border-slate-600'}`}
                  onClick={() => {
                    setPermissionTab("specific");
                    setShowSpecificPermissions(true);
                  }}
                >
                  File/Folder Permissions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="bg-white dark:bg-transparent rounded-md p-4 mt-4">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-medium mb-4">General Data Room Permissions</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="all-access">Full Access (Administrator)</Label>
                        <Switch 
                          id="all-access" 
                          checked={newGroup.allAccess}
                          onCheckedChange={handleAllAccessChange}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can-query">Can Use Search</Label>
                        <Switch 
                          id="can-query" 
                          checked={newGroup.canQuery}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ ...prev, canQuery: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can-organize">Can Organize Files</Label>
                        <Switch 
                          id="can-organize" 
                          checked={newGroup.canOrganize}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ ...prev, canOrganize: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can-view-audit">Can View Audit Logs</Label>
                        <Switch 
                          id="can-view-audit" 
                          checked={newGroup.canViewAuditLogs}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ ...prev, canViewAuditLogs: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can-delete-dataroom">Can Delete Data Room</Label>
                        <Switch 
                          id="can-delete-dataroom" 
                          checked={newGroup.canDeleteDataroom}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ ...prev, canDeleteDataroom: checked }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-4">Default File Permissions</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="file-view">Can View Files</Label>
                        <Switch 
                          id="file-view" 
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
                        <Label htmlFor="file-download">Can Download Files</Label>
                        <Switch 
                          id="file-download" 
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
                        <Label htmlFor="file-edit">Can Edit/Delete Files</Label>
                        <Switch 
                          id="file-edit" 
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
                        <Label htmlFor="file-watermark">Apply Watermark</Label>
                        <Switch 
                          id="file-watermark" 
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
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-4">Default Folder Permissions</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="folder-view">Can View Folder Contents</Label>
                        <Switch 
                          id="folder-view" 
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
                        <Label htmlFor="folder-create">Can Create Folders</Label>
                        <Switch 
                          id="folder-create" 
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
                        <Label htmlFor="folder-upload">Can Upload to Folders</Label>
                        <Switch 
                          id="folder-upload" 
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
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specific" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <DialogFooter>
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