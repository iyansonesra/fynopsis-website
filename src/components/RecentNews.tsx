import React from 'react';

interface RecentNewsProps {
  image: string;
  stockName: string;
  stockDescription: string;
  width: number | string;
  imageType: 'circular' | 'rectangular';
}

const RecentNews: React.FC<RecentNewsProps> = ({
  image,
  stockName,
  stockDescription,
  width,
  imageType,
}) => {
  return (
    <div style={{ width}} className='sm:h-8 lg:h-12 xl:h-24 2xl:h-36 flex flex-row'>
        <div className = "rectContainer flex-[1] h-full ml-2 items-align justify-center py-2 flex">
            <div className = "circle w-[90%] h-full 2xl:w-[90%] 2xl:h-24 bg-blue-200 rounded-2xl m-auto"></div>
        </div>

        <div className = "textContainer flex flex-[2] w-full h-full flex-col pl-4 2xl:pl-8 pt-0 px-2 items-align justify-center">
            <h1 className = "font-semibold text-sm 2xl:text-lg">{stockName}</h1>
            <h1 className='font-light text-xs 2xl:text-base'>{stockDescription}</h1>
        </div>

        <div className = "graphContainer rounded-2xl py-2 flex flex-[1] w-full h-full flex-col pl-4 2xl:pl-8 pt-0 items-align justify-center">
           
        </div>

    </div>
  );
};

export default RecentNews;