import { useState, useEffect } from "react";
import type { FilePermission, FileTreeItem as FileTreeItemType } from "./CollaboratorsTypes";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight, Folder, File } from "lucide-react";

import { Node } from "./static_folder_tree/static-folder-tree";
export const ItemPermissionsPanel: React.FC<{
    selectedItem: Node | null;
    permissions: Record<string, FilePermission>;
    onPermissionChange: (id: string, permissions: Partial<FilePermission>) => void;
    itemsMap?: Record<string, FileTreeItemType>;
    parentMap?: Record<string, string | undefined>;
  }> = ({ 
    selectedItem, 
    permissions, 
    onPermissionChange,
    itemsMap,
    parentMap
  }) => {
    // Track which files have custom permissions that override their parent folder's settings
    const [customPermissionFiles, setCustomPermissionFiles] = useState<Set<string>>(new Set());
    
    // Initialize customPermissionFiles from permissions when component mounts
    useEffect(() => {
      // Find all files marked as customized and add them to the set
      const customizedFiles = new Set<string>();
      
      Object.entries(permissions).forEach(([id, perm]) => {
        // Consider a file customized if it has the isCustomized flag explicitly set to true
        if (perm.isCustomized === true) {
          customizedFiles.add(id);
          console.log(`Found custom file: ${id}`, perm);
        }
      });
      
      console.log(`Initialized ${customizedFiles.size} custom permission files`);
      setCustomPermissionFiles(customizedFiles);
    }, [permissions]);
    
    if (!selectedItem?.id) {
      return (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md h-full flex items-center justify-center min-h-[500px]">
          <p className="text-center text-gray-500 dark:text-gray-400">
            Select a file or folder to view and edit its permissions
          </p>
        </div>
      );
    }
  
    const itemPermissions = permissions[selectedItem.id] || {};
    const isFolder = selectedItem.isFolder === true;
    const isVisible = itemPermissions.isVisible !== false;
    const isCustomFile = !isFolder && (customPermissionFiles.has(selectedItem.id) || itemPermissions.isCustomized === true);
    
    // Find the parent folder using the parentMap
    const getParentFolderId = (): string | null => {
      if (!selectedItem.id || !parentMap) return null;
      return parentMap[selectedItem.id] || null;
    };
    
    // Get the parent folder's childFilePerms
    const getParentFolderChildFilePerms = (): Partial<FilePermission> | null => {
      const parentId = getParentFolderId();
      if (!parentId) return null;
      
      const parentPerms = permissions[parentId];
      if (!parentPerms) return null;
      
      // Log parent folder permissions for debugging
      console.log(`Getting parent folder ${parentId} childFilePerms:`, parentPerms.childFilePerms);
      
      return parentPerms?.childFilePerms || null;
    };

    // Define default templates for file and folder permissions
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

    const handleVisibilitySwitchChange = (checked: boolean) => {
      if (selectedItem.id) {
        if (!isFolder) {
          // For files, we need to respect whether it's a custom file or not
          if (isCustomFile) {
            // If it's already a custom file, just update the visibility
            handleFilePermissionChange({ 
              isVisible: checked,
              show: checked
            });
          } else {
            // If it's not a custom file yet, make it one when changing visibility
            // This is important - changing visibility should make it a custom file
            handleFilePermissionChange({ 
              isVisible: checked,
              show: checked,
              isCustomized: true
            });
            
            // Also add it to our set of custom files
            setCustomPermissionFiles(prev => {
              const newSet = new Set(prev);
              newSet.add(selectedItem.id);
              return newSet;
            });
          }
        } else {
          // For folders, update visibility and apply to child files
          onPermissionChange(selectedItem.id, { 
            isVisible: checked,
            show: checked,
            // Also update childFilePerms to ensure inheritance works properly
            childFilePerms: {
              ...(itemPermissions.childFilePerms || {}),
              isVisible: checked,
              show: checked
            }
          });
        }
      }
    };
  
    const handleFilePermissionChange = (update: Partial<FilePermission>) => {
      if (selectedItem.id && !isFolder) {
        // Mark this file as having custom permissions - always do this when any permission changes
        // This ensures that even changes to the 'show' field will mark the file as customized
        const wasAlreadyCustomized = customPermissionFiles.has(selectedItem.id) || itemPermissions.isCustomized === true;
        
        if (!wasAlreadyCustomized) {
          // Add to our tracked set of custom permission files
          setCustomPermissionFiles(prev => {
            const newSet = new Set(prev);
            newSet.add(selectedItem.id);
            return newSet;
          });
        }
        
        // Always set the isCustomized flag to true in the permissions object
        onPermissionChange(selectedItem.id, {
          ...update,
          isCustomized: true
        });
      }
    };

    const handleFolderPermissionChange = (update: Partial<FolderPermission>) => {
      if (selectedItem.id && isFolder) {
        onPermissionChange(selectedItem.id, { 
          folderPerms: {
            ...(itemPermissions.folderPerms || DEFAULT_FOLDER_PERMISSIONS),
            ...update
          }
        });
      }
    };

    const handleChildFilePermissionChange = (update: Partial<FilePermission>) => {
      if (selectedItem.id && isFolder) {
        // Ensure we merge the update with the *current* childFilePerms template,
        // using defaults only if the template doesn't exist yet.
        const currentChildPerms = itemPermissions.childFilePerms || {}; // Start with existing or empty
        const newChildPerms = {
          ...DEFAULT_FILE_PERMISSIONS, // Start with base defaults
          ...currentChildPerms,       // Override with current template values
          ...update                  // Apply the specific change
        };

        onPermissionChange(selectedItem.id, { 
          childFilePerms: newChildPerms
        });
      }
    };
    
    // Function to reset custom file permissions and use parent folder's settings
    const resetToFolderDefaults = () => {
      if (!selectedItem.id || isFolder) return;
      
      // First, find the parent folder
      const parentFolderId = parentMap?.[selectedItem.id];
      
      // Remove the file from the custom permissions set
      setCustomPermissionFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedItem.id);
        return newSet;
      });
      
      // Get the parent folder's permissions to apply
      let parentChildFilePerms: Partial<FilePermission> | null = null;
      
      // If we have a parent ID and it has permissions with childFilePerms set
      if (parentFolderId && permissions[parentFolderId]?.childFilePerms) {
        parentChildFilePerms = permissions[parentFolderId].childFilePerms;
      }
      
      // Reset the custom flag and apply parent folder's permissions
      const resetPerms: Partial<FilePermission> = {
        isCustomized: false,
        // Explicitly reset visibility to match parent folder's settings
        isVisible: parentChildFilePerms?.isVisible !== undefined ? parentChildFilePerms.isVisible : true,
        show: parentChildFilePerms?.show !== undefined ? parentChildFilePerms.show : true,
      };
      
      // Add all other permissions from parent's childFilePerms if available
      if (parentChildFilePerms) {
        // Copy specific permissions from parent
        if (parentChildFilePerms.viewAccess !== undefined) resetPerms.viewAccess = parentChildFilePerms.viewAccess;
        if (parentChildFilePerms.watermarkContent !== undefined) resetPerms.watermarkContent = parentChildFilePerms.watermarkContent;
        if (parentChildFilePerms.deleteAccess !== undefined) resetPerms.deleteAccess = parentChildFilePerms.deleteAccess;
        if (parentChildFilePerms.editAccess !== undefined) resetPerms.editAccess = parentChildFilePerms.editAccess;
        if (parentChildFilePerms.viewComments !== undefined) resetPerms.viewComments = parentChildFilePerms.viewComments;
        if (parentChildFilePerms.addComments !== undefined) resetPerms.addComments = parentChildFilePerms.addComments;
        if (parentChildFilePerms.downloadAccess !== undefined) resetPerms.downloadAccess = parentChildFilePerms.downloadAccess;
        if (parentChildFilePerms.viewTags !== undefined) resetPerms.viewTags = parentChildFilePerms.viewTags;
        if (parentChildFilePerms.addTags !== undefined) resetPerms.addTags = parentChildFilePerms.addTags;
        if (parentChildFilePerms.canQuery !== undefined) resetPerms.canQuery = parentChildFilePerms.canQuery;
        if (parentChildFilePerms.moveAccess !== undefined) resetPerms.moveAccess = parentChildFilePerms.moveAccess;
        if (parentChildFilePerms.renameAccess !== undefined) resetPerms.renameAccess = parentChildFilePerms.renameAccess;
      }
      
      // Update the file's permissions
      onPermissionChange(selectedItem.id, resetPerms);
    };

    // Helper functions to get current permissions
    const getFilePermission = (key: keyof typeof DEFAULT_FILE_PERMISSIONS) => {
      if (!isFolder) {
        // If this is a customized file, get its direct permissions
        if (isCustomFile) {
          // Directly return the file's permission or the default if not set
          return itemPermissions[key] !== undefined ? itemPermissions[key] : DEFAULT_FILE_PERMISSIONS[key];
        }
        
        // If NOT customized, strictly inherit from parent or global defaults
        const parentChildFilePerms = getParentFolderChildFilePerms();
        if (parentChildFilePerms && parentChildFilePerms[key] !== undefined) {
          // Inherit from parent's template
          return parentChildFilePerms[key];
        }
        
        // If parent template doesn't have the key, fall back to global default
        return DEFAULT_FILE_PERMISSIONS[key];
      }
      
      // This case should not be reached for files, but return default as a safety measure
      return DEFAULT_FILE_PERMISSIONS[key]; 
    };

    const getFolderPermission = (key: keyof typeof DEFAULT_FOLDER_PERMISSIONS) => {
      if (!isFolder) return DEFAULT_FOLDER_PERMISSIONS[key];
      const folderPerms = itemPermissions.folderPerms;
      if (!folderPerms) return DEFAULT_FOLDER_PERMISSIONS[key];
      return folderPerms[key] !== undefined ? folderPerms[key] : DEFAULT_FOLDER_PERMISSIONS[key];
    };

    const getChildFilePermission = (key: keyof typeof DEFAULT_FILE_PERMISSIONS) => {
      if (!isFolder) return DEFAULT_FILE_PERMISSIONS[key];
      const childPerms = itemPermissions.childFilePerms;
      if (!childPerms) return DEFAULT_FILE_PERMISSIONS[key];
      return childPerms[key] !== undefined ? childPerms[key] : DEFAULT_FILE_PERMISSIONS[key];
    };
  
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md h-full overflow-auto min-h-[600px]">
        <h3 className="font-medium text-sm mb-3 dark:text-white">
          {selectedItem?.name || 'Item'} Permissions {isFolder ? '(Folder)' : '(File)'}
          {isCustomFile && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              Custom
            </span>
          )}
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Visibility</h4>
            <div className="flex items-center space-x-2 mb-2">
              <Switch 
                id={`${selectedItem.id}-panel-show`}
                checked={isVisible}
                onCheckedChange={handleVisibilitySwitchChange}
              />
              <label htmlFor={`${selectedItem.id}-panel-show`} className="text-sm">
                Visible to group members
              </label>
            </div>
          </div>

          {/* FILE PERMISSIONS */}
          {!isFolder && (
            <>
              {/* Custom permissions banner for files */}
              {isCustomFile ? (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Custom File Permissions</h4>
                      <p className="text-xs text-yellow-600">This file has custom permissions that override folder defaults</p>
                    </div>
                    <button 
                      onClick={resetToFolderDefaults}
                      className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded-md"
                    >
                      Reset to Folder Defaults
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Inheriting Folder Permissions</h4>
                      <p className="text-xs text-blue-600">This file follows the parent folder's default file permissions</p>
                    </div>
                    <p className="text-xs text-blue-600">
                      Edit any setting to customize
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">File Access Permissions</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-view`}
                      checked={isVisible && getFilePermission('viewAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ viewAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-view`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View content
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-download`}
                      checked={isVisible && getFilePermission('downloadAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ downloadAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-download`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Download
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-edit`}
                      checked={isVisible && getFilePermission('editAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ editAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-edit`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Edit
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-delete`}
                      checked={isVisible && getFilePermission('deleteAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ deleteAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-delete`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Delete
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-move`}
                      checked={isVisible && getFilePermission('moveAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ moveAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-move`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Move file
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">File Special Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-watermark`}
                      checked={isVisible && getFilePermission('watermarkContent')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ watermarkContent: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-watermark`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Apply watermark
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-viewtags`}
                      checked={isVisible && getFilePermission('viewTags')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ viewTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-viewtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View tags
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-addtags`}
                      checked={isVisible && getFilePermission('addTags')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ addTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-addtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-viewcomments`}
                      checked={isVisible && getFilePermission('viewComments')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ viewComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-viewcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-addcomments`}
                      checked={isVisible && getFilePermission('addComments')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ addComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-addcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-canquery`}
                      checked={isVisible && getFilePermission('canQuery')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ canQuery: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-canquery`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      AI Query Content
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* FOLDER PERMISSIONS */}
          {isFolder && (
            <>
              <div>
                <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Folder Permissions</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-viewcontents`}
                      checked={isVisible && getFolderPermission('viewContents')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ viewContents: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-viewcontents`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View folder contents
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-createfolders`}
                      checked={isVisible && getFolderPermission('createFolders')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ createFolders: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-createfolders`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Create folders
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-allowuploads`}
                      checked={isVisible && getFolderPermission('allowUploads')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ allowUploads: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-allowuploads`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Allow uploads
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-movecontents`}
                      checked={isVisible && getFolderPermission('moveContents')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ moveContents: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-movecontents`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Move folder contents
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-deletecontents`}
                      checked={isVisible && getFolderPermission('deleteContents')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ deleteContents: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-deletecontents`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Delete folder contents
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-folder-viewtags`}
                      checked={isVisible && getFolderPermission('viewTags')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ viewTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-folder-viewtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-folder-addtags`}
                      checked={isVisible && getFolderPermission('addTags')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ addTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-folder-addtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-folder-viewcomments`}
                      checked={isVisible && getFolderPermission('viewComments')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ viewComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-folder-viewcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-folder-addcomments`}
                      checked={isVisible && getFolderPermission('addComments')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ addComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-folder-addcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-folder-canquery`}
                      checked={isVisible && getFolderPermission('canQuery')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ canQuery: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-folder-canquery`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      AI Query Content
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Child File Permissions</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  These permissions apply to all files within this folder.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-view`}
                      checked={isVisible && getChildFilePermission('viewAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ viewAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-view`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View content
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-download`}
                      checked={isVisible && getChildFilePermission('downloadAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ downloadAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-download`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Download
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-edit`}
                      checked={isVisible && getChildFilePermission('editAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ editAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-edit`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Edit
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-delete`}
                      checked={isVisible && getChildFilePermission('deleteAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ deleteAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-delete`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Delete
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-watermark`}
                      checked={isVisible && getChildFilePermission('watermarkContent')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ watermarkContent: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-watermark`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Apply watermark
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-viewtags`}
                      checked={isVisible && getChildFilePermission('viewTags')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ viewTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-viewtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-addtags`}
                      checked={isVisible && getChildFilePermission('addTags')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ addTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-addtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-viewcomments`}
                      checked={isVisible && getChildFilePermission('viewComments')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ viewComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-viewcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-addcomments`}
                      checked={isVisible && getChildFilePermission('addComments')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ addComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-addcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-canquery`}
                      checked={isVisible && getChildFilePermission('canQuery')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ canQuery: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-canquery`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      AI Query Content
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItem.id}-panel-child-moveaccess`}
                      checked={isVisible && getChildFilePermission('moveAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ moveAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItem.id}-panel-child-moveaccess`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Move files
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };