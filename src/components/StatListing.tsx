import React from 'react';
import logo from '../app/assets/fynopsis_noBG.png'
import { Skeleton } from './ui/skeleton';

interface StatListingProps {
    statName: string;
    statVal: string | number;
    isLoading?: boolean;
}

const StatListing: React.FC<StatListingProps> = ({
    statName,
    statVal,
    isLoading
}) => {
    return (

        <div className='flex flex-col w-[50%] items-center px-4 py-1 '>
            <h1 className='text-black font-normal text-base md:text-sm 2xl:text-xl text-center dark:text-white'>{statName}</h1>

            {isLoading ? (
                <Skeleton className='w-[70%] h-4 mt-1 rounded-full' />) :
                (
                    <>
                        <h1 className='text-sky-500 font-semibold text-base md:text-sm 2xl:text-xl text-center'>{statVal}</h1>
                    </>
                )
            }
        </div >
    );
};

export default StatListing;