import React, { useState } from 'react';
import { BadgeInfo, Search } from 'lucide-react';
import { Input, Skeleton } from '@mui/material';

interface DetailsSectionProps {
    userSearch?: string;
}

const DetailSection: React.FC<DetailsSectionProps> = () => {
    const [userSearch, setUserSearch] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserSearch(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if(e.key === 'Enter') {
            setIsLoading(true);
        }
    };

    return (
        <div className="flex flex-col gap-2 px-4 py-4">
            <div className="flex flex-row gap-2">
                <BadgeInfo className='h-6 w-6 text-slate-800' />
                <h1 className='text-xl font-semibold text-slate-800'>Advanced Search</h1>
            </div>

            <div className="relative w-[80%]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                    className="w-full border-slate-200 rounded-xl outline-none pl-10 py-1"
                    placeholder='Search files...'
                    value={userSearch}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {isLoading && (
                <div className="w-full max-w-md transition-opacity duration-300 ${showSkeleton ? 'opacity-100' : 'opacity-0'}`">
                    <Skeleton animation="wave" className="h-5 w-full" />
                    <Skeleton animation="wave" className="h-5 w-[80%]" />
                    <Skeleton animation="wave" className="h-5 w-[60%]" />

                    <Skeleton animation="wave" className="h-5 w-full mt-4" />
                    <Skeleton animation="wave" className="h-5 w-[80%]" />
                    
                    <div className="flex flex-wrap w-full gap-2 mt-4">
                        <Skeleton variant="rectangular" animation="wave" className="h-16 w-20 rounded-xl" />
                        <Skeleton variant="rectangular" animation="wave" className="h-16 w-20 rounded-xl" />
                        <Skeleton variant="rectangular" animation="wave" className="h-16 w-20 rounded-xl" />
                        <Skeleton variant="rectangular" animation="wave" className="h-16 w-20 rounded-xl" />
                    </div>

                </div>
            )}
        </div>
    );
};

export default DetailSection;