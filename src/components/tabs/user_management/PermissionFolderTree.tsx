import { useState, useEffect } from "react";
import type { FilePermission, FileTreeItem as FileTreeItemType } from "./CollaboratorsTypes";
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