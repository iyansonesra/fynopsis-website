import React from 'react';

interface BreadcrumbProps {
    paths: string[];
    onNavigate: (index: number) => void;
}

const truncateString = (str: string, maxLength: number): string => {
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ paths, onNavigate }) => {
    return (
        <div className="flex items-center gap-2 text-md text-gray-600 ">
            <span
                className="hover:text-blue-500 cursor-pointer"
                onClick={() => onNavigate(-1)}
            >
                Home
            </span>
            {paths.map((path, index) => (
                <React.Fragment key={index}>
                    <span className="text-gray-400">&gt;</span>
                    <span
                        className="hover:text-blue-500 cursor-pointer"
                        onClick={() => onNavigate(index)}
                    >
                        {truncateString(path, 17)}
                    </span>
                </React.Fragment>
            ))}
        </div>
    );
};

export default Breadcrumb;
