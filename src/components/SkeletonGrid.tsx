import React from "react";

interface SkeletonGridProps {
  count?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3.5 md:gap-4 p-2 sm:p-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex flex-col gap-1.5 rounded-lg sm:rounded-xl overflow-hidden gpu-smooth">
          {/* Thumbnail Shape with wave shimmer */}
          <div className="relative w-full aspect-[16/9] rounded-lg sm:rounded-xl bg-zinc-800/60 overflow-hidden border border-white/5">
            <div className="absolute inset-0 -translate-x-full animate-skeleton-wave bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          </div>
          
          {/* Title & Metadata Lines */}
          <div className="pt-1.5 px-0.5 space-y-2">
            <div className="relative h-3.5 bg-zinc-800/80 rounded-md w-4/5 overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-skeleton-wave bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-zinc-800/80 shrink-0" />
              <div className="relative h-2.5 bg-zinc-800/50 rounded w-20 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-skeleton-wave bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
              </div>
              <div className="relative h-2.5 bg-zinc-800/50 rounded w-12 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-skeleton-wave bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonGrid;

