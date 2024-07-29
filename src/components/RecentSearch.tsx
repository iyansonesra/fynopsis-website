import React from 'react';

interface RecentSearchProps {
  image: string;
  stockName: string;
  stockDescription: string;
  imageType: 'circular' | 'rectangular';
}

const RecentSearch: React.FC<RecentSearchProps> = ({
  image,
  stockName,
  stockDescription,
  imageType,
}) => {
  return (
    <div className='bg-slate-100 rounded-2xl min-w-[280px] lg:w-full h-[120px] sm:h-[130px] md:h-[150px] lg:h-20 xl:h-28 2xl:h-40 flex flex-row overflow-hidden mr-4 lg:mr-0 mb-0 lg:mb-2'>
      <div className="textContainer flex w-full h-full flex-col px-4 2xl:pl-8 pt-2 2xl:pt-4 justify-start">
        <div className="headerContainer flex flex-row justify-between items-center">
          <div className="stockNameAndLogo flex flex-row items-center justify-center gap-2">
            <div className="logoContainer w-4 h-4 2xl:w-8 2xl:h-8 bg-blue-200 rounded-full m-auto"></div>
            <h1 className="font-semibold text-sm 2xl:text-xl xl:text-lg lg:text-base md:text-sm">{stockName}</h1>
          </div>
          <h1 className="font-light text-xs 2xl:text-lg">1 hr ago</h1>
        </div>
        <h1 className='font-light text-xs 2xl:text-lg 2xl:mt-2 xl:text-sm mt-1 line-clamp-3 lg:line-clamp-1'>{stockDescription}</h1>
      </div>
    </div>
  );
};

export default RecentSearch;