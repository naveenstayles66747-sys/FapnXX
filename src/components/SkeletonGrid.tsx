import React from "react";

interface SkeletonGridProps {
  count?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex flex-col gap-2 rounded-xl overflow-hidden animate-pulse">
          {/* Thumbnail Shape */}
          <div className="w-full aspect-[16/9] rounded-xl bg-zinc-800/60 skeleton-shimmer border border-white/5" />
          
          {/* Title & Metadata Lines */}
          <div className="p-1 space-y-2">
            <div className="h-3.5 bg-zinc-800/80 skeleton-shimmer rounded-md w-4/5" />
            <div className="flex items-center gap-3">
              <div className="h-2.5 bg-zinc-800/50 skeleton-shimmer rounded w-16" />
              <div className="h-2.5 bg-zinc-800/50 skeleton-shimmer rounded w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonGrid;
