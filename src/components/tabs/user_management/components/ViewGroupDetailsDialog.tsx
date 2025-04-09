import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PermissionGroup } from '../CollaboratorsTypes';

interface ViewGroupDetailsDialogProps {
  isOpen: boolean;
  group: PermissionGroup | null;
  onClose: () => void;
}

export const ViewGroupDetailsDialog: React.FC<ViewGroupDetailsDialogProps> = ({
  isOpen,
  group,
  onClose
}) => {
  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl dark:bg-darkbg overflow-auto max-h-[90vh] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold dark:text-white">
            {group?.name} Details <span className="text-xs font-normal ml-2 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Default Role</span>
          </DialogTitle>
        </DialogHeader>
          
        <div className="py-4 space-y-6">
          <div>
            <label className="text-sm font-medium dark:text-gray-200 mb-1 block">Group Name</label>
            <Input
              value={group?.name || ''}
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
                      checked={group?.defaultFilePerms.viewAccess}
                      disabled
                    />
                    <label htmlFor="view-general-file-view-access" className="text-xs font-medium leading-none dark:text-gray-300">
                      View files
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-general-file-download" 
                      checked={group?.defaultFilePerms.downloadAccess}
                      disabled
                    />
                    <label htmlFor="view-general-file-download" className="text-xs font-medium leading-none dark:text-gray-300">
                      Download files
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-general-file-watermark" 
                      checked={group?.defaultFilePerms.watermarkContent}
                      disabled
                    />
                    <label htmlFor="view-general-file-watermark" className="text-xs font-medium leading-none dark:text-gray-300">
                      Apply watermark
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-general-file-delete-edit" 
                      checked={group?.defaultFilePerms.deleteEditAccess}
                      disabled
                    />
                    <label htmlFor="view-general-file-delete-edit" className="text-xs font-medium leading-none dark:text-gray-300">
                      Delete/edit files
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-general-file-view-comments" 
                      checked={group?.defaultFilePerms.viewComments}
                      disabled
                    />
                    <label htmlFor="view-general-file-view-comments" className="text-xs font-medium leading-none dark:text-gray-300">
                      View comments
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-general-file-add-comments" 
                      checked={group?.defaultFilePerms.addComments}
                      disabled
                    />
                    <label htmlFor="view-general-file-add-comments" className="text-xs font-medium leading-none dark:text-gray-300">
                      Add comments
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-general-file-view-tags" 
                      checked={group?.defaultFilePerms.viewTags}
                      disabled
                    />
                    <label htmlFor="view-general-file-view-tags" className="text-xs font-medium leading-none dark:text-gray-300">
                      View tags
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-general-folder-view-contents" 
                      checked={group?.defaultFolderPerms.viewContents}
                      disabled
                    />
                    <label htmlFor="view-general-folder-view-contents" className="text-xs font-medium leading-none dark:text-gray-300">
                      View folder contents
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="view-general-folder-allow-uploads" 
                      checked={group?.defaultFolderPerms.allowUploads}
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
                    checked={group?.canQuery}
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
                    checked={group?.canOrganize}
                    disabled
                  />
                  <label htmlFor="view-can-organize" className="text-xs font-medium leading-none dark:text-gray-300">
                    Organize files and folders
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="view-can-view-audit" 
                    checked={group?.canViewAuditLogs}
                    disabled
                  />
                  <label htmlFor="view-can-view-audit" className="text-xs font-medium leading-none dark:text-gray-300">
                    View audit logs
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="view-can-create-permission-groups" 
                    checked={group?.canCreatePermissionGroups}
                    disabled
                  />
                  <label htmlFor="view-can-create-permission-groups" className="text-xs font-medium leading-none dark:text-gray-300">
                    Create permission groups
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="view-can-delete-dataroom" 
                    checked={group?.canDeleteDataroom}
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
                        checked={group?.canInviteUsers.includes('READ')}
                        disabled
                      />
                      <label htmlFor="view-invite-read" className="text-xs dark:text-gray-300">Viewer</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-invite-write" 
                        checked={group?.canInviteUsers.includes('WRITE')}
                        disabled
                      />
                      <label htmlFor="view-invite-write" className="text-xs dark:text-gray-300">Editor</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="view-invite-admin" 
                        checked={group?.canInviteUsers.includes('ADMIN')}
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
                    checked={group?.canUseQA}
                    disabled
                  />
                  <label htmlFor="view-can-read-qa" className="text-xs font-medium leading-none dark:text-gray-300">
                    Read Q&A
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="view-can-answer-qa" 
                    checked={group?.canReadAnswerQuestions}
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
            onClick={onClose}
            className="dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 