import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { User } from '../CollaboratorsTypes';

interface TransferOwnershipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: User | null;
  onConfirm: () => Promise<void>;
}

export const TransferOwnershipDialog: React.FC<TransferOwnershipDialogProps> = ({
  isOpen,
  onClose,
  targetUser,
  onConfirm
}) => {
  const [isTransferring, setIsTransferring] = React.useState(false);

  const handleConfirm = async () => {
    if (!targetUser) return;
    
    setIsTransferring(true);
    try {
      await onConfirm();
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Ownership</DialogTitle>
          <DialogDescription>
            You are about to transfer ownership of this dataroom. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {targetUser ? (
            <div className="space-y-3">
              <p className="text-sm">
                Are you sure you want to transfer ownership to:
              </p>
              <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <p className="font-medium dark:text-white">{targetUser.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{targetUser.email}</p>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                Warning: You will lose owner permissions after the transfer.
              </p>
            </div>
          ) : (
            <p className="text-sm text-red-500">No user selected for transfer.</p>
          )}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isTransferring}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!targetUser || isTransferring}
          >
            {isTransferring ? 'Transferring...' : 'Transfer Ownership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 