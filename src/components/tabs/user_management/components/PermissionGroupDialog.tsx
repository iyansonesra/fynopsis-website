import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import FolderTree, { Node } from '../static_folder_tree/static-folder-tree';

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
  // Available permission groups for user management section
  availablePermissionGroups?: Record<string, RoleInfo>;
}

type TabType = 'general' | 'specific' | 'user' | 'dataroom' | 'qa' | 'audit' | 'diligence' | 'questionnaire';

// Define RoleInfo interface locally to avoid import issues
interface RoleInfo {
  id: string;
  name: string;
  type: 'ROLE' | 'GROUP';
  description?: string;
}

// Define default permission templates within the dialog scope
const DEFAULT_FILE_PERMISSIONS = {
  viewAccess: true,
  watermarkContent: false,
  deleteAccess: false,
  editAccess: false,
  viewComments: true,
  addComments: false,
  downloadAccess: false,
  viewTags: true,
  addTags: false,
  canQuery: false,
  isVisible: true,
  moveAccess: false,
  renameAccess: false
};

const DEFAULT_FOLDER_PERMISSIONS = {
  allowUploads: false,
  createFolders: false,
  addComments: false,
  viewComments: true,
  viewContents: true,
  viewTags: true,
  addTags: false,
  canQuery: false,
  isVisible: true,
  moveContents: false,
  renameContents: false,
  deleteContents: false
};

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
  handleAllAccessChange: externalHandleAllAccessChange,
  // Available permission groups for user management section
  availablePermissionGroups
}) => {
  // Update state to include name
  const [selectedItemDetails, setSelectedItemDetails] = useState<{ id: string | null, isFolder: boolean | null, name: string | null }>({ id: null, isFolder: null, name: null });
  const [internalShowSpecificPermissions, setInternalShowSpecificPermissions] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [permissionsMap, setPermissionsMap] = useState<Record<string, FilePermission>>({});

  // Derive name from state
  const selectedFileId = selectedItemDetails.id;
  const selectedItemIsFolder = selectedItemDetails.isFolder;
  const selectedItemName = selectedItemDetails.name;

  // Ensure allAccess is true by default when opening the dialog
  useEffect(() => {
    if (isOpen) {
      // Default to general access mode ON and appropriate tab
      if (!newGroup.allAccess) {
        setNewGroup(prev => ({
          ...prev,
          allAccess: true
        }));
      }
      setActiveTab('general');
    }
  }, [isOpen]);

  // Use external or internal state
  const showSpecificPermissions = externalShowSpecificPermissions !== undefined ? externalShowSpecificPermissions : internalShowSpecificPermissions;
  
  // Update setSelectedFileId to use the new state structure (if used externally)
  const setSelectedFileId = (id: string | null) => {
    if (externalSetSelectedFileId) {
      // We need more info (isFolder) if using external state, this might need refactoring
      // For now, assume internal state management for simplicity
      console.warn("External setSelectedFileId might not work correctly with the new state structure without isFolder info.");
      setSelectedItemDetails({ id: id, isFolder: null, name: null }); // Can't determine isFolder here
    } else {
       // This function might not be needed if selection only happens via handleNodeSelect
      setSelectedItemDetails(prev => ({ ...prev, id: id })); // Only update ID if called directly
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
      setActiveTab('general');
      setShowSpecificPermissions(false);
    } else {
      // When disabling all access, keep current permissions
      setNewGroup({
        ...newGroup,
        allAccess: false,
      });
      // When turning off allAccess, switch to specific tab
      setActiveTab('specific');
      setShowSpecificPermissions(true);
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
    if (newGroup.allAccess) {
      // If trying to switch to specific while allAccess is true, 
      // we need to toggle the mode first
      handleAllAccessChange(false);
    } else {
      setActiveTab('specific');
      setShowSpecificPermissions(true);
    }
  };

  // Navigate to a tab
  const navigateToTab = (tab: TabType) => {
    // If trying to navigate to general tab but allAccess is false, 
    // or to specific tab but allAccess is true, don't allow it
    if ((tab === 'general' && !newGroup.allAccess) ||
        (tab === 'specific' && newGroup.allAccess)) {
      return;
    }

    setActiveTab(tab);
  };

  // Handle permission changes for a specific node
  const handlePermissionChange = (id: string, permissions: Partial<FilePermission>) => {
    if (!id) return;
    
    setPermissionsMap(prev => {
      const newPermissions = { ...prev };
      
      // Update the current node's permissions
      newPermissions[id] = {
        ...newPermissions[id],
        ...permissions
      };

      // If this is a folder, propagate the changes to all visible children
      const node = dialogItemsMap[id];
      if (node?.type === 'folder') {
        // Get all child nodes recursively
        const getAllChildren = (currentNode: FileTreeItemType): FileTreeItemType[] => {
          const children: FileTreeItemType[] = [];
          if (currentNode.children) {
            currentNode.children.forEach(child => {
              children.push(child);
              children.push(...getAllChildren(child));
            });
          }
          return children;
        };

        const allChildren = getAllChildren(node);
        
        // Update permissions for all visible children
        allChildren.forEach(child => {
          if (child.id) {
            const childId = child.id as string;
            // Only update if the child is visible
            if (newPermissions[childId]?.show !== false) {
              // Apply the same permission changes to the child
              Object.keys(permissions).forEach(key => {
                if (key !== 'show') {  // Don't override show property
                  newPermissions[childId] = {
                    ...newPermissions[childId],
                    [key]: permissions[key as keyof FilePermission]
                  };
                }
              });
            }
          }
        });
      }

      return newPermissions;
    });
  };

  // Update handleNodeSelect to store name
  const handleNodeSelect = (node: Node & { show?: boolean }) => {
    console.log("Node selected in Dialog:", node); // Log the selected node
    if (node.id) {
      setSelectedItemDetails({ 
        id: node.id, 
        isFolder: node.isFolder ?? null, 
        name: node.name // Store the name
      }); 
      
      // Initialize or update permissions map for the node
      const nodeId = node.id as string;
      setPermissionsMap(prev => ({
        ...prev,
        [nodeId]: {
          // Keep existing permissions, ensure show/isVisible is tracked
          ...(prev[nodeId] || DEFAULT_FILE_PERMISSIONS), // Start with defaults if new
          show: node.show ?? prev[nodeId]?.show ?? true, // Update show based on node state
          isVisible: node.show ?? prev[nodeId]?.isVisible ?? true // Keep isVisible synced
        }
      }));

      // If this is a folder, potentially update children (logic might need review)
      // This visibility propagation might be better handled elsewhere or refined
      if (node.isFolder) {
        // ... (existing child update logic - may need re-evaluation) ...
      }
    } else {
      setSelectedItemDetails({ id: null, isFolder: null, name: null }); // Clear all details
    }
  };

  // Determine if we're editing or creating
  const isEditMode = newGroup.id !== undefined && newGroup.id !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Permission Group" : "Create Permission Group"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Modify this permission group's settings to control what users assigned to this group can do." 
              : "Create a new permission group to control what users assigned to this group can do."}
          </DialogDescription>
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
                      activeTab === 'general' && "bg-gray-100 dark:bg-gray-800",
                      !newGroup.allAccess && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => navigateToTab('general')}
                    disabled={!newGroup.allAccess}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    File Permissions
                    {!newGroup.allAccess && (
                      <AlertCircle className="ml-1 h-3 w-3 text-yellow-500" />
                    )}
                  </Button>
                  {!newGroup.allAccess && activeTab === 'general' && (
                    <p className="text-xs text-yellow-500 ml-8 mt-1">
                      Enable general access first
                    </p>
                  )}
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-md text-sm font-medium",
                      activeTab === 'specific' && "bg-gray-100 dark:bg-gray-800",
                      newGroup.allAccess && "opacity-50 cursor-not-allowed"
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
                    Dataroom Settings
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
                    Issues & Support
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-md text-sm font-medium",
                      activeTab === 'audit' && "bg-gray-100 dark:bg-gray-800"
                    )}
                    onClick={() => navigateToTab('audit')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Audit Logs
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-md text-sm font-medium",
                      activeTab === 'diligence' && "bg-gray-100 dark:bg-gray-800"
                    )}
                    onClick={() => navigateToTab('diligence')}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Diligence Dashboard
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start rounded-md text-sm font-medium",
                      activeTab === 'questionnaire' && "bg-gray-100 dark:bg-gray-800"
                    )}
                    onClick={() => navigateToTab('questionnaire')}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Questionnaires
                  </Button>
                </li>
              </ul>
            </nav>
          </div>
          
          {/* Right Content Area */}
          <div className="overflow-auto p-6">
            {/* General File Permissions Tab */}
            {activeTab === 'general' && newGroup.allAccess && (
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
                              defaultFilePerms: { ...prev.defaultFilePerms, viewAccess: checked }
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Edit files</label>
                        <Switch
                          checked={newGroup.defaultFilePerms.editAccess}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFilePerms: { ...prev.defaultFilePerms, editAccess: checked }
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Delete files</label>
                        <Switch
                          checked={newGroup.defaultFilePerms.deleteAccess}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFilePerms: { ...prev.defaultFilePerms, deleteAccess: checked }
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
                              defaultFilePerms: { ...prev.defaultFilePerms, watermarkContent: checked }
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Move files</label>
                        <Switch
                          checked={newGroup.defaultFilePerms.moveAccess}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFilePerms: { ...prev.defaultFilePerms, moveAccess: checked }
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Rename files</label>
                        <Switch
                          checked={newGroup.defaultFilePerms.renameAccess}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFilePerms: { ...prev.defaultFilePerms, renameAccess: checked }
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
                              defaultFilePerms: { ...prev.defaultFilePerms, viewComments: checked }
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
                              defaultFilePerms: { ...prev.defaultFilePerms, addComments: checked }
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
                              defaultFilePerms: { ...prev.defaultFilePerms, viewTags: checked }
                            }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm">Add tags</label>
                        <Switch 
                          checked={newGroup.defaultFilePerms.addTags}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFilePerms: { ...prev.defaultFilePerms, addTags: checked }
                            }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm">AI Query Content</label>
                        <Switch
                          checked={newGroup.defaultFilePerms.canQuery}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFilePerms: { ...prev.defaultFilePerms, canQuery: checked }
                            }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm">Is Visible</label>
                        <Switch
                          checked={newGroup.defaultFilePerms.isVisible}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFilePerms: { ...prev.defaultFilePerms, isVisible: checked }
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
                              defaultFolderPerms: { ...prev.defaultFolderPerms, viewContents: checked }
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
                              defaultFolderPerms: { ...prev.defaultFolderPerms, createFolders: checked }
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
                              defaultFolderPerms: { ...prev.defaultFolderPerms, allowUploads: checked }
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Delete folder contents</label>
                        <Switch
                          checked={newGroup.defaultFolderPerms.deleteContents}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFolderPerms: { ...prev.defaultFolderPerms, deleteContents: checked }
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Move folder contents</label>
                        <Switch
                          checked={newGroup.defaultFolderPerms.moveContents}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFolderPerms: { ...prev.defaultFolderPerms, moveContents: checked }
                            }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Rename folder contents</label>
                        <Switch
                          checked={newGroup.defaultFolderPerms.renameContents}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFolderPerms: { ...prev.defaultFolderPerms, renameContents: checked }
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
                              defaultFolderPerms: { ...prev.defaultFolderPerms, viewComments: checked }
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
                              defaultFolderPerms: { ...prev.defaultFolderPerms, addComments: checked }
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
                              defaultFolderPerms: { ...prev.defaultFolderPerms, viewTags: checked }
                            }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm">Add tags</label>
                        <Switch 
                          checked={newGroup.defaultFolderPerms.addTags}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({ 
                              ...prev, 
                              defaultFolderPerms: { ...prev.defaultFolderPerms, addTags: checked }
                            }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm">AI Query Content</label>
                        <Switch
                          checked={newGroup.defaultFolderPerms.canQuery}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFolderPerms: { ...prev.defaultFolderPerms, canQuery: checked }
                            }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-sm">Is Visible</label>
                        <Switch
                          checked={newGroup.defaultFolderPerms.isVisible}
                          onCheckedChange={(checked) =>
                            setNewGroup(prev => ({
                              ...prev,
                              defaultFolderPerms: { ...prev.defaultFolderPerms, isVisible: checked }
                            }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* When General Access is off but we're still on general tab */}
            {activeTab === 'general' && !newGroup.allAccess && (
              <div className="flex flex-col items-center justify-center h-[500px] border dark:border-gray-700 rounded-md">
                <div className="text-center p-8">
                  <div className="bg-gray-100 dark:bg-gray-800 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">General access mode is disabled</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                    General file permissions are only available when General Access Mode is enabled.
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => handleAllAccessChange(true)}
                  >
                    Enable General Access Mode
                  </Button>
                </div>
              </div>
            )}
            
            {/* Specific File Permissions Tab - only shown when General Access is OFF */}
            {activeTab === 'specific' && !newGroup.allAccess && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Specific File & Folder Permissions</h3>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure access permissions for specific files and folders. These settings override the general permissions.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px]">
                  <FolderTree onNodeSelect={handleNodeSelect} />
                  <ItemPermissionsPanel
                    selectedItemId={selectedFileId}
                    selectedItemIsFolder={selectedItemIsFolder}
                    selectedItemName={selectedItemName}
                    permissions={permissionsMap}
                    onPermissionChange={handlePermissionChange}
                  />
                </div>
              </div>
            )}
            
            {/* When we try to show specific tab but General Access is ON */}
            {activeTab === 'specific' && newGroup.allAccess && (
              <div className="flex flex-col items-center justify-center h-[500px] border dark:border-gray-700 rounded-md">
                <div className="text-center p-8">
                  <div className="bg-gray-100 dark:bg-gray-800 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderOpen className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">General access mode is enabled</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                    Specific file permissions are only available when General Access Mode is disabled.
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => handleAllAccessChange(false)}
                  >
                    Disable General Access Mode
                  </Button>
                </div>
              </div>
            )}
            
            {/* User Management Permissions Tab */}
            {activeTab === 'user' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">User Management Permissions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure who this permission group can invite and manage.
                </p>
                
                {/* Master switch for user management access */}
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div>
                    <label className="text-sm font-medium">Can access user management panel</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Main permission required for all user management features</p>
                  </div>
                  <Switch 
                    checked={newGroup.canAccessUserManagementPanel}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        // When turning off access, disable all dependent permissions
                        setNewGroup(prev => ({
                          ...prev, 
                          canAccessUserManagementPanel: false,
                          canViewUsers: false,
                          canViewPermissionGroupDetails: false,
                          canInviteUsers: [],
                          canUpdateUserPermissions: [],
                          canUpdatePeerPermissions: false,
                          canRemoveUsers: [],
                          canRemovePeerPermission: false,
                          canCreatePermissionGroups: false
                        }));
                      } else {
                        // Just enable the main switch when turning on
                        setNewGroup(prev => ({...prev, canAccessUserManagementPanel: true}));
                      }
                    }}
                  />
                </div>
                
                {/* Secondary permissions - disabled if master switch is off */}
                <div className={newGroup.canAccessUserManagementPanel ? "" : "opacity-50"}>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Can view users list</label>
                    <Switch 
                      checked={newGroup.canViewUsers}
                      disabled={!newGroup.canAccessUserManagementPanel}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          // When turning off user viewing, disable dependent permissions
                          setNewGroup(prev => ({
                            ...prev, 
                            canViewUsers: false,
                            canInviteUsers: [],
                            canUpdateUserPermissions: [],
                            canUpdatePeerPermissions: false,
                            canRemoveUsers: [],
                            canRemovePeerPermission: false,
                          }));
                        } else {
                          setNewGroup(prev => ({...prev, canViewUsers: true}));
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Can view permission group details</label>
                    <Switch 
                      checked={newGroup.canViewPermissionGroupDetails}
                      disabled={!newGroup.canAccessUserManagementPanel}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          // When turning off group viewing, disable dependent permissions
                          setNewGroup(prev => ({
                            ...prev, 
                            canViewPermissionGroupDetails: false,
                            canCreatePermissionGroups: false
                          }));
                        } else {
                          setNewGroup(prev => ({...prev, canViewPermissionGroupDetails: true}));
                        }
                      }}
                    />
                  </div>

                  <Separator className="my-4" />

                  {/* Disable the entire invite section if user viewing is disabled */}
                  <div className={newGroup.canViewUsers ? "" : "opacity-50"}>
                    <div className="border dark:border-gray-700 rounded-md p-6 space-y-6">
                      {/* Can invite users section */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Can invite users with roles:</h4>
                        
                        {/* Any Role toggle */}
                        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div>
                            <label htmlFor="invite-any-role" className="text-sm font-medium">Any Role</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Allow inviting users with any role</p>
                          </div>
                          <Switch 
                            id="invite-any-role" 
                            checked={newGroup.canInviteUsers?.includes('*')}
                            disabled={!newGroup.canViewUsers}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewGroup(prev => ({...prev, canInviteUsers: ['*']}));
                              } else {
                                setNewGroup(prev => ({...prev, canInviteUsers: []}));
                              }
                            }}
                          />
                        </div>
                        
                        {/* Specific roles selection */}
                        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${newGroup.canInviteUsers?.includes('*') || !newGroup.canViewUsers ? 'opacity-50' : ''}`}>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="invite-read" 
                              checked={newGroup.canInviteUsers?.includes('*') || newGroup.canInviteUsers?.includes('READ')}
                              disabled={newGroup.canInviteUsers?.includes('*')}
                              onCheckedChange={(checked) => {
                                if (newGroup.canInviteUsers?.includes('*')) return;
                                const current = newGroup.canInviteUsers || [];
                                const next = checked 
                                  ? [...current.filter(r => r !== 'READ'), 'READ'] 
                                  : current.filter(r => r !== 'READ');
                                setNewGroup(prev => ({...prev, canInviteUsers: next }));
                              }}
                            />
                            <label htmlFor="invite-read" className="text-sm">Viewer</label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="invite-write" 
                              checked={newGroup.canInviteUsers?.includes('*') || newGroup.canInviteUsers?.includes('WRITE')}
                              disabled={newGroup.canInviteUsers?.includes('*')}
                              onCheckedChange={(checked) => {
                                if (newGroup.canInviteUsers?.includes('*')) return;
                                const current = newGroup.canInviteUsers || [];
                                const next = checked 
                                  ? [...current.filter(r => r !== 'WRITE'), 'WRITE'] 
                                  : current.filter(r => r !== 'WRITE');
                                setNewGroup(prev => ({...prev, canInviteUsers: next }));
                              }}
                            />
                            <label htmlFor="invite-write" className="text-sm">Editor</label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="invite-admin" 
                              checked={newGroup.canInviteUsers?.includes('*') || newGroup.canInviteUsers?.includes('ADMIN')}
                              disabled={newGroup.canInviteUsers?.includes('*')}
                              onCheckedChange={(checked) => {
                                if (newGroup.canInviteUsers?.includes('*')) return;
                                const current = newGroup.canInviteUsers || [];
                                const next = checked 
                                  ? [...current.filter(r => r !== 'ADMIN'), 'ADMIN'] 
                                  : current.filter(r => r !== 'ADMIN');
                                setNewGroup(prev => ({...prev, canInviteUsers: next }));
                              }}
                            />
                            <label htmlFor="invite-admin" className="text-sm">Admin</label>
                          </div>
                          
                          {/* Custom Permission Groups */}
                          {availablePermissionGroups && Object.entries(availablePermissionGroups)
                            .filter(([id, info]) => info.type === 'GROUP' && id !== newGroup.id) // Filter out standard roles and self
                            .map(([id, info]) => (
                              <div key={id} className="flex items-center space-x-2">
                                <Switch 
                                  id={`invite-group-${id}`} 
                                  checked={newGroup.canInviteUsers?.includes('*') || newGroup.canInviteUsers?.includes(id)}
                                  disabled={newGroup.canInviteUsers?.includes('*')}
                                  onCheckedChange={(checked) => {
                                    if (newGroup.canInviteUsers?.includes('*')) return;
                                    const current = newGroup.canInviteUsers || [];
                                    const next = checked 
                                      ? [...current.filter(r => r !== id), id] 
                                      : current.filter(r => r !== id);
                                    setNewGroup(prev => ({...prev, canInviteUsers: next }));
                                  }}
                                />
                                <label htmlFor={`invite-group-${id}`} className="text-sm">{info.name}</label>
                              </div>
                            ))
                          }
                        </div>
                        
                        {newGroup.canInviteUsers?.includes('*') && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 italic">
                            Users with this permission group can invite users with any role
                          </p>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Can update user permissions section - disabled if user viewing is off */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Can update permissions for users with roles:</h4>
                        
                        {/* Any Role toggle */}
                        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <div>
                            <label htmlFor="update-any-role" className="text-sm font-medium">Any Role</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Allow updating permissions for any role</p>
                          </div>
                          <Switch 
                            id="update-any-role" 
                            checked={newGroup.canUpdateUserPermissions?.includes('*')}
                            disabled={!newGroup.canViewUsers}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewGroup(prev => ({...prev, canUpdateUserPermissions: ['*']}));
                              } else {
                                setNewGroup(prev => ({...prev, canUpdateUserPermissions: []}));
                              }
                            }}
                          />
                        </div>
                        
                        {/* Specific roles selection */}
                        <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${newGroup.canUpdateUserPermissions?.includes('*') || !newGroup.canViewUsers ? 'opacity-50' : ''}`}>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="update-read" 
                              checked={newGroup.canUpdateUserPermissions?.includes('*') || newGroup.canUpdateUserPermissions?.includes('READ')}
                              disabled={newGroup.canUpdateUserPermissions?.includes('*')}
                              onCheckedChange={(checked) => {
                                if (newGroup.canUpdateUserPermissions?.includes('*')) return;
                                const current = newGroup.canUpdateUserPermissions || [];
                                const next = checked 
                                  ? [...current.filter(r => r !== 'READ'), 'READ'] 
                                  : current.filter(r => r !== 'READ');
                                setNewGroup(prev => ({...prev, canUpdateUserPermissions: next }));
                              }}
                            />
                            <label htmlFor="update-read" className="text-sm">Viewers</label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="update-write" 
                              checked={newGroup.canUpdateUserPermissions?.includes('*') || newGroup.canUpdateUserPermissions?.includes('WRITE')}
                              disabled={newGroup.canUpdateUserPermissions?.includes('*')}
                              onCheckedChange={(checked) => {
                                if (newGroup.canUpdateUserPermissions?.includes('*')) return;
                                const current = newGroup.canUpdateUserPermissions || [];
                                const next = checked 
                                  ? [...current.filter(r => r !== 'WRITE'), 'WRITE'] 
                                  : current.filter(r => r !== 'WRITE');
                                setNewGroup(prev => ({...prev, canUpdateUserPermissions: next }));
                              }}
                            />
                            <label htmlFor="update-write" className="text-sm">Editors</label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="update-admin" 
                              checked={newGroup.canUpdateUserPermissions?.includes('*') || newGroup.canUpdateUserPermissions?.includes('ADMIN')}
                              disabled={newGroup.canUpdateUserPermissions?.includes('*')}
                              onCheckedChange={(checked) => {
                                if (newGroup.canUpdateUserPermissions?.includes('*')) return;
                                const current = newGroup.canUpdateUserPermissions || [];
                                const next = checked 
                                  ? [...current.filter(r => r !== 'ADMIN'), 'ADMIN'] 
                                  : current.filter(r => r !== 'ADMIN');
                                setNewGroup(prev => ({...prev, canUpdateUserPermissions: next }));
                              }}
                            />
                            <label htmlFor="update-admin" className="text-sm">Admins</label>
                          </div>
                          
                          {/* Custom Permission Groups */}
                          {availablePermissionGroups && Object.entries(availablePermissionGroups)
                            .filter(([id, info]) => info.type === 'GROUP' && id !== newGroup.id) // Filter out standard roles and self
                            .map(([id, info]) => (
                              <div key={id} className="flex items-center space-x-2">
                                <Switch 
                                  id={`update-group-${id}`} 
                                  checked={newGroup.canUpdateUserPermissions?.includes('*') || newGroup.canUpdateUserPermissions?.includes(id)}
                                  disabled={newGroup.canUpdateUserPermissions?.includes('*')}
                                  onCheckedChange={(checked) => {
                                    if (newGroup.canUpdateUserPermissions?.includes('*')) return;
                                    const current = newGroup.canUpdateUserPermissions || [];
                                    const next = checked 
                                      ? [...current.filter(r => r !== id), id] 
                                      : current.filter(r => r !== id);
                                    setNewGroup(prev => ({...prev, canUpdateUserPermissions: next }));
                                  }}
                                />
                                <label htmlFor={`update-group-${id}`} className="text-sm">{info.name}</label>
                              </div>
                            ))
                          }
                        </div>
                        
                        {newGroup.canUpdateUserPermissions?.includes('*') && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 italic">
                            Users with this permission group can update permissions for any role
                          </p>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Can update peer permissions */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Can update permissions of peers (same group)</label>
                        <Switch 
                          checked={newGroup.canUpdatePeerPermissions}
                          disabled={!newGroup.canViewUsers}
                          onCheckedChange={(checked) => 
                            setNewGroup(prev => ({...prev, canUpdatePeerPermissions: checked }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  {/* Can remove users section - disabled if user viewing is off */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Can remove users with roles:</h4>
                    
                    {/* Any Role toggle */}
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <div>
                        <label htmlFor="remove-any-role" className="text-sm font-medium">Any Role</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Allow removing users with any role</p>
                      </div>
                      <Switch 
                        id="remove-any-role" 
                        checked={newGroup.canRemoveUsers?.includes('*')}
                        disabled={!newGroup.canViewUsers}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewGroup(prev => ({...prev, canRemoveUsers: ['*']}));
                          } else {
                            setNewGroup(prev => ({...prev, canRemoveUsers: []}));
                          }
                        }}
                      />
                    </div>
                    
                    {/* Specific roles selection */}
                    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${newGroup.canRemoveUsers?.includes('*') || !newGroup.canViewUsers ? 'opacity-50' : ''}`}>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="remove-read" 
                          checked={newGroup.canRemoveUsers?.includes('*') || newGroup.canRemoveUsers?.includes('READ')}
                          disabled={newGroup.canRemoveUsers?.includes('*')}
                          onCheckedChange={(checked) => {
                            if (newGroup.canRemoveUsers?.includes('*')) return;
                            const current = newGroup.canRemoveUsers || [];
                            const next = checked 
                              ? [...current.filter(r => r !== 'READ'), 'READ'] 
                              : current.filter(r => r !== 'READ');
                            setNewGroup(prev => ({...prev, canRemoveUsers: next }));
                          }}
                        />
                        <label htmlFor="remove-read" className="text-sm">Viewer</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="remove-write" 
                          checked={newGroup.canRemoveUsers?.includes('*') || newGroup.canRemoveUsers?.includes('WRITE')}
                          disabled={newGroup.canRemoveUsers?.includes('*')}
                          onCheckedChange={(checked) => {
                            if (newGroup.canRemoveUsers?.includes('*')) return;
                            const current = newGroup.canRemoveUsers || [];
                            const next = checked ? [...current, 'WRITE'] : current.filter(r => r !== 'WRITE');
                            setNewGroup({...newGroup, canRemoveUsers: next });
                          }}
                        />
                        <label htmlFor="remove-write" className="text-sm">Editor</label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="remove-admin" 
                          checked={newGroup.canRemoveUsers?.includes('*') || newGroup.canRemoveUsers?.includes('ADMIN')}
                          disabled={newGroup.canRemoveUsers?.includes('*')}
                          onCheckedChange={(checked) => {
                            if (newGroup.canRemoveUsers?.includes('*')) return;
                            const current = newGroup.canRemoveUsers || [];
                            const next = checked 
                              ? [...current.filter(r => r !== 'ADMIN'), 'ADMIN'] 
                              : current.filter(r => r !== 'ADMIN');
                            setNewGroup(prev => ({...prev, canRemoveUsers: next }));
                          }}
                        />
                        <label htmlFor="remove-admin" className="text-sm">Admin</label>
                      </div>
                      
                      {/* Custom Permission Groups */}
                      {availablePermissionGroups && Object.entries(availablePermissionGroups)
                        .filter(([id, info]) => info.type === 'GROUP' && id !== newGroup.id) // Filter out standard roles and self
                        .map(([id, info]) => (
                          <div key={id} className="flex items-center space-x-2">
                            <Switch 
                              id={`remove-group-${id}`} 
                              checked={newGroup.canRemoveUsers?.includes('*') || newGroup.canRemoveUsers?.includes(id)}
                              disabled={newGroup.canRemoveUsers?.includes('*')}
                              onCheckedChange={(checked) => {
                                if (newGroup.canRemoveUsers?.includes('*')) return;
                                const current = newGroup.canRemoveUsers || [];
                                const next = checked 
                                  ? [...current.filter(r => r !== id), id] 
                                  : current.filter(r => r !== id);
                                setNewGroup(prev => ({...prev, canRemoveUsers: next }));
                              }}
                            />
                            <label htmlFor={`remove-group-${id}`} className="text-sm">{info.name}</label>
                          </div>
                        ))
                      }
                    </div>
                    
                    {newGroup.canRemoveUsers?.includes('*') && (
                      <p className="text-xs text-blue-500 dark:text-blue-400 italic">
                        Users with this permission group can remove users with any role (except Owner)
                      </p>
                    )}
                  </div>
                  
                  {/* Can remove peer permission */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Can remove peers (same group)</label>
                    <Switch 
                      checked={newGroup.canRemovePeerPermission}
                      disabled={!newGroup.canViewUsers}
                      onCheckedChange={(checked) => 
                        setNewGroup(prev => ({...prev, canRemovePeerPermission: checked }))}
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Can create permission groups - disabled if view permission groups is off */}
                <div className="flex items-center justify-between">
                  <label className="text-sm">Can create/edit permission groups</label>
                  <Switch 
                    checked={newGroup.canCreatePermissionGroups}
                    disabled={!newGroup.canViewPermissionGroupDetails}
                    onCheckedChange={(checked) => 
                      setNewGroup(prev => ({...prev, canCreatePermissionGroups: checked }))}
                  />
                </div>
              </div>
            )}
            
            {/* Dataroom Permissions Tab - Renamed to Dataroom Settings */} 
            {activeTab === 'dataroom' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Dataroom Settings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure settings for the dataroom.
                </p>
                
                <div className="border dark:border-gray-700 rounded-md p-6">
                  <div className="space-y-4">
                    {/* Renamed canQuery to canQueryEntireDataroom */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can AI query entire dataroom</label>
                      <Switch 
                        checked={newGroup.canQueryEntireDataroom}
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canQueryEntireDataroom: checked }))}
                      />
                    </div>
                    
                    {newGroup.canQueryEntireDataroom && (
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
                          setNewGroup(prev => ({...prev, canOrganize: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can retry processing</label>
                      <Switch 
                        checked={newGroup.canRetryProcessing !== false} // Default to true if not explicitly set
                        onCheckedChange={(checked) => {
                          setNewGroup(prev => ({...prev, canRetryProcessing: checked }));
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between opacity-50">
                      <div>
                        <label className="text-sm">Can delete dataroom</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Only dataroom owners can delete datarooms</p>
                      </div>
                      <Switch 
                        checked={false} // Controlled by Owner role primarily
                        disabled={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Q&A Permissions Tab - Renamed to Issues & Support */}
            {activeTab === 'qa' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Issues & Support Permissions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure permissions for the Issues & Support section.
                </p>
                 <div className="border dark:border-gray-700 rounded-md p-6">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                      <label className="text-sm">Can access Issues & Support panel</label>
                      <Switch 
                        checked={!!newGroup.canAccessIssuesPanel} // Use !! to ensure boolean
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canAccessIssuesPanel: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can create new issues</label>
                      <Switch 
                        checked={!!newGroup.canCreateIssue} // Use !! to ensure boolean
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canCreateIssue: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can answer/resolve issues</label>
                      <Switch 
                        checked={!!newGroup.canAnswerIssue} // Use !! to ensure boolean
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canAnswerIssue: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Added: Audit Logs Tab */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Audit Log Permissions</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure permissions for accessing audit logs.
                </p>
                 <div className="border dark:border-gray-700 rounded-md p-6">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                      <label className="text-sm">Can access Audit Logs panel</label>
                      <Switch 
                        checked={newGroup.canAccessAuditLogsPanel}
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canAccessAuditLogsPanel: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can view audit logs</label>
                      <Switch 
                        checked={newGroup.canViewAuditLogs}
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canViewAuditLogs: checked }))}
                      />
                    </div>
                     <div className="flex items-center justify-between">
                      <label className="text-sm">Can export audit logs</label>
                      <Switch 
                        checked={newGroup.canExportAuditLogs}
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canExportAuditLogs: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Added: Diligence Dashboard Tab */}
            {activeTab === 'diligence' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Diligence Dashboard Permissions</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure permissions for the Diligence Dashboard.
                </p>
                 <div className="border dark:border-gray-700 rounded-md p-6">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                      <label className="text-sm">Can access Diligence Dashboard panel</label>
                      <Switch 
                        checked={newGroup.canAccessDiligenceDashboard}
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canAccessDiligenceDashboard: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can create diligence widgets</label>
                      <Switch 
                        checked={newGroup.canCreateDiligenceWidget}
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canCreateDiligenceWidget: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can move diligence widgets</label>
                      <Switch 
                        checked={newGroup.canMoveWidgets}
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canMoveWidgets: checked }))}
                      />
                    </div>
                     <div className="flex items-center justify-between">
                      <label className="text-sm">Can delete diligence widgets</label>
                      <Switch 
                        checked={newGroup.canDeleteWidgets}
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canDeleteWidgets: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

             {/* Added: Questionnaire Tab */}
            {activeTab === 'questionnaire' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Questionnaire Permissions</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure permissions for Questionnaires.
                </p>
                 <div className="border dark:border-gray-700 rounded-md p-6">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                      <label className="text-sm">Can access Questionnaire panel</label>
                      <Switch 
                        checked={newGroup.canAccessQuestionairePanel} // Keeping sample typo for consistency
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canAccessQuestionairePanel: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Can add questionnaires</label>
                      <Switch 
                        checked={newGroup.canAddQuestionnaire}
                        onCheckedChange={(checked) => 
                          setNewGroup(prev => ({...prev, canAddQuestionnaire: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button variant="ghost" className="mr-2" onClick={onClose} disabled={isCreatingGroup}>
            Cancel
          </Button>
          <Button type="submit" onClick={onCreateGroup} disabled={!newGroupName.trim() || isCreatingGroup}>
            {isCreatingGroup 
              ? (isEditMode ? "Updating..." : "Creating...") 
              : (isEditMode ? "Save Changes" : "Create Group")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 