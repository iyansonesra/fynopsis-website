import React from 'react';
import { Clock } from 'lucide-react';

const DataRoomCard = ({ title, lastOpened, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 w-full max-w-sm"
    >
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Clock className="mr-2 h-4 w-4" />
          <span>Last Opened: {lastOpened}</span>
        </div>
      </div>
    </div>
  );
};

export default DataRoomCard;