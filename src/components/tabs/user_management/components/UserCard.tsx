import React from 'react';
import { Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import type { User, Role } from '../CollaboratorsTypes';

// Helper function for formatting role display names
export const formatRoleDisplay = (role: string): string => {
  if (role === 'READ') return 'Viewer';
  if (role === 'WRITE') return 'Editor';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

interface RoleSelectProps {
  user: User;
  currentUserRole: Role;
  onRoleChange: (userEmail: string, newRole: string) => void;
  currentUserEmail?: string | null;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({ 
  user, 
  currentUserRole, 
  onRoleChange,
  currentUserEmail 
}) => {
  const isCurrentUser = user.userId === currentUserEmail;
  
  // Determine if the current user can modify this user's role
  const canModify = (() => {
    // Owner cannot modify their own permission
    if (isCurrentUser && currentUserRole === 'OWNER') {
      return false;
    }
    
    if (currentUserRole === 'OWNER') {
      return true;  // OWNER can modify any other role
    }
    if (currentUserRole === 'ADMIN') {
      return user.role !== 'OWNER' && user.role !== 'ADMIN';  // ADMIN can only modify READ and WRITE roles
    }
    return false;  // Other roles cannot modify any roles
  })();

  if (!canModify) {
    return <div className="text-gray-600 font-medium dark:text-white text-sm">
      {formatRoleDisplay(user.role)}
    </div>;
  }

  return (
    <Select
      value={user.role}
      onValueChange={(newValue) => onRoleChange(user.email, newValue)}
    >
      <SelectTrigger className="w-[140px] bg-white dark:bg-slate-800 dark:text-white dark:border-gray-700 select-none outline-none">
        <SelectValue placeholder="Select permission" />
      </SelectTrigger>
      <SelectContent className='dark:text-white dark:bg-slate-800'>
        <SelectItem value="READ" className='dark:text-white text-sm'>Viewer</SelectItem>
        <SelectItem value="WRITE" className='dark:text-white text-sm'>Editor</SelectItem>
        <SelectItem value="ADMIN" className='dark:text-white text-sm'>Admin</SelectItem>
        {currentUserRole === 'OWNER' && !isCurrentUser && (
          <SelectItem value="OWNER" className='dark:text-white text-sm'>Owner</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

interface UserCardProps {
  user: User;
  currentUserRole: Role;
  currentUserEmail: string | null;
  onRoleChange: (userEmail: string, newRole: string) => void;
  onRemoveUser: (user: User) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  currentUserRole, 
  currentUserEmail, 
  onRoleChange, 
  onRemoveUser 
}) => {
  // Determine if the current user can remove this user
  const canRemove = (() => {
    if (currentUserRole === 'OWNER') {
      return true;  // OWNER can remove anyone
    }
    if (currentUserRole === 'ADMIN') {
      return user.role === 'READ' || user.role === 'WRITE';  // ADMIN can only remove READ and WRITE roles
    }
    return false;  // Other roles cannot remove anyone
  })();

  return (
    <div className={`flex items-center justify-between p-6 transition-colors dark:bg-slate-700 
      ${user.isInvited
        ? 'bg-yellow-50 dark:bg-slate-800/50 border-l-4 border-yellow-400'
        : 'hover:bg-gray-50'}`}
    >
      <div className="flex-grow">
        <div className="flex items-center space-x-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center
            ${user.isInvited
              ? 'bg-yellow-100 dark:bg-yellow-900'
              : 'bg-gray-100 dark:bg-blue-400'}`}
          >
            <span className={`font-medium 
              ${user.isInvited
                ? 'text-yellow-800 dark:text-yellow-200'
                : 'text-gray-600 dark:text-white'}`}
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
              {user.isInvited && (
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                  Pending Invite
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-300">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1 dark:text-gray-200">
              {user.isInvited ? 'Invited' : 'Added'}: {new Date(user.addedAt).toLocaleDateString()}
            </p>
            {user.isInvited && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Will join as: {formatRoleDisplay(user.invitedRole || 'READ')}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {canRemove && user.email !== currentUserEmail && (
          <button
            onClick={() => onRemoveUser(user)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            aria-label="Remove user"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <RoleSelect 
          user={user} 
          currentUserRole={currentUserRole} 
          onRoleChange={onRoleChange} 
          currentUserEmail={currentUserEmail}
        />
      </div>
    </div>
  );
}; 