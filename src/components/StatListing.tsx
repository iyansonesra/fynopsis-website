import React from 'react';
import logo from '../app/assets/fynopsis_noBG.png'

interface StatListingProps {
  statName: string;
  statVal: string | number;
}

const StatListing: React.FC<StatListingProps> = ({
  statName,
  statVal
}) => {
  return (
    <div className='flex flex-col w-[50%] items-center px-4 py-1 '>
        <h1 className = 'text-black font-normal text-base md:text-sm 2xl:text-xl text-center'>{statName}</h1>
        <h1 className = 'text-sky-500 font-semibold text-base md:text-sm 2xl:text-xl text-center'>{statVal}</h1>
    </div>
  );
};

export default StatListing;