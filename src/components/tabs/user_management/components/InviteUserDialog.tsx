import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';

interface InviteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onEmailChange: (email: string) => void;
  role: 'READ' | 'WRITE' | 'ADMIN';
  onRoleChange: (role: 'READ' | 'WRITE' | 'ADMIN') => void;
  onInvite: () => void;
  isInviting: boolean;
  error: string | null;
}

export const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  isOpen,
  onClose,
  email,
  onEmailChange,
  role,
  onRoleChange,
  onInvite,
  isInviting,
  error
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInvite();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="email" className="text-right text-sm">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="col-span-3"
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="role" className="text-right text-sm">
                Role
              </label>
              <Select
                value={role}
                onValueChange={(value) => onRoleChange(value as 'READ' | 'WRITE' | 'ADMIN')}
              >
                <SelectTrigger className="col-span-3" id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READ">Viewer</SelectItem>
                  <SelectItem value="WRITE">Editor</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <div className="text-center text-red-500 text-sm">{error}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isInviting || !email.trim()}>
              {isInviting ? 'Sending Invite...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 