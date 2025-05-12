import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
      <div className="flex items-center space-x-4">
        {/* Avatar skeleton */}
        <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10 animate-pulse" />

        {/* Text content skeleton */}
        <div className="space-y-2">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Right side actions skeleton */}
      <div className="flex items-center space-x-3">
        <div className="h-8 w-[140px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      </div>
    </div>
  );
}; 