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

type User = {
  userId: string;
  email: string;
  name: string;
  role: string;
  addedAt: string;
};

interface UserManagementProps {
  dataroomId: string;
}



const UserManagement: React.FC<UserManagementProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUsers, setOtherUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const bucketUuid = pathname.split('/').pop() || '';

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
      console.log('Body:', body);
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      console.log('Users response:', response);
      setUsers(response.users);
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
      setUsers(response.users);
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">User Management</h2>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {users.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No users found</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {/* Current User Section */}
            {currentUser && (
              <div className="bg-blue-50 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {currentUser.name} <span className="text-blue-600 text-sm">(You)</span>
                        </p>
                        <p className="text-sm text-gray-500">{currentUser.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Added: {new Date(currentUser.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-6">
                    <Select
                      value={currentUser.role}
                      onValueChange={(newValue) => changeUserPermission(currentUser.email, newValue)}
                    >
                      <SelectTrigger className="w-[140px] bg-white">
                        <SelectValue placeholder="Select permission" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="READ">Read</SelectItem>
                        <SelectItem value="WRITE">Write</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Other Users Section */}
            {otherUsers.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-grow">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Added: {new Date(user.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="ml-6">
                  <Select
                    value={user.role}
                    onValueChange={(newValue) => changeUserPermission(user.email, newValue)}
                  >
                    <SelectTrigger className="w-[140px] bg-white">
                      <SelectValue placeholder="Select permission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="READ">Read</SelectItem>
                      <SelectItem value="WRITE">Write</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
