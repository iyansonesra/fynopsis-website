import React from 'react';

interface RegInnovProps {
    type: string;
    date: string;
    info: string;
}

const RegInnov: React.FC<RegInnovProps> = ({
    type,
    date,
    info,
}) => {
    const getBackgroundColor = () => {
        if (type.toLowerCase() === 'regulation') return 'bg-red-100';
        if (type.toLowerCase() === 'innovation') return 'bg-blue-100';
        return 'bg-blue-200'; // default color
    };

    const getBackgroundColorDark = () => {
        if (type.toLowerCase() === 'regulation') return 'bg-red-700';
        if (type.toLowerCase() === 'innovation') return 'bg-blue-700';
        return 'bg-blue-700'; // default color
    };

    return (
        <div className='w-full inline-block pr-4 pl-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition delay-50 rounded-xl'>
            <div className="flex flex-row items-center justify-between mb-1">
                <h1 className={`text-xs 2xl:text-sm px-2 py-1 font-medium ${getBackgroundColor()} dark:${getBackgroundColorDark()} rounded-full`}>{type}</h1>
                <h1 className="italic text-xs 2xl:text-sm">{date}</h1>
            </div>
            <h1 className='text-xs 2xl:text-sm'>{info}</h1>
        </div>
    );
};

export default RegInnov;