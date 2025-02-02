import React, { useEffect, useState } from 'react';
import { get, post } from '@aws-amplify/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { usePathname } from 'next/navigation';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Update the User type to include invitation status
type User = {
  userId: string;
  email: string;
  name: string;
  role: string;
  addedAt: string;
  isInvited?: boolean;
  invitedRole?: string; // The role they will have after accepting
};

type TransferOwnershipDialog = {
  isOpen: boolean;
  targetUser: User | null;
};

interface UserManagementProps {
  dataroomId: string;
}

type Role = 'READ' | 'WRITE' | 'ADMIN' | 'OWNER';

const UserManagement: React.FC<UserManagementProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUsers, setOtherUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [ownerTransfer, setOwnerTransfer] = useState<TransferOwnershipDialog>({
    isOpen: false,
    targetUser: null
  });
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'READ' | 'WRITE' | 'ADMIN'>('READ');
  const [isInviting, setIsInviting] = useState(false);
  const pathname = usePathname();
  const bucketUuid = pathname.split('/').pop() || '';

  const canModifyUserRole = (currentUserRole: Role, targetUserRole: Role) => {
    if (currentUserRole === 'OWNER') {
      return true;  // OWNER can modify any role
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

  const handleRoleChange = (userEmail: string, newRole: string) => {
    if (newRole === 'OWNER' && currentUser?.role === 'OWNER') {
      setOwnerTransfer({
        isOpen: true,
        targetUser: users.find(u => u.email === userEmail) || null
      });
    } else {
      changeUserPermission(userEmail, newRole);
    }
  };

  const handleOwnershipTransfer = async () => {
    if (!ownerTransfer.targetUser) return;
    
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/transfer-ownership`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            newOwnerEmail: ownerTransfer.targetUser.email
          },
          withCredentials: true
        },
      });

      await restOperation.response;
      setOwnerTransfer({ isOpen: false, targetUser: null });
      await fetchUsers(); // Refresh user list
    } catch (error) {
      console.error('Error transferring ownership:', error);
    }
  };

  const RoleSelect = ({ user, currentUserRole }: { user: User; currentUserRole: Role }) => {
    const canModify = canModifyUserRole(currentUserRole, user.role as Role);
    
    if (!canModify) {
      return <div className="text-gray-600 font-medium dark:text-white">
        {user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()}
      </div>;
    }
    
    return (
      <Select 
        value={user.role} 
        onValueChange={(newValue) => handleRoleChange(user.email, newValue)}
        
      >
        <SelectTrigger className="w-[140px] bg-white">
          <SelectValue placeholder="Select permission" />
        </SelectTrigger>
        <SelectContent className='dark:text-white'>
          <SelectItem value="READ" className='dark:text-white'>Read</SelectItem>
          <SelectItem value="WRITE" className='dark:text-white'>Write</SelectItem>
          <SelectItem value="ADMIN" className='dark:text-white'>Admin</SelectItem>
          {currentUserRole === 'OWNER' && (
            <SelectItem value="OWNER">Owner</SelectItem>
          )}
        </SelectContent>
      </Select>
    );
  };

  const handleRemoveUser = async (user: User) => {
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/remove-user`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            userEmail: user.email
          },
          withCredentials: true
        },
      });

      await restOperation.response;
      setUserToRemove(null);
      await fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error removing user:', error);
    }
  };

  const UserCard = ({ user, currentUserRole }: { user: User; currentUserRole: Role }) => (
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
                Will join as: {user.invitedRole?.toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {canRemoveUser(currentUserRole, user.role as Role) && user.email !== currentUser?.email && (
          <button
            onClick={() => setUserToRemove(user)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <RoleSelect user={user} currentUserRole={currentUserRole} />
      </div>
    </div>
  );

  const fetchPermissionLevel = async () => {

    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/get-permissions`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
        },
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      const permissions = {
        role: response.role,
        sharedBy: response.sharedBy,
        addedAt: response.addedAt
      };
      console.log('Permissions retrieved:', permissions);
      setUsers(response);
    } catch (error) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAttributes = async () => {
      const userAttributes = await fetchUserAttributes();
      const currentUserEmail = userAttributes.email;

      if (users.length > 0) {
        const current = users.find(user => user.email === currentUserEmail);
        const others = users.filter(user => user.email !== currentUserEmail);

        setCurrentUser(current || null);
        setOtherUsers(others);
      }
    };
    fetchAttributes();
  }, [users]);

  // Update the fetch users function to transform the data
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    console.log("bucketUuid", bucketUuid);

    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/get-all-users`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        },
      });

      const { body } = await restOperation.response;
      console.log('Body:', body);
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      console.log('Users response:', response);
      
      // Transform the users data to include invitation status
      const transformedUsers = response.users.map((user: any) => ({
        ...user,
        isInvited: user.role === 'INVITED',
        invitedRole: user.invitedRole || user.role,
        role: user.role === 'INVITED' ? user.invitedRole : user.role
      }));

      setUsers(transformedUsers);
    } catch (error) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeUserPermission = async (userEmail: string, newPermissionLevel: string) => {
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/change-user-permissions`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            userEmail,
            newPermissionLevel
          },
          withCredentials: true
        },
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);

      await fetchUsers();

    } catch (error) {
      console.error('Error changing user permissions:', error);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || isInviting) return;
    setIsInviting(true);
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/invite-user`,
        options: {
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            userEmail: inviteEmail.trim(),
            permissionLevel: inviteRole
          },
          withCredentials: true
        },
      });

      await restOperation.response;
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('READ');
      await fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error inviting user:', error);
    } finally {
      setIsInviting(false);
    }
  };

  useEffect(() => {
    if (bucketUuid) {
      fetchUsers();
      fetchPermissionLevel();
    }
  }, [bucketUuid]);

  if (isLoading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <>
      <div className="mx-auto px-4 py-6 flex flex-col w-full dark:bg-darkbg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h2>
          <Button 
            onClick={() => setIsInviteDialogOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No users found</div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Current User Section */}
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
                      <RoleSelect user={currentUser} currentUserRole={currentUser.role as Role} />
                    </div>
                  </div>
                </div>
              )}

              {/* Other Users Section */}
              {otherUsers.map((user) => (
                <UserCard key={user.userId} user={user} currentUserRole={currentUser?.role as Role} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add invite user dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={() => !isInviting && setIsInviteDialogOpen(false)}>
        <DialogContent className="sm:max-w-[425px] dark:bg-darkbg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold dark:text-white">Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="dark:bg-slate-800 dark:text-white dark:border-gray-700"
                disabled={isInviting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">Permission Level</label>
              <Select
                value={inviteRole}
                onValueChange={(value: 'READ' | 'WRITE' | 'ADMIN') => setInviteRole(value)}
                disabled={isInviting}
              >
                <SelectTrigger className="w-full dark:bg-slate-800 dark:text-white dark:border-gray-700">
                  <SelectValue placeholder="Select permission level" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="READ" className="dark:text-white">Read</SelectItem>
                  <SelectItem value="WRITE" className="dark:text-white">Write</SelectItem>
                  <SelectItem value="ADMIN" className="dark:text-white">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(false)}
              disabled={isInviting}
              className="dark:bg-transparent dark:text-white dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={!inviteEmail.trim() || isInviting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isInviting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Inviting...
                </span>
              ) : (
                'Invite User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add remove user confirmation dialog */}
      <Dialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to remove {userToRemove?.name} ({userToRemove?.email}) from this dataroom?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToRemove(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => userToRemove && handleRemoveUser(userToRemove)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add owner transfer confirmation dialog */}
      <Dialog open={ownerTransfer.isOpen} onOpenChange={(open) => !open && setOwnerTransfer({ isOpen: false, targetUser: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to transfer ownership to {ownerTransfer.targetUser?.name} ({ownerTransfer.targetUser?.email})?
            </p>
            <p className="text-yellow-600 dark:text-yellow-400">
              ⚠️ You will lose owner privileges and become an Admin instead.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone unless the new owner transfers ownership back to you.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOwnerTransfer({ isOpen: false, targetUser: null })}
            >
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={handleOwnershipTransfer}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagement;