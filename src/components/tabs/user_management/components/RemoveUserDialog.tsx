import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { User } from '../CollaboratorsTypes';

interface RemoveUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: (user: User) => Promise<void>;
}

export const RemoveUserDialog: React.FC<RemoveUserDialogProps> = ({
  isOpen,
  onClose,
  user,
  onConfirm
}) => {
  const [isRemoving, setIsRemoving] = React.useState(false);

  const handleConfirm = async () => {
    if (!user) return;
    
    setIsRemoving(true);
    try {
      await onConfirm(user);
    } finally {
      setIsRemoving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Remove User</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this user from the dataroom?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
            <p className="font-medium dark:text-white">{user.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1 dark:text-gray-300">
              {user.isInvited ? 'Invited' : 'Added'}: {new Date(user.addedAt).toLocaleDateString()}
            </p>
            {user.isInvited && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Pending invitation will be canceled.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isRemoving}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isRemoving}
          >
            {isRemoving ? 'Removing...' : 'Remove User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 