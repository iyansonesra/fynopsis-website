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
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PermissionGroup, FilePermission, FolderPermission } from '../CollaboratorsTypes';
import { cn } from "@/lib/utils"; // Import cn for conditional classes
import {
  FileText, FolderOpen, Users, Database, HelpCircle, 
  AlertCircle, CheckCircle, XCircle, FileWarning
} from 'lucide-react';

interface ViewGroupDetailsDialogProps {
  isOpen: boolean;
  group: PermissionGroup | null;
  onClose: () => void;
}

// Helper component to render permission switches in a consistent way
const PermissionSwitchDisplay: React.FC<{ id: string; label: string; checked?: boolean }> = ({ id, label, checked }) => (
  <div className="flex items-center space-x-2">
    <Switch 
      id={id} 
      checked={checked}
      disabled
      className="opacity-80" // Apply slight opacity to indicate disabled
    />
    <label htmlFor={id} className="text-xs font-medium leading-none dark:text-gray-300">
      {label}
    </label>
    {/* Optional: Add icons based on checked state */}
    {/* {checked ? <CheckCircle className="h-3 w-3 text-green-500 ml-1" /> : <XCircle className="h-3 w-3 text-red-500 ml-1" />} */}
  </div>
);

// Helper to display role list
const RoleListDisplay: React.FC<{ roles?: string[], title: string }> = ({ roles, title }) => (
  <div className="mt-2">
    <p className="text-xs font-medium mb-1 dark:text-gray-400">{title}</p>
    <div className="flex flex-wrap gap-1">
      {roles?.includes('*') ? (
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded dark:bg-blue-900/50 dark:text-blue-300">
          Any Role
        </span>
      ) : roles && roles.length > 0 ? (
        roles.map(role => (
          <span key={role} className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
            {role} 
          </span>
        ))
      ) : (
        <span className="text-xs text-gray-500 italic dark:text-gray-400">None specified</span>
      )}
    </div>
  </div>
);

export const ViewGroupDetailsDialog: React.FC<ViewGroupDetailsDialogProps> = ({
  isOpen,
  group,
  onClose
}) => {
  if (!group) return null;

  const renderFilePerms = (perms: PermissionGroup['defaultFilePerms']) => (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      <PermissionSwitchDisplay id="view-file-view" label="View files" checked={perms.viewAccess} />
      <PermissionSwitchDisplay id="view-file-download" label="Download files" checked={perms.downloadAccess} />
      <PermissionSwitchDisplay id="view-file-edit" label="Edit files" checked={perms.editAccess} />
      <PermissionSwitchDisplay id="view-file-delete" label="Delete files" checked={perms.deleteAccess} />
      <PermissionSwitchDisplay id="view-file-watermark" label="Apply watermark" checked={perms.watermarkContent} />
      <PermissionSwitchDisplay id="view-file-move" label="Move files" checked={perms.moveAccess} />
      <PermissionSwitchDisplay id="view-file-rename" label="Rename files" checked={perms.renameAccess} />
      <PermissionSwitchDisplay id="view-file-view-comments" label="View comments" checked={perms.viewComments} />
      <PermissionSwitchDisplay id="view-file-add-comments" label="Add comments" checked={perms.addComments} />
      <PermissionSwitchDisplay id="view-file-view-tags" label="View tags" checked={perms.viewTags} />
      <PermissionSwitchDisplay id="view-file-add-tags" label="Add tags" checked={perms.addTags} />
      <PermissionSwitchDisplay id="view-file-query" label="AI Query content" checked={perms.canQuery} />
      <PermissionSwitchDisplay id="view-file-visible" label="Is Visible" checked={perms.isVisible} />
      {/* Removed deleteEditAccess */}
    </div>
  );

  const renderFolderPerms = (perms: PermissionGroup['defaultFolderPerms']) => (
     <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      <PermissionSwitchDisplay id="view-folder-view-contents" label="View contents" checked={perms.viewContents} />
      <PermissionSwitchDisplay id="view-folder-create" label="Create folders" checked={perms.createFolders} />
      <PermissionSwitchDisplay id="view-folder-upload" label="Allow uploads" checked={perms.allowUploads} />
      <PermissionSwitchDisplay id="view-folder-delete" label="Delete contents" checked={perms.deleteContents} />
      <PermissionSwitchDisplay id="view-folder-move" label="Move contents" checked={perms.moveContents} />
      <PermissionSwitchDisplay id="view-folder-rename" label="Rename contents" checked={perms.renameContents} />
      <PermissionSwitchDisplay id="view-folder-view-comments" label="View comments" checked={perms.viewComments} />
      <PermissionSwitchDisplay id="view-folder-add-comments" label="Add comments" checked={perms.addComments} />
      <PermissionSwitchDisplay id="view-folder-view-tags" label="View tags" checked={perms.viewTags} />
      <PermissionSwitchDisplay id="view-folder-add-tags" label="Add tags" checked={perms.addTags} />
      <PermissionSwitchDisplay id="view-folder-query" label="AI Query content" checked={perms.canQuery} />
      <PermissionSwitchDisplay id="view-folder-visible" label="Is Visible" checked={perms.isVisible} />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl dark:bg-darkbg overflow-auto max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2 border-b dark:border-gray-700">
          <DialogTitle className="text-xl font-semibold dark:text-white flex items-center">
            {group?.name}
            {group?.isDefault && (
                <span className="text-xs font-normal ml-2 px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    Default Role
                </span>
            )}
          </DialogTitle>
        </DialogHeader>
          
        <div className="p-6 space-y-6">
           {/* Basic Info */}
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Group Name</label>
                <Input
                  value={group?.name || ''}
                  readOnly
                  disabled
                  className="dark:bg-slate-800 dark:text-white dark:border-gray-700 opacity-70 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Permission Mode</label>
                 <Input
                  value={group?.allAccess ? "General Access" : "Specific Permissions"}
                  readOnly
                  disabled
                  className="dark:bg-slate-800 dark:text-white dark:border-gray-700 opacity-70 text-sm"
                />
              </div>
           </div>

           <Accordion type="multiple" className="w-full space-y-3">
             {/* General Permissions Section */}
             <AccordionItem value="general-perms" className="border dark:border-gray-700 rounded-md">
               <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                 Default File & Folder Permissions
               </AccordionTrigger>
               <AccordionContent className="space-y-4 px-4 pb-4 pt-2">
                 <div>
                   <h4 className="text-sm font-medium mb-2 dark:text-gray-200">Default File Permissions</h4>
                   {renderFilePerms(group.defaultFilePerms)}
                 </div>
                 <Separator className="dark:bg-gray-600" />
                 <div>
                   <h4 className="text-sm font-medium mb-2 dark:text-gray-200">Default Folder Permissions</h4>
                   {renderFolderPerms(group.defaultFolderPerms)}
                 </div>
                 {group.allAccess ? (
                   <p className="text-xs text-blue-500 dark:text-blue-400 italic pt-2">
                     These permissions apply to all files and folders as General Access Mode is ON.
                   </p>
                 ) : (
                   <p className="text-xs text-yellow-600 dark:text-yellow-400 italic pt-2">
                     General Access Mode is OFF. Specific permissions (if set) will override these defaults.
                   </p>
                 )}
               </AccordionContent>
             </AccordionItem>

             {/* Dataroom Settings Section */}
             <AccordionItem value="dataroom-settings" className="border dark:border-gray-700 rounded-md">
               <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                 Dataroom Settings
               </AccordionTrigger>
               <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2">
                  <PermissionSwitchDisplay id="view-query-dataroom" label="AI Query Entire Dataroom" checked={group.canQueryEntireDataroom} />
                   {group.canQueryEntireDataroom && (
                      <div className="ml-8 text-xs text-amber-600 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md my-1">
                        Note: Queries may use data from files that users may not have access to with Specific Permissions (granular querying coming soon)
                      </div>
                    )}
                  <PermissionSwitchDisplay id="view-organize" label="Organize Files & Folders" checked={group.canOrganize} />
                  <PermissionSwitchDisplay id="view-retry" label="Retry Processing" checked={group.canRetryProcessing} />
                  <PermissionSwitchDisplay id="view-delete-dataroom" label="Delete Dataroom" checked={group.canDeleteDataroom} />
               </AccordionContent>
             </AccordionItem>

              {/* User Management Section */}
             <AccordionItem value="user-management" className="border dark:border-gray-700 rounded-md">
               <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                 User Management Permissions
               </AccordionTrigger>
               <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2">
                 <PermissionSwitchDisplay id="view-access-user-panel" label="Access User Management Panel" checked={group.canAccessUserManagementPanel} />
                 <PermissionSwitchDisplay id="view-view-users" label="View Users List" checked={group.canViewUsers} />
                 <PermissionSwitchDisplay id="view-view-group-details" label="View Permission Group Details" checked={group.canViewPermissionGroupDetails} />
                 <PermissionSwitchDisplay id="view-create-groups" label="Create/Edit Permission Groups" checked={group.canCreatePermissionGroups} />
                 <Separator className="dark:bg-gray-600 my-3" />
                 <RoleListDisplay roles={group.canInviteUsers} title="Can Invite Roles:" />
                 <Separator className="dark:bg-gray-600 my-3" />
                 <RoleListDisplay roles={group.canUpdateUserPermissions} title="Can Update Permissions for Roles:" />
                 <PermissionSwitchDisplay id="view-update-peer-perms" label="Can Update Peers' Permissions" checked={group.canUpdatePeerPermissions} />
                 <Separator className="dark:bg-gray-600 my-3" />
                 <RoleListDisplay roles={group.canRemoveUsers} title="Can Remove Roles:" />
                 <PermissionSwitchDisplay id="view-remove-peer" label="Can Remove Peers" checked={group.canRemovePeerPermission} />
               </AccordionContent>
             </AccordionItem>

             {/* Issues & Support Section */}
             <AccordionItem value="issues-support" className="border dark:border-gray-700 rounded-md">
               <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                 Issues & Support Permissions
               </AccordionTrigger>
               <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2">
                 <PermissionSwitchDisplay id="view-access-issues" label="Access Issues Panel" checked={group.canAccessIssuesPanel} />
                 <PermissionSwitchDisplay id="view-create-issues" label="Create Issues" checked={group.canCreateIssue} />
                 <PermissionSwitchDisplay id="view-answer-issues" label="Answer/Resolve Issues" checked={group.canAnswerIssue} />
               </AccordionContent>
             </AccordionItem>

              {/* Audit Log Section */}
             <AccordionItem value="audit-logs" className="border dark:border-gray-700 rounded-md">
               <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                 Audit Log Permissions
               </AccordionTrigger>
               <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2">
                 <PermissionSwitchDisplay id="view-access-audit" label="Access Audit Logs Panel" checked={group.canAccessAuditLogsPanel} />
                 <PermissionSwitchDisplay id="view-view-audit" label="View Audit Logs" checked={group.canViewAuditLogs} />
                 <PermissionSwitchDisplay id="view-export-audit" label="Export Audit Logs" checked={group.canExportAuditLogs} />
               </AccordionContent>
             </AccordionItem>

             {/* Diligence Dashboard Section */}
              <AccordionItem value="diligence-dashboard" className="border dark:border-gray-700 rounded-md">
               <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                 Diligence Dashboard Permissions
               </AccordionTrigger>
               <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2">
                 <PermissionSwitchDisplay id="view-access-diligence" label="Access Diligence Dashboard Panel" checked={group.canAccessDiligenceDashboard} />
                 <PermissionSwitchDisplay id="view-create-widget" label="Create Widgets" checked={group.canCreateDiligenceWidget} />
                 <PermissionSwitchDisplay id="view-move-widget" label="Move Widgets" checked={group.canMoveWidgets} />
                 <PermissionSwitchDisplay id="view-delete-widget" label="Delete Widgets" checked={group.canDeleteWidgets} />
               </AccordionContent>
             </AccordionItem>

             {/* Questionnaire Section */}
             <AccordionItem value="questionnaire" className="border dark:border-gray-700 rounded-md">
               <AccordionTrigger className="dark:text-white hover:no-underline px-4 py-3 text-sm font-medium">
                 Questionnaire Permissions
               </AccordionTrigger>
               <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2">
                 <PermissionSwitchDisplay id="view-access-questionnaire" label="Access Questionnaire Panel" checked={group.canAccessQuestionairePanel} />
                 <PermissionSwitchDisplay id="view-add-questionnaire" label="Add Questionnaires" checked={group.canAddQuestionnaire} />
               </AccordionContent>
             </AccordionItem>

              {/* Specific Permissions Section - Only show if relevant */}
              {!group.allAccess && (group.fileIdAccess || group.folderIdAccess) && Object.keys({...group.fileIdAccess, ...group.folderIdAccess}).length > 0 && (
                <AccordionItem value="specific-permissions" className="border border-yellow-500/50 dark:border-yellow-400/40 rounded-md">
                  <AccordionTrigger className="dark:text-yellow-300 hover:no-underline px-4 py-3 text-sm font-medium text-yellow-700 dark:text-yellow-300">
                     <FileWarning className="h-4 w-4 mr-2" /> Specific File/Folder Overrides
                  </AccordionTrigger>
                  <AccordionContent className="dark:text-gray-300 space-y-3 px-4 pb-4 pt-2">
                     <p className="text-xs italic text-yellow-600 dark:text-yellow-400">The following specific permissions are set for this group, overriding the defaults:</p>
                     {/* TODO: Display specific file/folder permissions in a readable format */} 
                     {/* This might involve fetching file/folder names based on IDs */} 
                     <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
                       {JSON.stringify({ fileIdAccess: group.fileIdAccess, folderIdAccess: group.folderIdAccess }, null, 2)}
                     </pre>
                  </AccordionContent>
                </AccordionItem>
              )}

           </Accordion> 

        </div>
        
        <DialogFooter className="p-4 border-t dark:border-gray-700">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="dark:text-white dark:border-gray-600"
          >
            Close
          </Button>
          {/* Potentially add Edit button here for non-default roles */} 
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 