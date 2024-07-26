import React from 'react';

interface RecentSearchProps {
  image: string;
  stockName: string;
  stockDescription: string;
  width: number | string;
  imageType: 'circular' | 'rectangular';
}

const RecentSearch: React.FC<RecentSearchProps> = ({
  image,
  stockName,
  stockDescription,
  width,
  imageType,
}) => {
  return (
    <div style={{ width }} className='bg-slate-100 rounded-2xl sm:h-12 md:h-20 lg:h-20 xl:h-28 2xl:h-40 flex flex-row overflow-hidden mt-4'>
      <div className="textContainer flex w-full h-full flex-col px-4 2xl:pl-8 pt-0 justify-start pt-2 2xl:pt-4">
        <div className="headerContainer flex flex-row  justify-between items-center">
          <div className = "stockNameAndLogo flex flex-row items-center justify-center gap-2 ">
            <div className = "logoContainer w-4 h-4 2xl:w-8 2xl:h-8 bg-blue-200 rounded-full m-auto"></div>
            <h1 className="font-semibold text-sm 2xl:text-2xl xl:text-xl lg:text-lg md:text-med sm:text-sm">{stockName}</h1>
          </div>
         
          <h1 className="font-light text-xs 2xl:text-lg">1 hr ago</h1>

        </div>
        <h1 className='font-light text-xs 2xl:text-lg 2xl:mt-2 xl:text-base'>{stockDescription}</h1>
      </div>

    </div>
  );
};

export default RecentSearch;