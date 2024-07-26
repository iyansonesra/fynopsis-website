import React from 'react';
import logo from '../app/assets/fynopsis_noBG.png'

interface GPTResponseProps {
    userSearch: string;
}

const GPTResponse: React.FC<GPTResponseProps> = ({
    userSearch
  }) => {
    return (
        <div className='flex justify-start w-full mb-2'>
        <div 
          className='inline-flex items-start rounded-2xl'
        >
          <div className="flex-shrink-0 w-[30px] h-[30px] 2xl:w-[40px] 2xl:h-[40px] mr-2 2xl:mr-4 border rounded-full">
            <img src={logo.src} alt="logo" className="h-full w-full object-cover rounded-full"/>
          </div>
          <span className="rounded-2xl 2xl:text-xl">{userSearch}</span>
        </div>
      </div>
    );
  };

export default GPTResponse;