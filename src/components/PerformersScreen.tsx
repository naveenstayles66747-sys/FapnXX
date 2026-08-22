import React, { useState } from 'react';
import { Performer } from '../types';
import { PERFORMERS } from '../data';

export const PerformersScreen: React.FC = () => {
  const [performers, setPerformers] = useState<Performer[]>(PERFORMERS);
  const [filterTag, setFilterTag] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState<number>(5);

  const toggleFollow = (id: string) => {
    setPerformers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFollowing: !p.isFollowing } : p))
    );
  };

  const filteredPerformers = React.useMemo(() => {
    return filterTag === 'All'
      ? performers
      : performers.filter((p) =>
          p.tags?.some((t) => t.toLowerCase() === filterTag.toLowerCase()) ||
          p.name.toLowerCase().includes(filterTag.toLowerCase()) ||
          p.bio?.toLowerCase().includes(filterTag.toLowerCase())
        );
  }, [performers, filterTag]);

  const visiblePerformers = filteredPerformers.slice(0, visibleCount);

  return (
    <main className="flex-grow pt-8 lg:pt-12 px-4 md:px-12 max-w-7xl mx-auto w-full lg:ml-64 pb-32">
      {/* Header Section */}
      <section className="mb-8 md:mb-10 text-center md:text-left">
        <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-[#e5e1e4] mb-2 tracking-tight">
          Discover Pornstars
        </h2>
        <p className="text-base text-zinc-600 dark:text-[#debec8] max-w-2xl">
          Explore exclusive content and connect with top talent.
        </p>
      </section>

      {/* Filter Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-8 hide-scrollbar scroll-smooth">
        {['All', 'Trending', 'New Arrivals', 'Exclusive', 'POV', 'MILF', 'Amateur'].map((tag) => (
          <button
            key={tag}
            onClick={() => {
              React.startTransition(() => {
                setFilterTag(tag);
                setVisibleCount(5);
              });
            }}
            className={`px-5 py-2 rounded-full font-semibold text-xs whitespace-nowrap cursor-pointer transition-all active:scale-95 ${
              filterTag === tag
                ? 'bg-[#ec4899] text-white shadow-neon-pink'
                : 'bg-white dark:bg-[#2a2a2c] text-zinc-800 dark:text-[#e5e1e4] border border-zinc-200 dark:border-transparent hover:bg-zinc-100 dark:hover:bg-[#353437]'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Performer Grid */}
      {visiblePerformers.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-8">
          {visiblePerformers.map((performer) => (
            <div key={performer.id} className="group flex flex-col items-center text-center">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden mb-4 relative ring-1 ring-zinc-300 dark:ring-[#574048] group-hover:ring-[#ec4899] transition-all duration-300 shadow-[0_0_15px_rgba(236,72,153,0)] group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                <img
                  src={performer.avatar}
                  alt={performer.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <h3 className="font-semibold text-sm md:text-base text-zinc-900 dark:text-[#e5e1e4] mb-1">
                {performer.name}
              </h3>

              <p className="text-xs text-zinc-500 dark:text-[#debec8] mb-3">
                {performer.subscribers} Subscribers
              </p>

              <button
                onClick={() => toggleFollow(performer.id)}
                className={`w-full py-2 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer active:scale-95 ${
                  performer.isFollowing
                    ? 'border border-[#ec4899] bg-[#ec4899]/15 text-[#ec4899] hover:bg-[#ec4899] hover:text-white'
                    : 'border border-zinc-300 dark:border-[#574048] text-zinc-800 dark:text-[#e5e1e4] hover:bg-[#ec4899] hover:text-white hover:border-[#ec4899]'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: performer.isFollowing ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {performer.isFollowing ? 'check_circle' : 'person_add'}
                </span>
                <span>{performer.isFollowing ? 'Following' : 'Follow'}</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-zinc-600 dark:text-[#debec8] bg-zinc-100 dark:bg-[#1c1b1d] rounded-2xl border border-zinc-200 dark:border-[#353437] space-y-3">
          <span className="material-symbols-outlined text-5xl text-[#ec4899] dark:text-[#ffb0cd]">group_off</span>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No Creators Listed Yet</h3>
          <p className="text-sm text-zinc-500 dark:text-[#debec8] max-w-md mx-auto">
            No creator profiles have been added yet. Check back soon!
          </p>
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < filteredPerformers.length && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className="px-8 py-3 rounded-full border border-zinc-300 dark:border-[#574048] text-zinc-800 dark:text-[#e5e1e4] font-semibold text-xs tracking-wider uppercase hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
          >
            Load More Pornstars ({filteredPerformers.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </main>
  );
};
