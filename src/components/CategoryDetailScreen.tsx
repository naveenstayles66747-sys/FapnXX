import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { CategoryId, CategoryInfo, Video } from '../types';
import { CATEGORIES, VIDEOS } from '../data';
import { VideoCard } from './VideoCard';
import { AdBanner, OutstreamVideoCardAd, NativeRecommendationAd } from './AdSpaces';
import { AD_CONFIG } from '../config/adConfig';
import {
  getCategoryHeroImage,
  handleCategoryImageError,
  getOptimizedImageUrl,
  getResponsiveImageSrcSet,
} from '../utils/mediaHelper';
import { deduplicateVideos } from '../utils/videoDeduplicator';

interface CategoryDetailScreenProps {
  categoryId: CategoryId;
  onSelectVideo: (video: Video) => void;
  onSelectCategory?: (id: CategoryId) => void;
  onNavigate?: (screen: ScreenId) => void;
  onSelectSubtag?: (tag: string) => void;
  videos?: Video[];
  categories?: CategoryInfo[];
  userEmail?: string | null;
}

export const CategoryDetailScreen: React.FC<CategoryDetailScreenProps> = ({
  categoryId,
  onSelectVideo,
  onSelectCategory,
  onNavigate,
  videos = VIDEOS,
  categories = CATEGORIES,
  userEmail,
}) => {
  const category = (categories || []).find((c) => c && c.id === categoryId) || (categories && categories[0]) || CATEGORIES[0];
  const activeVideos = React.useMemo(
    () => deduplicateVideos(videos || []),
    [videos]
  );
  const categoryVideos = React.useMemo(() => {
    return deduplicateVideos(
      activeVideos.filter(
        (v) =>
          v &&
          (v.category === categoryId ||
            categoryId === 'trending' ||
            (Array.isArray(v.categories) && v.categories.includes(categoryId)))
      )
    );
  }, [activeVideos, categoryId]);

  const [selectedSubtag, setSelectedSubtag] = React.useState<string>('All');
  const [sortBy, setSortBy] = React.useState<'newest' | 'views'>('newest');
  const [isSavedCategory, setIsSavedCategory] = React.useState<boolean>(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const PAGE_SIZE = 24;
  const categoryGridTopRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [categoryId, selectedSubtag, sortBy]);

  const handleToggleMyList = () => {
    setIsSavedCategory(!isSavedCategory);
    setToastMsg(!isSavedCategory ? `Saved ${category.name} to My List` : `Removed ${category.name} from My List`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSelectSubtag = (tag: string) => {
    React.startTransition(() => {
      setSelectedSubtag(tag);
      setCurrentPage(1);
    });
  };

  const handleToggleSort = () => {
    React.startTransition(() => {
      setSortBy((prev) => (prev === 'newest' ? 'views' : 'newest'));
      setCurrentPage(1);
    });
  };

  // Subtags filter & sorting logic
  const filteredCategoryVideos = React.useMemo(() => {
    const list = categoryVideos.filter((v) => {
      if (!v) return false;
      if (selectedSubtag === 'All') return true;
      const lowerSubtag = (selectedSubtag || '').toLowerCase();
      const tags = Array.isArray(v.tags) ? v.tags : [];
      const title = (v.title || '').toLowerCase();
      const desc = (v.description || '').toLowerCase();
      return (
        tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(lowerSubtag)) ||
        title.includes(lowerSubtag) ||
        desc.includes(lowerSubtag)
      );
    });

    if (sortBy === 'views') {
      const getNum = (v: Video) => {
        if (!v) return 0;
        if (typeof v.viewsCount === 'number' && !isNaN(v.viewsCount)) return v.viewsCount;
        const str = typeof v.views === 'string' ? v.views.toUpperCase() : typeof v.views === 'number' ? `${v.views}` : '';
        if (str.includes('M')) return parseFloat(str) * 1_000_000;
        if (str.includes('K')) return parseFloat(str) * 1_000;
        return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
      };
      list.sort((a, b) => getNum(b) - getNum(a));
    } else {
      list.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
    }

    return deduplicateVideos(list);
  }, [categoryVideos, selectedSubtag, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredCategoryVideos.length / PAGE_SIZE));
  const effectiveCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const displayedCategoryVideos = React.useMemo(() => {
    const start = (effectiveCurrentPage - 1) * PAGE_SIZE;
    return deduplicateVideos(filteredCategoryVideos.slice(start, start + PAGE_SIZE));
  }, [filteredCategoryVideos, effectiveCurrentPage]);

  const [isPageSwitching, setIsPageSwitching] = useState<boolean>(false);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === effectiveCurrentPage) return;
    setIsPageSwitching(true);
    if (categoryGridTopRef.current) {
      categoryGridTopRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    React.startTransition(() => {
      setCurrentPage(newPage);
    });
    setTimeout(() => {
      setIsPageSwitching(false);
    }, 180);
  };

  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 2) {
      return [1, 2, 3, '...', total];
    }
    if (current >= total - 1) {
      return [1, '...', total - 2, total - 1, total];
    }
    return [1, '...', current, '...', total];
  };

  const subtags = ['All', 'Exclusive', 'POV', '4K', 'Romance', 'Sensual'];

  return (
    <main className="w-full lg:ml-64 pb-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 bg-[#ec4899] text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs">
          <span className="material-symbols-outlined text-[#fafafa]">bookmark</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hero Header Banner Section */}
      <section className="hero-banner-container relative min-h-[240px] sm:min-h-[300px] md:h-[380px] lg:h-[420px] w-full flex items-end p-4 sm:p-6 md:p-12 overflow-hidden border-b border-[#353437]">
        {/* Top Floating Back Button */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-30">
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('categories') : (onSelectCategory ? onSelectCategory('all') : undefined)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-lg hover:border-[#e0358d]"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>All Categories</span>
          </button>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/60 to-[#131315]/20 z-10" />
        <div className="absolute inset-0 z-0">
          {(() => {
            const rawHero = getCategoryHeroImage(category);
            const optimizedHero = getOptimizedImageUrl(rawHero, 1200, 75);
            const srcSet = getResponsiveImageSrcSet(rawHero, [640, 1080, 1600], 75);
            return (
              <img
                src={optimizedHero}
                srcSet={srcSet || undefined}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1600px"
                alt={category.name}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onError={(e) => handleCategoryImageError(e, category.id)}
                className="w-full h-full object-cover object-center"
              />
            );
          })()}
        </div>

        <div className="relative z-20 max-w-7xl w-full">
          <h1 className="hero-banner-title hero-text banner-title text-4xl md:text-6xl font-extrabold !text-white mb-3 tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
            {category.name}
          </h1>
          <p className="hero-banner-subtitle text-base md:text-lg !text-zinc-100 max-w-2xl leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] font-medium">
            {category.description}
          </p>

          {/* MY LIST Button (Rendered ONLY when user is logged in / signed up) */}
          {userEmail && (
            <div className="pt-5 flex flex-wrap gap-4">
              <button
                onClick={handleToggleMyList}
                className={`border font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full transition-colors flex items-center space-x-2 cursor-pointer active:scale-95 ${
                  isSavedCategory
                    ? 'bg-[#ec4899] text-white border-[#ec4899]'
                    : 'bg-transparent border-[#574048] text-[#fafafa] hover:bg-white/10'
                }`}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: isSavedCategory ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {isSavedCategory ? 'check' : 'add'}
                </span>
                <span>{isSavedCategory ? 'SAVED TO MY LIST' : 'MY LIST'}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Subtags / Filter Navigation Chips */}
      <section className="px-6 md:px-12 py-5 border-b border-zinc-200 dark:border-[#353437] bg-zinc-100/80 dark:bg-[#1c1b1d]/50 transition-colors">
        <div className="flex overflow-x-auto hide-scrollbar space-x-3 pb-1">
          {subtags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleSelectSubtag(tag)}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-semibold text-xs transition-colors cursor-pointer active:scale-95 ${
                selectedSubtag === tag
                  ? 'bg-[#ec4899] text-[#fafafa] shadow-neon-pink'
                  : 'bg-white dark:bg-[#2a2a2c] text-zinc-800 dark:text-[#e5e1e4] border border-zinc-200 dark:border-transparent hover:bg-zinc-200 dark:hover:bg-[#353437]'
              }`}
            >
              {tag === 'All' ? `All ${category.name}` : tag}
            </button>
          ))}
        </div>
      </section>

      {/* In-Page 728x90 / 300x250 Banner Slot (Zone ID: 6003172) */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 pt-6">
        <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30 p-1.5 shadow-sm">
          <AdBanner key={`category-banner-${categoryId}`} reloadKey={categoryId} />
        </div>
      </section>

      {/* Content Collection Header */}
      <section ref={categoryGridTopRef as any} className="max-w-7xl mx-auto p-6 md:p-12 scroll-mt-20">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#e5e1e4]">
              {selectedSubtag === 'All' ? 'Latest Uploads' : `${selectedSubtag} Selection`}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Page {effectiveCurrentPage} of {totalPages} ({displayedCategoryVideos.length} on this page • {filteredCategoryVideos.length} total)
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleToggleSort}
              className="px-4 py-2 bg-white dark:bg-[#201f22] hover:bg-[#ec4899] border border-zinc-200 dark:border-[#353437] hover:border-[#ec4899] rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm group/sort"
            >
              <span className="material-symbols-outlined text-sm text-[#ec4899] dark:text-[#ffb0cd] group-hover/sort:text-white transition-colors">swap_vert</span>
              <span className="text-zinc-800 dark:text-[#e5e1e4] group-hover/sort:text-white transition-colors">
                Sorted by: <span className="font-extrabold">{sortBy === 'newest' ? 'Newest' : 'Most Viewed'}</span>
              </span>
            </button>
          </div>
        </div>

        {/* Video Card Layout */}
        {isPageSwitching ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 my-2 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`cat-page-skeleton-${i}`} className="flex flex-col gap-2.5">
                <div className="w-full aspect-video rounded-2xl bg-zinc-200 dark:bg-zinc-800/80" />
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : displayedCategoryVideos.length > 0 ? (
          <>
            <div key={`cat-grid-page-${effectiveCurrentPage}`} className="animate-in fade-in duration-200">
              {categoryId === 'pov' ? (
                <div className="flex flex-col gap-6">
                  {displayedCategoryVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onClick={() => onSelectVideo(video)}
                      layout="horizontal"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {displayedCategoryVideos.map((video, idx) => (
                    <React.Fragment key={video.id}>
                      <VideoCard
                        video={video}
                        onClick={() => onSelectVideo(video)}
                        layout="grid"
                      />

                      {/* Native Recommendation Widget in-between grid cards spanning full width (After 4th video) */}
                      {idx === 3 && (
                        <div key={`category-native-recommended-in-grid-${categoryId}`} className="col-span-full my-3">
                          <NativeRecommendationAd key={`cat-native-${categoryId}`} reloadKey={categoryId} />
                        </div>
                      )}

                      {/* Single Clean Outstream Video Placement after the 8th card */}
                      {idx === 7 && (
                        <OutstreamVideoCardAd key={`category-outstream-${categoryId}`} reloadKey={categoryId} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Sleek, Compact & Responsive Page Navigation */}
            {totalPages > 1 && (
              <div className="mt-8 mb-4 flex flex-col items-center justify-center gap-3.5 w-full">
                {/* Fast Next Page Banner Button (Page N >> Page N+1) */}
                {effectiveCurrentPage < totalPages && (
                  <button
                    type="button"
                    onClick={() => handlePageChange(effectiveCurrentPage + 1)}
                    className="w-full max-w-md py-3 px-6 rounded-2xl bg-gradient-to-r from-[#e0358d] to-[#ec4899] hover:from-[#ec4899] hover:to-[#f43f5e] text-white font-extrabold text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-lg shadow-[#e0358d]/30 flex items-center justify-center gap-2 border border-white/20"
                  >
                    <span>Next Page ({effectiveCurrentPage + 1})</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                )}

                {/* Compact Single-Row Numbers Bar */}
                <div className="flex items-center gap-1 sm:gap-2 justify-center py-2 px-2.5 sm:px-4 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-sm max-w-full">
                  {/* Previous Page Button */}
                  <button
                    type="button"
                    disabled={effectiveCurrentPage === 1}
                    onClick={() => handlePageChange(effectiveCurrentPage - 1)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                      effectiveCurrentPage === 1
                        ? 'opacity-40 cursor-not-allowed text-zinc-400 dark:text-zinc-600'
                        : 'cursor-pointer hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 active:scale-95 border border-zinc-300 dark:border-white/10'
                    }`}
                    title="Previous Page"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>

                  {/* Compact Page Number Chips */}
                  {getPageNumbers(effectiveCurrentPage, totalPages).map((item, idx) => {
                    if (item === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-1 text-zinc-400 dark:text-zinc-500 font-bold text-xs">
                          ...
                        </span>
                      );
                    }
                    const pageNum = item as number;
                    const isCurrent = pageNum === effectiveCurrentPage;

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center border ${
                          isCurrent
                            ? 'bg-[#e0358d] text-white border-[#e0358d] shadow-md shadow-[#e0358d]/40 scale-105 font-extrabold'
                            : 'bg-white dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-white/10 hover:border-[#e0358d]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next Page Button */}
                  <button
                    type="button"
                    disabled={effectiveCurrentPage === totalPages}
                    onClick={() => handlePageChange(effectiveCurrentPage + 1)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                      effectiveCurrentPage === totalPages
                        ? 'opacity-40 cursor-not-allowed text-zinc-400 dark:text-zinc-600'
                        : 'cursor-pointer hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 active:scale-95 border border-zinc-300 dark:border-white/10'
                    }`}
                    title="Next Page"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>

                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Showing videos {((effectiveCurrentPage - 1) * PAGE_SIZE) + 1} - {Math.min(effectiveCurrentPage * PAGE_SIZE, filteredCategoryVideos.length)} of {filteredCategoryVideos.length} total
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-zinc-600 dark:text-[#debec8] bg-zinc-100 dark:bg-[#1c1b1d] rounded-2xl border border-zinc-200 dark:border-[#353437]">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#ec4899] dark:text-[#ffb0cd]">video_library</span>
            <p className="text-lg font-medium">No videos match filter "{selectedSubtag}".</p>
          </div>
        )}
      </section>
    </main>
  );
};
