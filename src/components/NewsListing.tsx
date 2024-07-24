import React from 'react';

interface NewsListingProps {
  image: string;
  stockName: string;
  stockDescription: string;
  width: number | string;
  imageType: 'circular' | 'rectangular';
}

const NewsListing: React.FC<NewsListingProps> = ({
  image,
  stockName,
  stockDescription,
  width,
  imageType,
}) => {
  return (
    <div style={{ width}} className='sm:h-8 lg:h-12 xl:h-24 2xl:h-36 flex flex-row'>
        <div className = " circleContainer w-28 h-full ml-4 items-align justify-center flex">
            <div className = "circle w-16 h-16 2xl:w-24 2xl:h-24 bg-blue-200 rounded-full m-auto"></div>
        </div>

        <div className = "textContainer flex w-full h-full flex-col pl-4 2xl:pl-8 pt-0 items-align justify-center">
            <h1 className = "font-semibold text-sm 2xl:text-lg">{stockName}</h1>
            <h1 className='font-light text-xs 2xl:text-base'>{stockDescription}</h1>
        </div>

    </div>
  );
};

export default NewsListing;