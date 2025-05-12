import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';
import type { PermissionGroup } from '../CollaboratorsTypes';

interface DeletePermissionGroupDialogProps {
  isOpen: boolean;
  group: PermissionGroup | null;
  onClose: () => void;
  onConfirm: (groupId: string) => Promise<void>;
}

export const DeletePermissionGroupDialog: React.FC<DeletePermissionGroupDialogProps> = ({
  isOpen,
  group,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!group) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await onConfirm(group.id);
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        // Handle specific error for group in use
        if (err.message.includes('in use by users')) {
          setError('This permission group is currently assigned to users. Please reassign these users to another group before deleting.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to delete permission group');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Delete Permission Group
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the permission group &quot;{group?.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <DialogFooter className="flex gap-2 items-center justify-end sm:justify-end">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 