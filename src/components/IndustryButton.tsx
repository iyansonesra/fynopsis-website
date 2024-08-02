import React from 'react';
import { Skeleton } from './ui/skeleton';

interface IndustryButtonProps {
  industryName: string;
  isLoading?: boolean;
}

const IndustryButton: React.FC<IndustryButtonProps> = ({
  industryName,
  isLoading = false
}) => {
  return (
    <div className='relative inline-block'>
      {isLoading ? (
        <Skeleton className="h-8 w-24 md:h-6 md:w-20 2xl:h-10 2xl:w-28 rounded-full" />
      ) : (
        <div className='flex rounded-full bg-sky-100 px-4 py-1'>
          <h1 className='text-sky-500 font-normal text-base md:text-xs 2xl:text-lg'>
            {industryName}
          </h1>
        </div>
      )}
    </div>
  );
};

export default IndustryButton;