import React from 'react';

interface RelevantLinksProps {
  title: string;
  url: string;
  linkDescription: string;
}

const RelevantLink: React.FC<RelevantLinksProps> = ({
  title,
  url,
  linkDescription

}) => {
  return (
    <div className="flex flex-col h-20 2xl:h-32 w-64 2xl:w-72 bg-sky-100 rounded-2xl overflow-hidden py-2 pl-4 pr-2">
    <h1 className="text-sm text-sky-600 truncate 2xl:text-lg">{title}</h1>
    <p className="text-xs text-slate-500 overflow-hidden line-clamp-2 2xl:text-base">
      {linkDescription}
    </p>
  </div>
  );
};

export default RelevantLink;