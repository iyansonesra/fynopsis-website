import React from 'react';
import logo from '../app/assets/fynopsis_noBG.png'

interface IndustryButtonProps {
  industryName: string;
}

const IndustryButton: React.FC<IndustryButtonProps> = ({
  industryName
}) => {
  return (
    <div className='flex inline-block rounded-full bg-sky-100 px-4 py-1 '>
      <h1 className = 'text-sky-500 font-normal text-base md:text-xs 2xl:text-lg'>{industryName}</h1>
    </div>
  );
};

export default IndustryButton;