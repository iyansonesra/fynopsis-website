import React from 'react';
import { Clock, MoreVertical, Trash2, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { del, post } from 'aws-amplify/api';

interface DataRoomCardProps {
  id: string;
  title: string;
  lastOpened: string;
  onClick: () => void;
  permissionLevel: string;
  sharedBy: string;
}

const DataRoomCard: React.FC<DataRoomCardProps> = ({ id, title, lastOpened, onClick, permissionLevel, sharedBy }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    try {
      const restOperation = del({
        apiName: 'S3_API',
        path: `/s3/${id}/delete-room`,
        options: {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        },
      });
      await restOperation.response;
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting dataroom:', error);
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

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 w-full max-w-sm relative group">
        <div className="absolute right-2 top-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40" align="end">
              <div className="flex flex-col space-y-1">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsDeleteDialogOpen(true)} 
                  className="justify-start text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
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
        <div onClick={onClick} className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Clock className="mr-2 h-4 w-4" />
            <span>Last Opened: {lastOpened}</span>
          </div>
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dataroom</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this dataroom? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
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
    </>
  );
};

export default DataRoomCard;
