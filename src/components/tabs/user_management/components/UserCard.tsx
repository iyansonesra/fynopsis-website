import React from 'react';
import { Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Role } from '../CollaboratorsTypes';

// Define RoleInfo directly to avoid dependency on external module
interface RoleInfo {
  id: string;
  name: string;
  type: 'ROLE' | 'GROUP';
  description?: string;
}

interface UserCardProps {
  user: User;
  currentUserRole: Role;
  currentUserEmail: string | null;
  onRoleChange: (userEmail: string, newRole: string) => void;
  onRemoveUser: (user: User) => void;
  availableRoles: Record<string, RoleInfo>;
}

const getFormattedRoleName = (role: string): string => {
  switch (role) {
    case 'READ': return 'Viewer';
    case 'WRITE': return 'Editor';
    case 'ADMIN': return 'Admin';
    case 'OWNER': return 'Owner';
    default: return role;
  }
};

export const formatRoleDisplay = (role: string): string => {
  return getFormattedRoleName(role);
};

export const RoleSelect: React.FC<{
  user: User;
  currentUserRole: Role;
  onRoleChange: (userEmail: string, newRole: string) => void;
  currentUserEmail: string | null;
  availableRoles: Record<string, RoleInfo>;
}> = ({ user, currentUserRole, onRoleChange, currentUserEmail, availableRoles }) => {
  const isCurrentUser = user.email === currentUserEmail;
  const canModifyRole = canModifyUserRole(currentUserRole, user.role as Role, isCurrentUser);
  
  // Use type assertion to access properties
  const permissionInfo = (user as any).permissionInfo;
  const currentRoleDisplay = permissionInfo?.displayName || formatRoleDisplay(user.role);
  const currentRoleId = permissionInfo?.id || user.role;
  const isUserOwner = currentRoleId === 'OWNER' || currentRoleId === 'default-owner';

  // Get available roles for dropdown, excluding OWNER unless the user already has it
  const roleEntries = Object.entries(availableRoles || {})
    .filter(([id]) => {
      // Always include the user's current role (even if it's Owner)
      if (id === currentRoleId) return true;
      // Otherwise filter out Owner roles for the dropdown
      return id !== 'OWNER' && id !== 'default-owner';
    });

  return (
    <Select
      disabled={!canModifyRole || isUserOwner} // Disable if user is Owner (can't change from Owner)
      value={currentRoleId}
      onValueChange={(value) => onRoleChange(user.email, value)}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder={currentRoleDisplay} />
      </SelectTrigger>
      <SelectContent>
        {roleEntries.map(([id, roleInfo]) => (
          <SelectItem key={id} value={id} className="cursor-pointer">
            {roleInfo.name}
            {roleInfo.type === 'GROUP' && ' (Custom)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const UserCard: React.FC<UserCardProps> = ({
  user,
  currentUserRole,
  currentUserEmail,
  onRoleChange,
  onRemoveUser,
  availableRoles
}) => {
  const isCurrentUser = user.email === currentUserEmail;
  const canRemove = canRemoveUser(currentUserRole, user.role as Role) && !isCurrentUser;

  return (
    <div className="p-6 border-b dark:border-gray-700 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex-grow">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Added: {new Date(user.addedAt).toLocaleDateString()}
                </p>
                <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  By: {(user as any).sharedBy}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <RoleSelect
            user={user}
            currentUserRole={currentUserRole}
            onRoleChange={onRoleChange}
            currentUserEmail={currentUserEmail}
            availableRoles={availableRoles}
          />
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveUser(user)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions
const canModifyUserRole = (currentUserRole: Role, targetUserRole: Role, isCurrentUser: boolean = false) => {
  // Owner cannot modify their own permission
  if (isCurrentUser && currentUserRole === 'OWNER') {
    return false;
  }
  
  if (currentUserRole === 'OWNER') {
    return true;  // OWNER can modify any other role
  }
  if (currentUserRole === 'ADMIN') {
    return targetUserRole !== 'OWNER' && targetUserRole !== 'ADMIN';  // ADMIN can only modify READ and WRITE roles
  }
  return false;  // Other roles cannot modify any roles
};

const canRemoveUser = (currentUserRole: Role, targetUserRole: Role) => {
  if (currentUserRole === 'OWNER') {
    return true;  // OWNER can remove anyone
  }
  if (currentUserRole === 'ADMIN') {
    return targetUserRole === 'READ' || targetUserRole === 'WRITE';  // ADMIN can only remove READ and WRITE roles
  }
  return false;  // Other roles cannot remove anyone
}; 