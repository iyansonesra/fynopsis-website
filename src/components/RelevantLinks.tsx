import React from 'react';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';

interface RelevantLinksProps {
  title: string;
  url: string;
  linkDescription: string;
  isLoading?: boolean;
}

const RelevantLink: React.FC<RelevantLinksProps> = ({
  title,
  url,
  linkDescription,
  isLoading
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!url) {
      e.preventDefault();
    }
  };

  return (
    <Link 
      href={url || '#'} 
      target="_blank" 
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block"
    >
      <div className="relative flex flex-col h-40 md:h-20 2xl:h-20 w-64 2xl:w-72 bg-sky-100 rounded-2xl overflow-hidden cursor-pointer transition-transform hover:scale-105">
        {isLoading ? (
          <Skeleton className="absolute inset-0 rounded-2xl" />
        ) : (
          <div className="p-2 pl-4">
            <h1 className="text-lg md:text-sm text-sky-600 line-clamp-2 2xl:text-lg">{title}</h1>
            <p className="text-base md:text-xs text-slate-500 overflow-hidden line-clamp-4 md:line-clamp-2 2xl:text-base">
              {linkDescription}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
};

export default RelevantLink;