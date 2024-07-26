import React from 'react';

interface UserSearchBubbleProps {
    userSearch: string;
}

const UserSearchBubble: React.FC<UserSearchBubbleProps> = ({
    userSearch
  }) => {
    return (
        <div className='flex justify-end w-full mb-2'>
        <span 
          className='inline-block bg-slate-100 rounded-2xl p-3 py-2 max-w-[70%] 2xl:max-w-[70%] 2xl:text-xl'
        >
          {userSearch}
        </span>
      </div>
    );
  };

export default UserSearchBubble;