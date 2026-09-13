import React, { useState, useMemo, useEffect } from 'react';
import { Performer, Video } from '../types';
import { VideoCard } from './VideoCard';
import { AdBanner, NativeRecommendationAd } from './AdSpaces';
import { deduplicateVideos } from '../utils/videoDeduplicator';
import { videoService } from '../services/videoService';
import TOP_PERFORMERS_CATALOG from '../data/performersCatalog.json';

interface PerformersScreenProps {
  videos?: Video[];
  onSelectVideo?: (video: Video) => void;
  onNavigateToSearch?: (query: string) => void;
}

const ALPHABET = [
  'ALL',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

export const PerformersScreen: React.FC<PerformersScreenProps> = ({
  videos = [],
  onSelectVideo,
  onNavigateToSearch,
}) => {
  const [selectedPerformer, setSelectedPerformer] = useState<Performer | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'popular' | 'alpha'>('alpha');
  const [visibleCount, setVisibleCount] = useState<number>(48);
  const [livePerformerVideos, setLivePerformerVideos] = useState<Video[]>([]);
  const [isLoadingLiveVideos, setIsLoadingLiveVideos] = useState<boolean>(false);

  // Blacklist set to strictly prevent any category or non-human names
  const nonPerformerBlacklist = useMemo(
    () =>
      new Set([
        'outdoor', 'amateur', 'mature', 'hd', 'verified', 'anonymous', 'user uploaded',
        'public & outdoor star', 'mature & vintage star', 'amateur star', '4k', 'vr',
        'pov', 'anal', 'blowjob', 'creampie', 'milf', 'teen', 'latina', 'ebony',
        'asian', 'blonde', 'brunette', 'redhead', 'bbw', 'massage', 'public',
        'squirt', 'compilation', 'striptease', 'hentai', 'solo', 'babe', 'hardcore',
        'lesbian', 'interracial', 'threesome', 'fetish', 'masturbation', 'transgender',
        'trending', 'desi', 'indian'
      ]),
    []
  );

  // Build high-quality verified performers list
  const allPerformers = useMemo<Performer[]>(() => {
    const map = new Map<string, Performer>();

    // 1. Seed all 1,500+ top verified adult stars from catalog
    if (Array.isArray(TOP_PERFORMERS_CATALOG)) {
      TOP_PERFORMERS_CATALOG.forEach((item: any) => {
        if (!item || !item.name) return;
        const name = item.name.trim();
        const low = name.toLowerCase();

        if (nonPerformerBlacklist.has(low) || low.includes('star') || low.includes('creator')) {
          return;
        }

        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const viewsCount = item.totalViews || item.videosCount * 450000;
        const subCount = Math.max(15, Math.round((viewsCount / 100000) % 950));

        map.set(id, {
          id,
          name,
          avatar:
            item.avatar ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
          subscribers: `${subCount}K`,
          videosCount: item.videosCount || 1,
          isFollowing: false,
          bio: `Official verified adult creator channel & HD video catalog for ${name}.`,
          tags:
            Array.isArray(item.categories) && item.categories.length > 0
              ? item.categories.slice(0, 4)
              : ['Verified', 'HD', 'Top Rated'],
        });
      });
    }

    return Array.from(map.values());
  }, [nonPerformerBlacklist]);

  // Filter & Sort performers
  const filteredAndSortedPerformers = useMemo(() => {
    let list = [...allPerformers];

    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    // 2. Alphabet letter filter
    if (selectedLetter !== 'ALL') {
      const letter = selectedLetter.toUpperCase();
      list = list.filter((p) => p.name.toUpperCase().startsWith(letter));
    }

    // 3. Sorting
    if (sortBy === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } else {
      // Most popular by video count
      list.sort((a, b) => (b.videosCount || 0) - (a.videosCount || 0));
    }

    return list;
  }, [allPerformers, searchQuery, selectedLetter, sortBy]);

  const visiblePerformers = useMemo(
    () => filteredAndSortedPerformers.slice(0, visibleCount),
    [filteredAndSortedPerformers, visibleCount]
  );

  // Fetch live videos from the database whenever a performer profile is opened
  useEffect(() => {
    if (!selectedPerformer) {
      setLivePerformerVideos([]);
      return;
    }
    const performerName = selectedPerformer.name;
    setIsLoadingLiveVideos(true);

    videoService
      .searchLivePornhubVideos(performerName, undefined, 50)
      .then((liveVids) => {
        if (liveVids && liveVids.length > 0) {
          setLivePerformerVideos(liveVids);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingLiveVideos(false);
      });
  }, [selectedPerformer]);

  // Performer-specific videos when a performer is selected
  const performerVideos = useMemo<Video[]>(() => {
    if (!selectedPerformer) return [];
    const targetName = selectedPerformer.name.toLowerCase().trim();
    const cleanVideos = deduplicateVideos([...(videos || []), ...livePerformerVideos]);

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
  }, [videos, selectedPerformer, livePerformerVideos]);

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 2: DEDICATED PORNSTAR FEED VIEW (when a card is clicked)
  // ═════════════════════════════════════════════════════════════════════════
  if (selectedPerformer) {
    return (
      <main className="flex-grow pt-4 lg:pt-8 px-3 sm:px-6 md:px-12 max-w-7xl mx-auto w-full pb-16">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setSelectedPerformer(null)}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-transparent font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to All Pornstars</span>
        </button>

        {/* Performer Profile Hero Banner */}
        <section className="mb-8 p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-pink-50 via-white to-slate-50 border border-slate-200 dark:from-[#e0358d]/20 dark:via-[#18171c] dark:to-[#09090b] dark:border-white/10 shadow-lg dark:shadow-2xl flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden ring-2 ring-[#ec4899] shadow-[0_0_20px_rgba(236,72,153,0.4)] shrink-0 bg-slate-100 dark:bg-black">
            <img
              src={selectedPerformer.avatar}
              alt={selectedPerformer.name}
              className="w-full h-full object-cover object-top"
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {selectedPerformer.name}
              </h1>
              <span className="material-symbols-outlined text-[#ec4899] text-xl" title="Verified Creator">
                verified
              </span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-3 text-xs font-semibold text-slate-600 dark:text-zinc-300 flex-wrap">
              <span className="bg-[#ec4899]/15 text-[#ec4899] px-2.5 py-0.5 rounded-full font-bold border border-[#ec4899]/30">
                {selectedPerformer.videosCount || performerVideos.length} Videos
              </span>
              <span>⭐ Top Rated Creator</span>
              {selectedPerformer.tags && selectedPerformer.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {selectedPerformer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-slate-100 border border-slate-200 dark:bg-white/5 dark:border-white/10 px-2 py-0.5 rounded-md text-[11px] text-slate-700 dark:text-zinc-400 capitalize"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-xl">
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
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ec4899]">video_library</span>
              <span>
                Videos featuring {selectedPerformer.name} ({performerVideos.length})
              </span>
            </h2>
            {isLoadingLiveVideos && (
              <span className="text-xs text-[#ec4899] animate-pulse flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                Loading full catalog...
              </span>
            )}
          </div>

          {performerVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3.5 md:gap-4 lg:gap-5">
              {performerVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={() => onSelectVideo && onSelectVideo(video)}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-[#121115] rounded-3xl border border-slate-200 dark:border-white/10 space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#ec4899]">videocam_off</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
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
  // VIEW 1: MAIN PORNSTARS DIRECTORY GRID (A-Z, Search, Real Photos)
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <main className="flex-grow pt-0 pb-16 w-full">
      {/* ── Page Header & Controls ── */}
      <div className="px-3 sm:px-6 md:px-12 max-w-7xl mx-auto pt-6 md:pt-8 mb-5 space-y-4">
        {/* Title + Sort Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Pornstars
            </h1>
            <span className="bg-[#ec4899]/15 text-[#ec4899] text-xs font-black px-2.5 py-1 rounded-full border border-[#ec4899]/30">
              {filteredAndSortedPerformers.length.toLocaleString()}
            </span>
          </div>

          {/* Sort Switcher (A-Z vs Most Popular) */}
          <div className="flex items-center bg-slate-100 dark:bg-[#18171b] p-1 rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setSortBy('alpha')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                sortBy === 'alpha'
                  ? 'bg-[#ec4899] text-white shadow-md'
                  : 'text-slate-700 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">sort_by_alpha</span>
              <span>A to Z</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('popular')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                sortBy === 'popular'
                  ? 'bg-[#ec4899] text-white shadow-md'
                  : 'text-slate-700 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">local_fire_department</span>
              <span>Most Popular</span>
            </button>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(48);
            }}
            placeholder="Search pornstar by name (e.g. Mia Khalifa, Sunny Leone, Abella Danger)..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white dark:bg-[#18171b] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#ec4899] transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 text-sm cursor-pointer transition-colors p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── A to Z Alphabet Bar ── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
          {ALPHABET.map((letter) => {
            const isActive = selectedLetter === letter;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => {
                  setSelectedLetter(letter);
                  setVisibleCount(48);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#ec4899] text-white shadow-md scale-105'
                    : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200 dark:bg-[#141316] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/10 dark:border-white/5'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ad Banner */}
      <div className="px-3 sm:px-6 md:px-12 max-w-7xl mx-auto mb-5">
        <div className="w-full flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 p-1 shadow-sm">
          <AdBanner key="performers-banner" reloadKey="performers" />
        </div>
      </div>

      {/* ── Responsive Multi-Column Grid ── */}
      {visiblePerformers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0 border-t border-l border-slate-200 dark:border-white/[0.06]">
          {visiblePerformers.map((performer) => (
            <div
              key={performer.id}
              onClick={() => setSelectedPerformer(performer)}
              className="performer-card group cursor-pointer border-b border-r border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0f0e12] hover:bg-slate-50 dark:hover:bg-[#1a1820] transition-colors duration-200 active:opacity-75"
            >
              {/* Portrait Photo (4:3 aspect ratio) */}
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-zinc-900">
                <img
                  src={performer.avatar}
                  alt={performer.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                {/* Dark gradient at bottom of photo */}
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
                {/* ▶ N videos badge */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/65 backdrop-blur-sm px-1.5 py-0.5 rounded text-white text-[11px] font-semibold leading-none shadow-sm">
                  <span className="text-[9px] text-[#ec4899]">▶</span>
                  <span>{performer.videosCount} {performer.videosCount === 1 ? 'video' : 'videos'}</span>
                </div>
              </div>

              {/* Performer Name */}
              <div className="px-2.5 py-2.5 bg-white dark:bg-[#0f0e12]">
                <h3 className="performer-name font-black text-[13px] sm:text-sm tracking-wide uppercase text-slate-900 dark:text-white group-hover:text-[#ec4899] transition-colors duration-200 line-clamp-1">
                  {performer.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-3 sm:mx-6 md:mx-12 p-12 text-center text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-[#1c1b1d] rounded-3xl border border-slate-200 dark:border-white/10 space-y-3">
          <span className="material-symbols-outlined text-5xl text-[#ec4899]">group_off</span>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Pornstars Found</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
            {searchQuery
              ? `No pornstars found matching "${searchQuery}".`
              : `No pornstars found starting with letter "${selectedLetter}".`}
          </p>
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < filteredAndSortedPerformers.length && (
        <div className="mt-8 flex justify-center px-3">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 48)}
            className="px-8 py-3.5 rounded-2xl bg-[#ec4899] hover:bg-[#db2777] text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-lg shadow-[#ec4899]/30 flex items-center gap-2"
          >
            <span>Load More Pornstars</span>
            <span className="bg-black/20 px-2 py-0.5 rounded-full text-[11px]">
              {filteredAndSortedPerformers.length - visibleCount} remaining
            </span>
          </button>
        </div>
      )}
    </main>
  );
};
