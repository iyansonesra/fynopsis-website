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
    <div style={{ width }} className='bg-slate-100 rounded-2xl sm:h-12 lg:h-16 xl:h-28 2xl:h-40 flex flex-row'>
      <div className="textContainer flex w-full h-full flex-col px-4 2xl:pl-8 pt-0 justify-start pt-4">
        <div className="headerContainer flex flex-row justify-between">
          <h1 className="font-semibold text-sm 2xl:text-lg">{stockName}</h1>
          <h1 className="font-semibold text-sm 2xl:text-lg">{stockName}</h1>

        </div>
        <h1 className='font-light text-xs 2xl:text-base'>{stockDescription}</h1>
      </div>

    </div>
  );
};

export default RecentSearch;