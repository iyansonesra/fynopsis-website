import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, FolderOpen } from 'lucide-react';
import type { FilePermission } from '../CollaboratorsTypes';
import type { Node } from '../static_folder_tree/static-folder-tree';
import { handleCheckboxSelect, findDeviators } from '../utils/folderTreeUtils';
import { useFolderStructureStore } from '@/components/services/folderStructureStore';

interface FileSpecificPermissionPanelProps {
  selectedItem: Node | null;
  permissions: Record<string, FilePermission>;
  deviators: string[];
  setDeviators: (deviators: string[]) => void;
  onPermissionChange: (id: string, permissions: Partial<FilePermission>) => void;
  parentPermissions?: FilePermission;
  onNodeSelect: (node: Node) => void;
}

// Default permissions for files and folders
const DEFAULT_FILE_PERMISSIONS: FilePermission = {
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

const DEFAULT_FOLDER_PERMISSIONS: FilePermission = {
  allowUploads: false,
  addComments: false,
  viewComments: true,
  viewTags: true,
  addTags: false,
  canQuery: false,
  isVisible: true,
  moveAccess: false,
  renameAccess: false,
  deleteAccess: false,
  editAccess: false
};

const FileSpecificPermissionPanel: React.FC<FileSpecificPermissionPanelProps> = ({
  selectedItem,
  permissions,
  deviators,
  setDeviators,
  onPermissionChange,
  parentPermissions,
  onNodeSelect
}) => {
  const {
    selectedItems,
    setSelectedItems,
    selectedNodeId,
    setSelectedNodeId,
    folderStructure
  } = useFolderStructureStore();

  if (!selectedItem) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="bg-gray-100 dark:bg-gray-800 h-12 w-12 rounded-full flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium mb-2">No item selected</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a file or folder to configure its permissions
        </p>
      </div>
    );
  }

  const isFolder = selectedItem.isFolder;
  const itemId = selectedItem.id;
  if (!itemId) {
    return null;
  }

  const currentPermissions = permissions[itemId] || (isFolder ? DEFAULT_FOLDER_PERMISSIONS : DEFAULT_FILE_PERMISSIONS);
  const isDeviating = deviators.includes(itemId);

  const checkForDeviations = (newPermissions: FilePermission): boolean => {
    if (!parentPermissions) {
      return false; // If no parent, no deviation
    }

    // Check each permission against parent
    return Object.entries(newPermissions).some(([key, value]) => {
      const parentValue = parentPermissions[key as keyof FilePermission];
      return parentValue !== undefined && parentValue !== value;
    });
  };

  const findVisibleFileChildren = (folderId: string): string[] => {
    if (!selectedItem?.nodes) return [];

    console.log('selectedItem.nodes', selectedItem.nodes);
    console.log('permissions', permissions);
    return selectedItem.nodes
      .filter(node => !node.isFolder && node.id && permissions[node.id]?.isVisible)
      .map(node => node.id as string);
  };

  const handlePermissionChange = (key: keyof FilePermission, value: boolean) => {
    // If visibility is off, only allow toggling visibility
    if (!currentPermissions.isVisible && key !== 'isVisible') {
      return;
    }

    const newPermissions = { ...currentPermissions, [key]: value };
    onPermissionChange(itemId, newPermissions);

    // If this is a folder and we're changing a child file permission,
    // propagate the change to all visible file children
    if (isFolder && isChildFilePermission(key)) {
      const visibleFileChildren = findVisibleFileChildren(itemId);
      visibleFileChildren.forEach(fileId => {
        onPermissionChange(fileId, { [key]: value });
      });
    }

    // Find all deviators in the folder structure
    const newDeviators = findDeviators(folderStructure, permissions);
    setDeviators(newDeviators);

    // If we're changing visibility, update the selectedItems state
    if (key === 'isVisible' && selectedItem) {
      handleCheckboxSelect(
        selectedItem,
        value,
        selectedItems,
        setSelectedItems,
        setSelectedNodeId,
        folderStructure,
        onNodeSelect
      );
    }
  };

  const isChildFilePermission = (key: keyof FilePermission): boolean => {
    const childFilePermissions: (keyof FilePermission)[] = [
      'viewAccess',
      'editAccess',
      'deleteAccess',
      'moveAccess',
      'renameAccess',
      'watermarkContent',
      'viewComments',
      'addComments',
      'viewTags',
      'addTags',
      'canQuery'
    ];
    return childFilePermissions.includes(key);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        {isFolder ? (
          <FolderOpen className="h-5 w-5 text-gray-500" />
        ) : (
          <FileText className="h-5 w-5 text-gray-500" />
        )}
        <h3 className="text-lg font-medium">{selectedItem.name}</h3>
        {isDeviating && (
          <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
            Custom Permissions
          </span>
        )}
      </div>

      <Separator />

      <div className="space-y-6">
        {/* Visibility Toggle - Always First */}
        <div className="flex items-center justify-between">
          <Label htmlFor="isVisible">Visibility</Label>
          <Switch
            id="isVisible"
            checked={currentPermissions.isVisible}
            onCheckedChange={(checked) => handlePermissionChange('isVisible', checked)}
          />
        </div>

        <Separator />

        {isFolder ? (
          // Folder Permissions
          <>
            {/* Folder Permissions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500">FOLDER PERMISSIONS</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowUploads">Upload to folders</Label>
                  <Switch
                    id="allowUploads"
                    checked={currentPermissions.allowUploads}
                    onCheckedChange={(checked) => handlePermissionChange('allowUploads', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="deleteAccess">Delete folder contents</Label>
                  <Switch
                    id="deleteAccess"
                    checked={currentPermissions.deleteAccess}
                    onCheckedChange={(checked) => handlePermissionChange('deleteAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="moveAccess">Move folder contents</Label>
                  <Switch
                    id="moveAccess"
                    checked={currentPermissions.moveAccess}
                    onCheckedChange={(checked) => handlePermissionChange('moveAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="renameAccess">Rename folder contents</Label>
                  <Switch
                    id="renameAccess"
                    checked={currentPermissions.renameAccess}
                    onCheckedChange={(checked) => handlePermissionChange('renameAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="viewComments">View comments</Label>
                  <Switch
                    id="viewComments"
                    checked={currentPermissions.viewComments}
                    onCheckedChange={(checked) => handlePermissionChange('viewComments', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="addComments">Add comments</Label>
                  <Switch
                    id="addComments"
                    checked={currentPermissions.addComments}
                    onCheckedChange={(checked) => handlePermissionChange('addComments', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="viewTags">View tags</Label>
                  <Switch
                    id="viewTags"
                    checked={currentPermissions.viewTags}
                    onCheckedChange={(checked) => handlePermissionChange('viewTags', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="addTags">Add tags</Label>
                  <Switch
                    id="addTags"
                    checked={currentPermissions.addTags}
                    onCheckedChange={(checked) => handlePermissionChange('addTags', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canQuery">AI Query Content</Label>
                  <Switch
                    id="canQuery"
                    checked={currentPermissions.canQuery}
                    onCheckedChange={(checked) => handlePermissionChange('canQuery', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Child File Permissions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500">CHILD FILE PERMISSIONS</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="viewAccess">View files</Label>
                  <Switch
                    id="viewAccess"
                    checked={currentPermissions.viewAccess}
                    onCheckedChange={(checked) => handlePermissionChange('viewAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="editAccess">Edit files</Label>
                  <Switch
                    id="editAccess"
                    checked={currentPermissions.editAccess}
                    onCheckedChange={(checked) => handlePermissionChange('editAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="deleteAccess">Delete files</Label>
                  <Switch
                    id="deleteAccess"
                    checked={currentPermissions.deleteAccess}
                    onCheckedChange={(checked) => handlePermissionChange('deleteAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="moveAccess">Move files</Label>
                  <Switch
                    id="moveAccess"
                    checked={currentPermissions.moveAccess}
                    onCheckedChange={(checked) => handlePermissionChange('moveAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="renameAccess">Rename files</Label>
                  <Switch
                    id="renameAccess"
                    checked={currentPermissions.renameAccess}
                    onCheckedChange={(checked) => handlePermissionChange('renameAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="watermarkContent">Apply watermark</Label>
                  <Switch
                    id="watermarkContent"
                    checked={currentPermissions.watermarkContent}
                    onCheckedChange={(checked) => handlePermissionChange('watermarkContent', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="viewComments">View comments</Label>
                  <Switch
                    id="viewComments"
                    checked={currentPermissions.viewComments}
                    onCheckedChange={(checked) => handlePermissionChange('viewComments', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="addComments">Add comments</Label>
                  <Switch
                    id="addComments"
                    checked={currentPermissions.addComments}
                    onCheckedChange={(checked) => handlePermissionChange('addComments', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="viewTags">View tags</Label>
                  <Switch
                    id="viewTags"
                    checked={currentPermissions.viewTags}
                    onCheckedChange={(checked) => handlePermissionChange('viewTags', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="addTags">Add tags</Label>
                  <Switch
                    id="addTags"
                    checked={currentPermissions.addTags}
                    onCheckedChange={(checked) => handlePermissionChange('addTags', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canQuery">AI Query Content</Label>
                  <Switch
                    id="canQuery"
                    checked={currentPermissions.canQuery}
                    onCheckedChange={(checked) => handlePermissionChange('canQuery', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          // File Permissions
          <>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500">FILE ACCESS PERMISSIONS</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="viewAccess">View file</Label>
                  <Switch
                    id="viewAccess"
                    checked={currentPermissions.viewAccess}
                    onCheckedChange={(checked) => handlePermissionChange('viewAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="editAccess">Edit file</Label>
                  <Switch
                    id="editAccess"
                    checked={currentPermissions.editAccess}
                    onCheckedChange={(checked) => handlePermissionChange('editAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="deleteAccess">Delete file</Label>
                  <Switch
                    id="deleteAccess"
                    checked={currentPermissions.deleteAccess}
                    onCheckedChange={(checked) => handlePermissionChange('deleteAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="moveAccess">Move file</Label>
                  <Switch
                    id="moveAccess"
                    checked={currentPermissions.moveAccess}
                    onCheckedChange={(checked) => handlePermissionChange('moveAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="renameAccess">Rename file</Label>
                  <Switch
                    id="renameAccess"
                    checked={currentPermissions.renameAccess}
                    onCheckedChange={(checked) => handlePermissionChange('renameAccess', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500">FILE SPECIAL SETTINGS</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="watermarkContent">Apply watermark</Label>
                  <Switch
                    id="watermarkContent"
                    checked={currentPermissions.watermarkContent}
                    onCheckedChange={(checked) => handlePermissionChange('watermarkContent', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="viewComments">View comments</Label>
                  <Switch
                    id="viewComments"
                    checked={currentPermissions.viewComments}
                    onCheckedChange={(checked) => handlePermissionChange('viewComments', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="addComments">Add comments</Label>
                  <Switch
                    id="addComments"
                    checked={currentPermissions.addComments}
                    onCheckedChange={(checked) => handlePermissionChange('addComments', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="viewTags">View tags</Label>
                  <Switch
                    id="viewTags"
                    checked={currentPermissions.viewTags}
                    onCheckedChange={(checked) => handlePermissionChange('viewTags', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="addTags">Add tags</Label>
                  <Switch
                    id="addTags"
                    checked={currentPermissions.addTags}
                    onCheckedChange={(checked) => handlePermissionChange('addTags', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="canQuery">AI Query Content</Label>
                  <Switch
                    id="canQuery"
                    checked={currentPermissions.canQuery}
                    onCheckedChange={(checked) => handlePermissionChange('canQuery', checked)}
                    disabled={!currentPermissions.isVisible}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileSpecificPermissionPanel;
