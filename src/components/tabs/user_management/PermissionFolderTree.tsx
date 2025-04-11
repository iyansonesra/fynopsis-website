import { useState, useEffect } from "react";
import type { FilePermission, FileTreeItem as FileTreeItemType, FolderPermission } from "./CollaboratorsTypes";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight, Folder, File } from "lucide-react";

// Completely rewrite the tree and permission handling to use a simpler approach
export const FolderPermissionTree = ({
    folderStructure,
    selectedPermissions,
    onPermissionChange,
    selectedItem,
    onSelectItem,
    itemsMap,
    parentMap
  }: {
    folderStructure: FileTreeItemType[];
    selectedPermissions: Record<string, FilePermission>;
    onPermissionChange: (id: string, permissions: Partial<FilePermission>) => void;
    selectedItem: string | null;
    onSelectItem: (id: string) => void;
    itemsMap: Record<string, FileTreeItemType>;
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
export const FileTreeItem = ({
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
    item: FileTreeItemType;
    level: number;
    selectedPermissions: Record<string, FilePermission>;
    onPermissionChange: (itemId: string, permissions: Partial<FilePermission>) => void;
    selectedItem: string | null;
    onSelectItem: (id: string) => void;
    isExpanded: boolean; 
    onToggleExpand: (folderId: string) => void; 
    expandedFolders: Set<string>; 
    itemsMap: Record<string, FileTreeItemType>;
    parentMap: Record<string, string | undefined>;
  }) => {
    const isSelectedForHighlight = selectedItem === item.id;
    const itemPermissions = selectedPermissions[item.id] || { show: true };
    const isCustomized = itemPermissions.isCustomized === true;
  
    const handleToggleExpandClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(item.id);
    };
  
    const handleSelect = () => {
      onSelectItem(item.id);
    };
  
    const handleCheckboxClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      // First, update the permission
      onPermissionChange(item.id, { show: !itemPermissions.show });
      
      // Then select the item to show its permissions panel
      onSelectItem(item.id);
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
          <div className="flex items-center mr-1 relative" onClick={(e) => e.stopPropagation()}>
            {/* Custom permission indicator */}
            {isCustomized && item.type === 'file' && (
              <div className="absolute w-2 h-2 rounded-full bg-yellow-400 left-0 top-1/2 transform -translate-y-1/2 -translate-x-3"></div>
            )}
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
            {item.children.map((child: FileTreeItemType) => {
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

export const ItemPermissionsPanel: React.FC<{
    selectedItemId: string | null;
    selectedItemIsFolder: boolean | null;
    selectedItemName: string | null;
    permissions: Record<string, FilePermission>;
    onPermissionChange: (id: string, permissions: Partial<FilePermission>) => void;
    itemsMap?: Record<string, FileTreeItemType>;
    parentMap?: Record<string, string | undefined>;
  }> = ({ 
    selectedItemId, 
    selectedItemIsFolder,
    selectedItemName,
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
    const isFolder = selectedItemIsFolder === true;
    const isVisible = itemPermissions.isVisible !== false;
    const isCustomFile = !isFolder && (customPermissionFiles.has(selectedItemId) || itemPermissions.isCustomized === true);
    
    // Find the parent folder using the parentMap
    const getParentFolderId = (): string | null => {
      if (!selectedItemId || !parentMap) return null;
      return parentMap[selectedItemId] || null;
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
      if (selectedItemId) {
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
              newSet.add(selectedItemId);
              return newSet;
            });
          }
        } else {
          // For folders, update visibility and apply to child files
          onPermissionChange(selectedItemId, { 
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
      if (selectedItemId && !isFolder) {
        // Mark this file as having custom permissions - always do this when any permission changes
        // This ensures that even changes to the 'show' field will mark the file as customized
        const wasAlreadyCustomized = customPermissionFiles.has(selectedItemId) || itemPermissions.isCustomized === true;
        
        if (!wasAlreadyCustomized) {
          // Add to our tracked set of custom permission files
          setCustomPermissionFiles(prev => {
            const newSet = new Set(prev);
            newSet.add(selectedItemId);
            return newSet;
          });
        }
        
        // Always set the isCustomized flag to true in the permissions object
        onPermissionChange(selectedItemId, {
          ...update,
          isCustomized: true
        });
      }
    };

    const handleFolderPermissionChange = (update: Partial<FolderPermission>) => {
      if (selectedItemId && isFolder) {
        onPermissionChange(selectedItemId, { 
          folderPerms: {
            ...(itemPermissions.folderPerms || DEFAULT_FOLDER_PERMISSIONS),
            ...update
          }
        });
      }
    };

    const handleChildFilePermissionChange = (update: Partial<FilePermission>) => {
      if (selectedItemId && isFolder) {
        // Ensure we merge the update with the *current* childFilePerms template,
        // using defaults only if the template doesn't exist yet.
        const currentChildPerms = itemPermissions.childFilePerms || {}; // Start with existing or empty
        const newChildPerms = {
          ...DEFAULT_FILE_PERMISSIONS, // Start with base defaults
          ...currentChildPerms,       // Override with current template values
          ...update                  // Apply the specific change
        };

        onPermissionChange(selectedItemId, { 
          childFilePerms: newChildPerms
        });
      }
    };
    
    // Function to reset custom file permissions and use parent folder's settings
    const resetToFolderDefaults = () => {
      if (!selectedItemId || isFolder) return;
      
      // First, find the parent folder
      const parentFolderId = parentMap?.[selectedItemId];
      
      // Remove the file from the custom permissions set
      setCustomPermissionFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedItemId);
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
      onPermissionChange(selectedItemId, resetPerms);
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
          {selectedItemName || 'Item'} Permissions {isFolder ? '(Folder)' : '(File)'}
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
                id={`${selectedItemId}-panel-show`}
                checked={isVisible}
                onCheckedChange={handleVisibilitySwitchChange}
              />
              <label htmlFor={`${selectedItemId}-panel-show`} className="text-sm">
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
                      id={`${selectedItemId}-panel-view`}
                      checked={isVisible && getFilePermission('viewAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ viewAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-view`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View content
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-download`}
                      checked={isVisible && getFilePermission('downloadAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ downloadAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-download`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Download
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-edit`}
                      checked={isVisible && getFilePermission('editAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ editAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-edit`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Edit
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-delete`}
                      checked={isVisible && getFilePermission('deleteAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ deleteAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-delete`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Delete
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-move`}
                      checked={isVisible && getFilePermission('moveAccess')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ moveAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-move`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
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
                      id={`${selectedItemId}-panel-watermark`}
                      checked={isVisible && getFilePermission('watermarkContent')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ watermarkContent: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-watermark`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Apply watermark
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-viewtags`}
                      checked={isVisible && getFilePermission('viewTags')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ viewTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-viewtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View tags
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-addtags`}
                      checked={isVisible && getFilePermission('addTags')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ addTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-addtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-viewcomments`}
                      checked={isVisible && getFilePermission('viewComments')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ viewComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-viewcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-addcomments`}
                      checked={isVisible && getFilePermission('addComments')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ addComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-addcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-canquery`}
                      checked={isVisible && getFilePermission('canQuery')}
                      onCheckedChange={(checked) => 
                        handleFilePermissionChange({ canQuery: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-canquery`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
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
                      id={`${selectedItemId}-panel-viewcontents`}
                      checked={isVisible && getFolderPermission('viewContents')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ viewContents: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-viewcontents`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View folder contents
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-createfolders`}
                      checked={isVisible && getFolderPermission('createFolders')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ createFolders: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-createfolders`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Create folders
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-allowuploads`}
                      checked={isVisible && getFolderPermission('allowUploads')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ allowUploads: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-allowuploads`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Allow uploads
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-movecontents`}
                      checked={isVisible && getFolderPermission('moveContents')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ moveContents: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-movecontents`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Move folder contents
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-deletecontents`}
                      checked={isVisible && getFolderPermission('deleteContents')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ deleteContents: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-deletecontents`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Delete folder contents
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-folder-viewtags`}
                      checked={isVisible && getFolderPermission('viewTags')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ viewTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-folder-viewtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-folder-addtags`}
                      checked={isVisible && getFolderPermission('addTags')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ addTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-folder-addtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-folder-viewcomments`}
                      checked={isVisible && getFolderPermission('viewComments')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ viewComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-folder-viewcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-folder-addcomments`}
                      checked={isVisible && getFolderPermission('addComments')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ addComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-folder-addcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-folder-canquery`}
                      checked={isVisible && getFolderPermission('canQuery')}
                      onCheckedChange={(checked) => 
                        handleFolderPermissionChange({ canQuery: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-folder-canquery`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
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
                      id={`${selectedItemId}-panel-child-view`}
                      checked={isVisible && getChildFilePermission('viewAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ viewAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-view`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View content
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-download`}
                      checked={isVisible && getChildFilePermission('downloadAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ downloadAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-download`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Download
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-edit`}
                      checked={isVisible && getChildFilePermission('editAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ editAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-edit`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Edit
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-delete`}
                      checked={isVisible && getChildFilePermission('deleteAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ deleteAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-delete`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Delete
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-watermark`}
                      checked={isVisible && getChildFilePermission('watermarkContent')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ watermarkContent: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-watermark`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Apply watermark
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-viewtags`}
                      checked={isVisible && getChildFilePermission('viewTags')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ viewTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-viewtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-addtags`}
                      checked={isVisible && getChildFilePermission('addTags')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ addTags: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-addtags`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-viewcomments`}
                      checked={isVisible && getChildFilePermission('viewComments')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ viewComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-viewcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      View comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-addcomments`}
                      checked={isVisible && getChildFilePermission('addComments')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ addComments: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-addcomments`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      Add comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-canquery`}
                      checked={isVisible && getChildFilePermission('canQuery')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ canQuery: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-canquery`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
                      AI Query Content
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`${selectedItemId}-panel-child-moveaccess`}
                      checked={isVisible && getChildFilePermission('moveAccess')}
                      onCheckedChange={(checked) => 
                        handleChildFilePermissionChange({ moveAccess: checked })}
                      disabled={!isVisible}
                    />
                    <label htmlFor={`${selectedItemId}-panel-child-moveaccess`} className={`text-sm transition-colors ${!isVisible ? 'text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}>
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