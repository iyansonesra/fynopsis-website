import React from 'react';
import { Plus, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PermissionGroupDialog } from './PermissionGroupDialog';
import type { FilePermission, FileTreeItem as FileTreeItemType, PermissionGroup } from '../CollaboratorsTypes';

interface PermissionGroupsTabContentProps {
  permissionGroups: PermissionGroup[];
  isLoadingGroups: boolean;
  allGroupsToDisplay: PermissionGroup[];
  isCreateGroupDialogOpen: boolean;
  setIsCreateGroupDialogOpen: (isOpen: boolean) => void;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  newGroup: PermissionGroup;
  setNewGroup: (group: PermissionGroup | ((prev: PermissionGroup) => PermissionGroup)) => void;
  handleCreatePermissionGroup: () => Promise<void>;
  isCreatingGroup: boolean;
  folderStructure: FileTreeItemType[];
  dialogItemsMap: Record<string, FileTreeItemType>;
  dialogParentMap: Record<string, string | undefined>;
  handleFilePermissionChange: (fileId: string, permissionUpdate: Partial<FilePermission>) => void;
  handleViewGroupDetails: (group: PermissionGroup) => void;
}

export const PermissionGroupsTabContent: React.FC<PermissionGroupsTabContentProps> = ({
  permissionGroups,
  isLoadingGroups,
  allGroupsToDisplay,
  isCreateGroupDialogOpen,
  setIsCreateGroupDialogOpen,
  newGroupName,
  setNewGroupName,
  newGroup,
  setNewGroup,
  handleCreatePermissionGroup,
  isCreatingGroup,
  folderStructure,
  dialogItemsMap,
  dialogParentMap,
  handleFilePermissionChange,
  handleViewGroupDetails
}) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-lg font-bold">Permission Groups</CardTitle>
          <Button 
            onClick={() => setIsCreateGroupDialogOpen(true)}
            size="sm"
            className="flex gap-1 items-center"
          >
            <Plus className="h-4 w-4" /> Create Group
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingGroups ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading permission groups...</p>
            </div>
          ) : allGroupsToDisplay.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-md">
              <p className="text-gray-500 dark:text-gray-400">No permission groups found.</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Click &quot;Create Group&quot; to add a custom permission group.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {allGroupsToDisplay.map((group) => (
                <AccordionItem key={group.id} value={group.id}>
                  <AccordionTrigger className="hover:bg-gray-50 px-4 py-3 dark:hover:bg-gray-800">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{group.name}</span>
                        {group.isDefault && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded dark:bg-blue-900/50 dark:text-blue-300">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 py-2">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <h4 className="font-medium mb-1">General Permissions</h4>
                          <ul className="space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
                            <li>
                              Full Access: {group.allAccess ? 'Yes' : 'No'}
                            </li>
                            <li>
                              Can Query: {group.canQuery ? 'Yes' : 'No'}
                            </li>
                            <li>
                              Can Organize: {group.canOrganize ? 'Yes' : 'No'}
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Default File Permissions</h4>
                          <ul className="space-y-1 list-disc list-inside text-gray-600 dark:text-gray-400">
                            <li>
                              View Access: {group.defaultFilePerms.viewAccess ? 'Yes' : 'No'}
                            </li>
                            <li>
                              Download: {group.defaultFilePerms.downloadAccess ? 'Yes' : 'No'}
                            </li>
                            <li>
                              Edit/Delete: {group.defaultFilePerms.deleteEditAccess ? 'Yes' : 'No'}
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewGroupDetails(group);
                          }}
                        >
                          <Settings className="h-3.5 w-3.5" /> View Details
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <PermissionGroupDialog
        isOpen={isCreateGroupDialogOpen}
        onClose={() => setIsCreateGroupDialogOpen(false)}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        newGroup={newGroup}
        setNewGroup={setNewGroup}
        onCreateGroup={handleCreatePermissionGroup}
        isCreatingGroup={isCreatingGroup}
        folderStructure={folderStructure}
        dialogItemsMap={dialogItemsMap}
        dialogParentMap={dialogParentMap}
        onFilePermissionChange={handleFilePermissionChange}
      />
    </div>
  );
}; 