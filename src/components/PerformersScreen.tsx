import React, { useState, useMemo } from 'react';
import { Performer, Video } from '../types';
import { VideoCard } from './VideoCard';
import { AdBanner, NativeRecommendationAd } from './AdSpaces';
import { deduplicateVideos } from '../utils/videoDeduplicator';

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
        const nameHash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const subCount = (nameHash % 45) + 5;
        if (!map.has(id)) {
          map.set(id, {
            performer: {
              id,
              name,
              avatar:
                v.performerAvatar ||
                v.thumbnail ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
              subscribers: `${subCount}K`,
              videosCount: 1,
              isFollowing: false,
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

  // Filter performers based on search query
  const filteredPerformers = useMemo(() => {
    if (!searchQuery.trim()) return performers;
    return performers.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [performers, searchQuery]);

  const visiblePerformers = filteredPerformers.slice(0, visibleCount);

  // Performer-specific videos when a performer is selected
  const performerVideos = useMemo<Video[]>(() => {
    if (!selectedPerformer) return [];
    const targetName = selectedPerformer.name.toLowerCase().trim();
    const cleanVideos = deduplicateVideos(videos || []);

    const list = cleanVideos.filter((v) => {
      if (!v || v.isTakenDown) return false;
      const matchDirect = (v.performerName || '').toLowerCase().trim() === targetName;
      const matchActors =
        Array.isArray(v.modelsActors) &&
        v.modelsActors.some((a) => (a || '').toLowerCase().trim() === targetName);
      const matchActorsAlt =
        Array.isArray(v.models_actors) &&
        v.models_actors.some((a) => (a || '').toLowerCase().trim() === targetName);
      const matchTitle = (v.title || '').toLowerCase().includes(targetName);
      const matchTags =
        Array.isArray(v.tags) &&
        v.tags.some((t) => (t || '').toLowerCase().trim() === targetName);

      return matchDirect || matchActors || matchActorsAlt || matchTitle || matchTags;
    });

    return deduplicateVideos(list);
  }, [videos, selectedPerformer]);

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 2: DEDICATED PORNSTAR FEED VIEW (when a card is clicked)
  // ═════════════════════════════════════════════════════════════════════════
  if (selectedPerformer) {
    return (
      <main className="flex-grow pt-4 lg:pt-8 px-3 sm:px-6 md:px-12 max-w-7xl mx-auto w-full lg:ml-64 pb-10">
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
          <NativeRecommendationAd
            key={`performer-ad-${selectedPerformer.id}`}
            reloadKey={selectedPerformer.id}
          />
        </div>

        {/* Video Grid for this Performer */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ec4899]">video_library</span>
              <span>
                Videos featuring {selectedPerformer.name} ({performerVideos.length})
              </span>
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
              <h3 className="text-base font-bold text-white">
                No Videos Found for {selectedPerformer.name}
              </h3>
              <p className="text-xs">Check back soon as new content is added daily!</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 1: MAIN PORNSTARS DIRECTORY GRID — Reference design (2-col)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <main className="flex-grow pt-0 pb-10 w-full lg:ml-64">
      {/* Page Header */}
      <div className="px-3 sm:px-6 md:px-12 max-w-7xl mx-auto pt-6 md:pt-8 mb-4">
        <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Pornstars</span>
          <span className="material-symbols-outlined text-[#ec4899]">stars</span>
        </h1>
      </div>

      {/* Search Bar */}
      <div className="px-3 sm:px-6 md:px-12 max-w-7xl mx-auto mb-4">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pornstar by name..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-zinc-100 dark:bg-[#18171b] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#ec4899] transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-500 text-xs cursor-pointer transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Ad Banner */}
      <div className="px-3 sm:px-6 md:px-12 max-w-7xl mx-auto mb-4">
        <div className="w-full flex items-center justify-center overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30 p-1 shadow-sm">
          <AdBanner key="performers-banner" reloadKey="performers" />
        </div>
      </div>

      {/* ── Responsive Multi-Column Grid ── */}
      {visiblePerformers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0 border-t border-l border-zinc-200 dark:border-white/[0.06]">
          {visiblePerformers.map((performer) => (
            <div
              key={performer.id}
              onClick={() => setSelectedPerformer(performer)}
              className="group cursor-pointer border-b border-r border-zinc-200 dark:border-white/[0.06] bg-white dark:bg-[#0f0e12] hover:bg-zinc-50 dark:hover:bg-[#1a1820] transition-colors duration-200 active:opacity-75"
            >
              {/* Portrait Photo (4:3 aspect ratio — same as reference) */}
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-900">
                <img
                  src={performer.avatar}
                  alt={performer.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                {/* Dark gradient at bottom of photo */}
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
                {/* ▶ N videos badge — bottom-left inside image (exact reference style) */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/65 backdrop-blur-sm px-1.5 py-0.5 rounded text-white text-[11px] font-semibold leading-none">
                  <span className="text-[9px] opacity-80">▶</span>
                  <span>{performer.videosCount} {performer.videosCount === 1 ? 'video' : 'videos'}</span>
                </div>
              </div>

              {/* Performer Name — bold uppercase below image (exact reference style) */}
              <div className="px-2.5 py-2.5">
                <h3 className="font-black text-[13px] sm:text-sm tracking-wide uppercase text-zinc-900 dark:text-white group-hover:text-[#ec4899] transition-colors duration-200 line-clamp-1">
                  {performer.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-3 sm:mx-6 md:mx-12 p-12 text-center text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-[#1c1b1d] rounded-3xl border border-zinc-200 dark:border-white/10 space-y-3">
          <span className="material-symbols-outlined text-5xl text-[#ec4899]">group_off</span>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No Pornstars Found</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            {searchQuery
              ? `No models found matching "${searchQuery}".`
              : 'No creator profiles available yet. Upload videos with performer names to populate this page.'}
          </p>
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < filteredPerformers.length && (
        <div className="mt-8 flex justify-center px-3">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 20)}
            className="px-8 py-3 rounded-2xl bg-[#ec4899] hover:bg-[#db2777] text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-lg shadow-[#ec4899]/30"
          >
            Load More ({filteredPerformers.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </main>
  );
};
