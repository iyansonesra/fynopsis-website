import React from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonCard } from './SkeletonCard';
import { UserCard, RoleSelect } from './UserCard';
import { InviteUserDialog } from './InviteUserDialog';
import { RemoveUserDialog } from './RemoveUserDialog';
import { TransferOwnershipDialog } from './TransferOwnershipDialog';
import type { User, Role } from '../CollaboratorsTypes';

interface UsersTabContentProps {
  isLoading: boolean;
  error: string | null;
  currentUser: User | null;
  otherUsers: User[];
  onInviteUser: () => Promise<void>;
  onRemoveUser: (user: User) => Promise<void> | void;
  onTransferOwnership: () => Promise<void>;
  onRoleChange: (userEmail: string, newRole: string) => void;
  
  // Invite dialog state
  isInviteDialogOpen: boolean;
  setIsInviteDialogOpen: (isOpen: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteRole: 'READ' | 'WRITE' | 'ADMIN';
  setInviteRole: (role: 'READ' | 'WRITE' | 'ADMIN') => void;
  isInviting: boolean;
  inviteError: string | null;
  
  // Remove user dialog state
  userToRemove: User | null;
  setUserToRemove: (user: User | null) => void;
  
  // Transfer ownership dialog state
  ownerTransfer: {
    isOpen: boolean;
    targetUser: User | null;
  };
  setOwnerTransfer: (state: { isOpen: boolean; targetUser: User | null }) => void;
}

export const UsersTabContent: React.FC<UsersTabContentProps> = ({
  isLoading,
  error,
  currentUser,
  otherUsers,
  onInviteUser,
  onRemoveUser,
  onTransferOwnership,
  onRoleChange,
  isInviteDialogOpen,
  setIsInviteDialogOpen,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  isInviting,
  inviteError,
  userToRemove,
  setUserToRemove,
  ownerTransfer,
  setOwnerTransfer
}) => {
  if (otherUsers.length === 0 && !isLoading) {
    return <div className="p-6 text-center text-gray-500">No users found</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-lg font-bold">Users</CardTitle>
          <Button 
            onClick={() => setIsInviteDialogOpen(true)}
            size="sm"
            className="flex gap-1 items-center"
          >
            <UserPlus className="h-4 w-4" /> Invite User
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
              <p className="text-red-600 text-center">{error}</p>
            </div>
          )}
          
          {isLoading ? (
            // Loading skeleton
            <div className="divide-y dark:divide-gray-700">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {/* Current User */}
              {currentUser && (
                <div className="bg-blue-50 dark:bg-slate-800 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-grow">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500 flex items-center justify-center">
                          <span className="text-blue-600 font-medium dark:text-white">
                            {currentUser.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {currentUser.name} <span className="text-blue-600 text-sm">(You)</span>
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-300">{currentUser.email}</p>
                          <p className="text-xs text-gray-400 mt-1 dark:text-gray-200">
                            Added: {new Date(currentUser.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-6">
                      <RoleSelect 
                        user={currentUser} 
                        currentUserRole={currentUser.role as Role} 
                        onRoleChange={onRoleChange}
                        currentUserEmail={currentUser.email} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Other Users */}
              {otherUsers.map((user) => (
                <UserCard 
                  key={user.userId} 
                  user={user} 
                  currentUserRole={currentUser?.role as Role} 
                  currentUserEmail={currentUser?.email || null}
                  onRoleChange={onRoleChange}
                  onRemoveUser={onRemoveUser}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <InviteUserDialog
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        email={inviteEmail}
        onEmailChange={setInviteEmail}
        role={inviteRole}
        onRoleChange={setInviteRole}
        onInvite={onInviteUser}
        isInviting={isInviting}
        error={inviteError}
      />

      <RemoveUserDialog
        isOpen={!!userToRemove}
        onClose={() => setUserToRemove(null)}
        user={userToRemove}
        onConfirm={async (user) => await Promise.resolve(onRemoveUser(user))}
      />

      <TransferOwnershipDialog
        isOpen={ownerTransfer.isOpen}
        onClose={() => setOwnerTransfer({ isOpen: false, targetUser: null })}
        targetUser={ownerTransfer.targetUser}
        onConfirm={onTransferOwnership}
      />
    </div>
  );
}; 