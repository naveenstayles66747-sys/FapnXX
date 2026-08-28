import React, { useState, useMemo } from 'react';
import { Performer, Video } from '../types';
import { VideoCard } from './VideoCard';
import { AdBanner, NativeRecommendationAd } from './AdSpaces';

interface PerformersScreenProps {
  videos?: Video[];
  onSelectVideo?: (video: Video) => void;
  onNavigateToSearch?: (query: string) => void;
}

export const PerformersScreen: React.FC<PerformersScreenProps> = ({
  videos = [],
  onSelectVideo,
  onNavigateToSearch,
}) => {
  const [selectedPerformer, setSelectedPerformer] = useState<Performer | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Dynamically extract real unique performers from genuine uploaded videos
  const performers = useMemo<Performer[]>(() => {
    const map = new Map<string, { performer: Performer; videos: Video[] }>();

    (videos || []).forEach((v) => {
      if (!v || v.isTakenDown) return;
      const performerNames: string[] = [];

      if (v.performerName && v.performerName.trim() && v.performerName !== 'User Uploaded' && v.performerName !== 'Anonymous') {
        performerNames.push(v.performerName.trim());
      }
      if (Array.isArray(v.modelsActors)) {
        v.modelsActors.forEach((m) => {
          if (m && typeof m === 'string' && m.trim()) performerNames.push(m.trim());
        });
      }
      if (Array.isArray(v.models_actors)) {
        v.models_actors.forEach((m) => {
          if (m && typeof m === 'string' && m.trim()) performerNames.push(m.trim());
        });
      }

      performerNames.forEach((name) => {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        if (!map.has(id)) {
          map.set(id, {
            performer: {
              id,
              name,
              avatar: v.performerAvatar || v.thumbnail || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
              subscribers: `${Math.floor(Math.random() * 20 + 2)}K`,
              videosCount: 1,
              bio: `Official video channel & exclusive content for ${name}.`,
              tags: Array.isArray(v.tags) && v.tags.length > 0 ? v.tags : ['HD', 'Verified'],
            },
            videos: [v],
          });
        } else {
          const entry = map.get(id)!;
          entry.performer.videosCount += 1;
          if (!entry.videos.some((existing) => existing.id === v.id)) {
            entry.videos.push(v);
          }
        }
      });
    });

    return Array.from(map.values()).map((e) => e.performer);
  }, [videos]);

  // Filter performers based on tag or search query
  const filteredPerformers = useMemo(() => {
    return performers.filter((p) => {
      const matchesSearch = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesTag =
        filterTag === 'All' ||
        p.tags?.some((t) => t.toLowerCase() === filterTag.toLowerCase()) ||
        p.name.toLowerCase().includes(filterTag.toLowerCase());
      return matchesSearch && matchesTag;
    });
  }, [performers, searchQuery, filterTag]);

  const visiblePerformers = filteredPerformers.slice(0, visibleCount);

  // Performer-specific videos when a performer is selected
  const performerVideos = useMemo<Video[]>(() => {
    if (!selectedPerformer) return [];
    const targetName = selectedPerformer.name.toLowerCase().trim();

    return (videos || []).filter((v) => {
      if (!v || v.isTakenDown) return false;
      const matchDirect = (v.performerName || '').toLowerCase().trim() === targetName;
      const matchActors = Array.isArray(v.modelsActors) && v.modelsActors.some((a) => (a || '').toLowerCase().trim() === targetName);
      const matchActorsAlt = Array.isArray(v.models_actors) && v.models_actors.some((a) => (a || '').toLowerCase().trim() === targetName);
      const matchTitle = (v.title || '').toLowerCase().includes(targetName);
      const matchTags = Array.isArray(v.tags) && v.tags.some((t) => (t || '').toLowerCase().trim() === targetName);

      return matchDirect || matchActors || matchActorsAlt || matchTitle || matchTags;
    });
  }, [videos, selectedPerformer]);

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 2: DEDICATED PORNSTAR FEED VIEW (When a card is clicked)
  // ═════════════════════════════════════════════════════════════════════════
  if (selectedPerformer) {
    return (
      <main className="flex-grow pt-4 lg:pt-8 px-3 sm:px-6 md:px-12 max-w-7xl mx-auto w-full lg:ml-64 pb-32">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setSelectedPerformer(null)}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-800 dark:text-white font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to All Pornstars</span>
        </button>

        {/* Performer Profile Hero Banner */}
        <section className="mb-8 p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-[#e0358d]/20 via-[#18171c] to-[#09090b] border border-white/10 shadow-2xl flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden ring-2 ring-[#ec4899] shadow-[0_0_20px_rgba(236,72,153,0.4)] shrink-0 bg-black">
            <img
              src={selectedPerformer.avatar}
              alt={selectedPerformer.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                {selectedPerformer.name}
              </h1>
              <span className="material-symbols-outlined text-[#ec4899] text-xl" title="Verified Creator">
                verified
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex-wrap">
              <span className="bg-[#ec4899]/20 text-[#ec4899] px-2.5 py-0.5 rounded-full font-bold border border-[#ec4899]/30">
                {performerVideos.length} {performerVideos.length === 1 ? 'Video' : 'Videos'}
              </span>
              <span>⭐ Top Rated Creator</span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
              {selectedPerformer.bio}
            </p>
          </div>
        </section>

        {/* Native Recommendation Ad */}
        <div className="mb-8 w-full">
          <NativeRecommendationAd key={`performer-ad-${selectedPerformer.id}`} reloadKey={selectedPerformer.id} />
        </div>

        {/* Video Grid for this Performer */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ec4899]">video_library</span>
              <span>Videos featuring {selectedPerformer.name} ({performerVideos.length})</span>
            </h2>
          </div>

          {performerVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-6 gap-x-4 sm:gap-6">
              {performerVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={() => onSelectVideo && onSelectVideo(video)}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-[#121115] rounded-3xl border border-white/10 space-y-2">
              <span className="material-symbols-outlined text-4xl text-rose-500">videocam_off</span>
              <h3 className="text-base font-bold text-white">No Videos Found for {selectedPerformer.name}</h3>
              <p className="text-xs">Check back soon as new content is added daily!</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 1: MAIN PORNSTARS DIRECTORY GRID VIEW
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <main className="flex-grow pt-6 lg:pt-10 px-3 sm:px-6 md:px-12 max-w-7xl mx-auto w-full lg:ml-64 pb-32">
      {/* Header Section */}
      <section className="mb-6 md:mb-8 text-center md:text-left">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white mb-2 tracking-tight flex items-center justify-center md:justify-start gap-2.5">
          <span>Pornstars & Models</span>
          <span className="material-symbols-outlined text-[#ec4899] text-2xl sm:text-3xl">stars</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Browse top pornstars and creators. Click any pornstar to watch all their videos.
        </p>
      </section>

      {/* Search & Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pornstar by name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#18171b] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#ec4899] transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* In-Page Ad Banner */}
      <div className="mb-8 w-full flex items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30 p-1.5 shadow-sm">
        <AdBanner key={`performers-banner-${filterTag}`} reloadKey={filterTag} />
      </div>

      {/* Performer Cards Grid (Photo on top, Name below, Click to open feed) */}
      {visiblePerformers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {visiblePerformers.map((performer) => (
            <div
              key={performer.id}
              onClick={() => setSelectedPerformer(performer)}
              className="group flex flex-col items-center p-3 rounded-2xl bg-zinc-100/70 hover:bg-zinc-200 dark:bg-[#151419] dark:hover:bg-[#1f1d24] border border-zinc-200 dark:border-white/10 hover:border-[#ec4899] transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl active:scale-95 text-center"
            >
              {/* Performer Image */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden mb-3 relative ring-2 ring-transparent group-hover:ring-[#ec4899] transition-all duration-300 shadow-md bg-black shrink-0">
                <img
                  src={performer.avatar}
                  alt={performer.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                />
              </div>

              {/* Performer Name */}
              <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white group-hover:text-[#ec4899] transition-colors mb-1 line-clamp-1 flex items-center justify-center gap-1">
                <span>{performer.name}</span>
                <span className="material-symbols-outlined text-[#ec4899] text-[13px]">verified</span>
              </h3>

              {/* Video Count Tag */}
              <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                {performer.videosCount} {performer.videosCount === 1 ? 'Video' : 'Videos'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-[#1c1b1d] rounded-3xl border border-zinc-200 dark:border-white/10 space-y-3">
          <span className="material-symbols-outlined text-5xl text-[#ec4899]">group_off</span>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No Pornstars Found</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            {searchQuery ? `No models found matching "${searchQuery}".` : 'No creator profiles available yet.'}
          </p>
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < filteredPerformers.length && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 15)}
            className="px-8 py-3 rounded-2xl bg-[#ec4899] hover:bg-[#db2777] text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-lg shadow-[#ec4899]/30"
          >
            Load More Models ({filteredPerformers.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </main>
  );
};

