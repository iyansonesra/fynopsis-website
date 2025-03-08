import React from 'react';
import { Clock, MoreVertical, Trash2, LogOut, Edit2, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { del, post } from 'aws-amplify/api';

interface DataRoomCardProps {
  id: string;
  users?: sharedUser[];
  title: string;
  lastOpened: string;
  onClick: () => void;
  permissionLevel: string;
  sharedBy: string;
  onDelete?: () => void;
}

interface sharedUser {
  email: string;
  name: string;
  role: string;
}

const DataRoomCard: React.FC<DataRoomCardProps> = ({ id, title, lastOpened, onClick, permissionLevel, sharedBy, onDelete, users }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = React.useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState(title);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUsersDialogOpen, setIsUsersDialogOpen] = React.useState(false);


  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const restOperation = del({
        apiName: 'S3_API',
        path: `/share-folder/${id}/delete-room`,
        options: {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        },
      });
      await restOperation.response;
      setIsDeleteDialogOpen(false);
      onDelete?.(); // Call onDelete callback after successful deletion
    } catch (error) {
      console.error('Error deleting dataroom:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeave = async () => {
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/s3/${id}/leave-room`,
        options: {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        },
      });
      await restOperation.response;
      setIsLeaveDialogOpen(false);
    } catch (error) {
      console.error('Error leaving dataroom:', error);
    }
  };

  const handleRename = async () => {
    try {
      const restOperation = post({
        apiName: 'S3_API',
        path: `/share-folder/${id}/rename`,
        options: {
          body: { newName },
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        },
      });
      await restOperation.response;
      setIsRenameDialogOpen(false);
      window.location.reload(); // Refresh to show the new name
    } catch (error) {
      console.error('Error renaming dataroom:', error);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-transparent shadow-md overflow-hidden cursor-pointer hover:shadow-lg dark:hover:bg-slate-900 transition-shadow duration-300 w-full relative group border-b border-gray-200 dark:border-gray-700" onDoubleClick={onClick}>

        <div className="absolute right-2 top-2">
          <div className="flex flex-row items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsUsersDialogOpen(true);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </Button>

            <Popover>
              <PopoverTrigger asChild >
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 dark:bg-slate-800 dark:border-none" align="end">
                <div className="flex flex-col space-y-1">
                  <Button
                    variant="ghost"
                    onClick={() => setIsRenameDialogOpen(true)}
                    className="justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Rename
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="justify-start text-red-600 dark:text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsLeaveDialogOpen(true)}
                    className="justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Leave
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

        </div>
        <div onClick={onClick} className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>

          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Clock className="mr-2 h-4 w-4" />
            <span>Last Opened: {lastOpened}</span>
          </div>
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className = "z-50">
          <DialogHeader>
            <DialogTitle>Delete Dataroom</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this dataroom? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Dataroom</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to leave this dataroom?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveDialogOpen(false)}>Cancel</Button>
            <Button variant="default" onClick={handleLeave}>Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Dataroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button variant="default" onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
        <DialogContent className = "dark:bg-slate-900 dark:text-gray-200 dark:border-none">
          <DialogHeader>
            <DialogTitle>Dataroom Members</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {users && users.length > 0 ? (
              <ul className="space-y-2">
                {users.map((user) => (
                  <li key={user.email} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <Users className="mr-2 h-4 w-4" />
                    {user.name}
                    {user.email === sharedBy && (
                      <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-0.5 rounded">
                        Owner
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No members to display</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUsersDialogOpen(false)} className = "dark:text-gray-200 dark:bg-blue-900 dark:border-none" >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DataRoomCard;
