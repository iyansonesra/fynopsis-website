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
  }> = ({ 
    selectedItemId, 
    selectedItemIsFolder,
    selectedItemName,
    permissions, 
    onPermissionChange 
  }) => {
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
        onPermissionChange(selectedItemId, { 
          isVisible: checked,
          show: checked
        });
      }
    };
  
    const handleFilePermissionChange = (update: Partial<FilePermission>) => {
      if (selectedItemId && !isFolder) {
        onPermissionChange(selectedItemId, update);
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
        onPermissionChange(selectedItemId, { 
          childFilePerms: {
            ...(itemPermissions.childFilePerms || DEFAULT_FILE_PERMISSIONS),
            ...update
          }
        });
      }
    };

    const getFilePermission = (key: keyof typeof DEFAULT_FILE_PERMISSIONS) => {
      if (!isFolder) {
          return itemPermissions[key] !== undefined ? itemPermissions[key] : DEFAULT_FILE_PERMISSIONS[key];
      }
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
          
          {!isFolder && (
            <>
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