import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Node } from '../static_folder_tree/static-folder-tree';
import { useFolderStructureStore, FilePermissions, FolderPermissions } from '@/components/services/folderStructureStore';
import { FileText, FolderOpen } from 'lucide-react';

interface FileSpecificPermissionPanel2Props {
    selectedItem: Node | null;
    onCheckboxSelect?: (node: Node, isSelected: boolean) => void;
}

export const FileSpecificPermissionPanel2: React.FC<FileSpecificPermissionPanel2Props> = ({
    selectedItem,
    onCheckboxSelect
}) => {
    const {
        folderPermissions,
        filePermissions,
        setFolderPermissions,
        setFilePermissions,
        deviators,
        addDeviator,
        removeDeviator,
        isDeviator
    } = useFolderStructureStore();

    if (!selectedItem || !selectedItem.id) {
        return (
            <div className="p-4 text-center text-gray-500">
                Select a file or folder to view its permissions
            </div>
        );
    }


    const isFolder = selectedItem.isFolder;
    const itemId = selectedItem.id;

    // Get current permissions based on whether it's a file or folder
    const currentPermissions = isFolder
        ? folderPermissions.get(itemId)
        : filePermissions.get(itemId);

    if (!currentPermissions) {
        return (
            <div className="p-4 text-center text-gray-500">
                No permissions found for this item
            </div>
        );
    }

    const handlePermissionChange = (key: keyof (FilePermissions | FolderPermissions), value: boolean) => {
        if (isFolder) {
            const newPermissions = { ...currentPermissions as FolderPermissions, [key]: value };
            const newMap = new Map(folderPermissions);
            newMap.set(itemId, newPermissions);
            setFolderPermissions(newMap);
        } else {
            const newPermissions = { ...currentPermissions as FilePermissions, [key]: value };
            const newMap = new Map(filePermissions);
            newMap.set(itemId, newPermissions);
            setFilePermissions(newMap);

            // Check if this change makes the file a deviator
            const parentFolderId = selectedItem.parentFolderId;
            if (parentFolderId) {
                const parentFolder = folderPermissions.get(parentFolderId);
                if (parentFolder) {
                    const isNowDeviator = newPermissions[key] !== parentFolder.ChildFileStandard[key];
                    if (isNowDeviator) {
                        addDeviator(itemId);
                    } else {
                        // Check if all permissions match the standard
                        const allMatch = Object.keys(parentFolder.ChildFileStandard).every(
                            k => newPermissions[k as keyof FilePermissions] === parentFolder.ChildFileStandard[k as keyof FilePermissions]
                        );
                        if (allMatch) {
                            removeDeviator(itemId);
                        }
                    }
                }
            }

            // If viewAccess is being toggled, update the visibility state
            console.log('key:', key);
            console.log('onCheckboxSelect:', onCheckboxSelect);

        }

        if (key === 'viewAccess' && onCheckboxSelect) {
            console.log('viewAccess is being toggled, updating visibility state');
            onCheckboxSelect(selectedItem, value);
        }
    };

    // Handle ChildFileStandard changes
    const handleChildFileStandardChange = (key: keyof FilePermissions, value: boolean) => {
        if (!isFolder || !selectedItem.nodes) return;

        const folderPerms = currentPermissions as FolderPermissions;
        const newChildFileStandard = { ...folderPerms.ChildFileStandard, [key]: value };
        const newPermissions = { ...folderPerms, ChildFileStandard: newChildFileStandard };

        // Update folder permissions
        const newFolderMap = new Map(folderPermissions);
        newFolderMap.set(itemId, newPermissions);
        setFolderPermissions(newFolderMap);

        // Update all child file permissions (except deviators)
        const newFileMap = new Map(filePermissions);

        // Function to process nodes recursively
        const processNodes = (nodes: Node[]) => {
            nodes.forEach(node => {
                if (node.id && !node.isFolder) {
                    const currentFilePerms = filePermissions.get(node.id);
                    if (currentFilePerms) {
                        // Only update non-deviator files
                        if (!isDeviator(node.id)) {
                            newFileMap.set(node.id, {
                                ...currentFilePerms,
                                [key]: value,
                                inheritedFileAccess: newChildFileStandard
                            });
                        } else {
                            // For deviators, only update the inheritedFileAccess
                            newFileMap.set(node.id, {
                                ...currentFilePerms,
                                inheritedFileAccess: newChildFileStandard
                            });
                        }
                    }
                }
                if (node.nodes) {
                    processNodes(node.nodes);
                }
            });
        };

        // Start processing from the selected folder's nodes
        processNodes(selectedItem.nodes);
        setFilePermissions(newFileMap);
    };

    const handleRevertToStandard = () => {
        if (!selectedItem.id || !selectedItem.parentFolderId) return;

        const parentFolder = folderPermissions.get(selectedItem.parentFolderId);
        if (!parentFolder) return;

        // Create new permissions that match the parent's ChildFileStandard
        const newPermissions = { ...parentFolder.ChildFileStandard };

        // Update the file's permissions
        const newFileMap = new Map(filePermissions);
        newFileMap.set(selectedItem.id, {
            ...newPermissions,
            inheritedFileAccess: parentFolder.ChildFileStandard
        });
        setFilePermissions(newFileMap);

        // Remove from deviators since it now matches the standard
        removeDeviator(selectedItem.id);
    };

    // Common permissions between files and folders
    const commonPermissions = [
        { key: 'viewAccess', label: 'View Access' },
        { key: 'viewTags', label: 'View Tags' },
        { key: 'addTags', label: 'Add Tags' },
        { key: 'viewComments', label: 'View Comments' },
        { key: 'addComments', label: 'Add Comments' },
        { key: 'canQuery', label: 'Can Query' },
        { key: 'deleteAccess', label: 'Delete Access' },
        { key: 'editAccess', label: 'Edit Access' },
    ];

    // Folder-specific permissions
    const folderSpecificPermissions = [
        { key: 'allowUploads', label: 'Allow Uploads' },
        { key: 'moveAccess', label: 'Move Access' },
        { key: 'renameAccess', label: 'Rename Access' },
    ];

    // File-specific permissions
    const fileSpecificPermissions = [
        { key: 'watermarkContent', label: 'Watermark Content' },
        { key: 'moveAccess', label: 'Move Access' },
        { key: 'renameAccess', label: 'Rename Access' },
    ];

    // Helper function to get ChildFileStandard value
    const getChildFileStandardValue = (key: keyof FilePermissions): boolean => {
        if (!isFolder) return false;
        const folderPerms = currentPermissions as FolderPermissions;
        return folderPerms.ChildFileStandard[key] as boolean;
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    {isFolder ? (
                        <FolderOpen className="h-5 w-5 text-gray-500" />
                    ) : (
                        <FileText className="h-5 w-5 text-gray-500" />
                    )}
                    <h3 className="text-lg font-medium">{selectedItem.name}</h3>
                    {!isFolder && isDeviator(itemId) && (
                        <>
                            <span className="text-sm text-yellow-500">(Custom Permissions)</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRevertToStandard}
                                className="text-xs"
                            >
                                Revert to Standard
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {/* Common Permissions */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500">COMMON PERMISSIONS</h4>
                    {commonPermissions.map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                            <Label htmlFor={key} className="text-sm">
                                {label}
                            </Label>
                            <Switch
                                id={key}
                                checked={currentPermissions[key as keyof (FilePermissions | FolderPermissions)]}
                                onCheckedChange={(checked) => handlePermissionChange(key as keyof (FilePermissions | FolderPermissions), checked)}
                            />
                        </div>
                    ))}
                </div>

                {/* Specific Permissions */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-500">
                        {isFolder ? 'FOLDER' : 'FILE'} SPECIFIC PERMISSIONS
                    </h4>
                    {(isFolder ? folderSpecificPermissions : fileSpecificPermissions).map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                            <Label htmlFor={key} className="text-sm">
                                {label}
                            </Label>
                            <Switch
                                id={key}
                                checked={currentPermissions[key as keyof (FilePermissions | FolderPermissions)]}
                                onCheckedChange={(checked) => handlePermissionChange(key as keyof (FilePermissions | FolderPermissions), checked)}
                            />
                        </div>
                    ))}
                </div>

                {/* Child File Standard Permissions (for folders only) */}
                {isFolder && (
                    <div className="space-y-2 border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-500">CHILDREN FILE PERMISSIONS</h4>
                        <p className="text-xs text-gray-500 mb-2">
                            These permissions will be applied to all files in this folder and its subfolders
                        </p>
                        {commonPermissions.map(({ key, label }) => (
                            <div key={`child-${key}`} className="flex items-center justify-between">
                                <Label htmlFor={`child-${key}`} className="text-sm">
                                    {label}
                                </Label>
                                <Switch
                                    id={`child-${key}`}
                                    checked={getChildFileStandardValue(key as keyof FilePermissions)}
                                    onCheckedChange={(checked) => handleChildFileStandardChange(key as keyof FilePermissions, checked)}
                                />
                            </div>
                        ))}
                        {fileSpecificPermissions.map(({ key, label }) => (
                            <div key={`child-${key}`} className="flex items-center justify-between">
                                <Label htmlFor={`child-${key}`} className="text-sm">
                                    {label}
                                </Label>
                                <Switch
                                    id={`child-${key}`}
                                    checked={getChildFileStandardValue(key as keyof FilePermissions)}
                                    onCheckedChange={(checked) => handleChildFileStandardChange(key as keyof FilePermissions, checked)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileSpecificPermissionPanel2;
