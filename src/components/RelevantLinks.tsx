import React from 'react';
import { Skeleton } from './ui/skeleton';

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
  return (
    <div className="relative flex flex-col h-40 md:h-20 2xl:h-32 w-64 2xl:w-72 bg-sky-100 rounded-2xl overflow-hidden">
      {isLoading ? (
        <Skeleton className="absolute inset-0 rounded-2xl" />
      ) : (
        <div className="p-2 pl-4">
          <h1 className="text-lg md:text-sm text-sky-600 truncate 2xl:text-lg">{title}</h1>
          <p className="text-base md:text-xs text-slate-500 overflow-hidden line-clamp-4 md:line-clamp-2 2xl:text-base">
            {linkDescription}
          </p>
        </div>
      )}
    </div>
  );
};

export default RelevantLink;