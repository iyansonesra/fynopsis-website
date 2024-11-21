import React from 'react';
import logo from '../app/assets/fynopsis_noBG.png'

export default function People({ setSelectedTab }: { setSelectedTab: React.Dispatch<React.SetStateAction<string>> }) {

    return (
        <div className='flex w-full mb-2 flex flex-row h-full'>
            <div className='flex-1 max-w-[25%] bg-green-100 h-full'></div>
            <div className='flex-1 min-w-[50%] bg-red-100 h-full'></div>
            <div className='flex-1 max-w-[25%] bg-blue-100 h-full'></div>
    
      </div>
    );
  };
