import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { CategoryId, CategoryInfo, ContentPreference, LandingBanner, Video } from '../types';
import { CATEGORIES, INITIAL_LANDING_BANNERS, VIDEOS } from '../data';
import { VideoCard } from './VideoCard';
import { AdBanner, OutstreamVideoCardAd, NativeRecommendationAd } from './AdSpaces';
import { AD_CONFIG } from '../config/adConfig';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getBannerImageUrl,
  handleBannerImageError,
  getOptimizedImageUrl,
  getResponsiveImageSrcSet,
} from '../utils/mediaHelper';
import { deduplicateVideos } from '../utils/videoDeduplicator';
import { smartSearch, hasRealMatches } from '../utils/searchEngine';
import { filterVideosByOrientation } from '../utils/orientationClassifier';

interface BrowseScreenProps {
  onSelectVideo: (video: Video) => void;
  onSelectCategory: (id: CategoryId) => void;
  selectedCategory: CategoryId;
  videos?: Video[];
  categories?: CategoryInfo[];
  banners?: LandingBanner[];
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  sortBy?: 'latest' | 'most_popular' | 'top_rated';
  setSortBy?: (sort: 'latest' | 'most_popular' | 'top_rated') => void;
  contentPreference?: ContentPreference;
  onChangeContentPreference?: (pref: ContentPreference) => void;
}

export const BrowseScreen: React.FC<BrowseScreenProps> = ({
  onSelectVideo,
  onSelectCategory,
  selectedCategory,
  videos = VIDEOS,
  categories = CATEGORIES,
  banners = INITIAL_LANDING_BANNERS,
  searchQuery = '',
  setSearchQuery,
  sortBy: externalSortBy,
  setSortBy: externalSetSortBy,
  contentPreference = 'straight',
  onChangeContentPreference,
}) => {
  const { t, language, setLanguage, currentLanguageMeta } = useLanguage();
  const [rankedTrendingVideos, setRankedTrendingVideos] = useState<Video[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isHoveredSlider, setIsHoveredSlider] = useState<boolean>(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [internalSortBy, setInternalSortBy] = useState<'latest' | 'most_popular' | 'top_rated'>('latest');
  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy;
  const setSortBy = externalSetSortBy || setInternalSortBy;
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const PAGE_SIZE = 24;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const videoGridTopRef = React.useRef<HTMLDivElement>(null);

  const sortDropdownRef = React.useRef<HTMLDivElement>(null);
  const durationDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (durationDropdownRef.current && !durationDropdownRef.current.contains(e.target as Node)) {
        setIsDurationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset page to 1 on filter, category, search, or contentPreference changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, sortBy, durationFilter, contentPreference]);

  // Filter out any videos that have been taken down and strictly deduplicate
  const activeVideos = React.useMemo(
    () => deduplicateVideos(videos || []),
    [videos]
  );
  const activeBanners = React.useMemo(
    () => (banners || []).filter((b) => b && typeof b === 'object' && b.isActive !== false),
    [banners]
  );
  const displayBanners = React.useMemo(() => {
    // No videos and no banners — nothing to display
    if (activeBanners.length === 0 && activeVideos.length === 0) return [];

    const usedIds = new Set<string>();
    const slides: Array<{
      id: string;
      title: string;
      subtitle: string;
      bannerImage: string;
      tag: string;
      tagClass: string;
      targetCategory?: string;
      targetVideoId?: string;
      targetVideo?: Video;
      ctaText?: string;
      isActive: boolean;
    }> = [];

    // 1. Admin custom landing banners take #1 priority
    activeBanners.forEach((b) => {
      const matchingVideo = b.targetVideoId ? activeVideos.find((v) => v.id === b.targetVideoId) : undefined;
      slides.push({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle || (matchingVideo ? `${matchingVideo.views || '1K views'} • ${matchingVideo.duration || '05:00'} • 4K UHD` : 'Exclusive Feature'),
        bannerImage: b.bannerImage,
        tag: b.tag || 'FEATURED',
        tagClass: 'bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 shadow-rose-950/50',
        targetCategory: b.targetCategory,
        targetVideoId: b.targetVideoId,
        targetVideo: matchingVideo,
        ctaText: b.ctaText || 'Watch Now',
        isActive: b.isActive,
      });
      if (b.targetVideoId) usedIds.add(b.targetVideoId);
    });

    if (slides.length >= 5 || activeVideos.length === 0) {
      return slides.slice(0, 5);
    }

    // Helper to get numeric views
    const getViewsNumber = (v: Video): number => {
      if (typeof v.viewsCount === 'number' && !isNaN(v.viewsCount)) return v.viewsCount;
      if (typeof v.views === 'string') {
        const uppercaseV = v.views.toUpperCase();
        if (uppercaseV.endsWith('M')) return parseFloat(uppercaseV) * 1000000;
        if (uppercaseV.endsWith('K')) return parseFloat(uppercaseV) * 1000;
        return parseInt(uppercaseV.replace(/[^0-9]/g, ''), 10) || 0;
      }
      return 0;
    };

    // Calculate score: views + likes + freshness
    const scoredVideos = [...activeVideos].map((v) => {
      const viewsNum = getViewsNumber(v);
      const likesNum = typeof v.likesCount === 'number' && !isNaN(v.likesCount) ? v.likesCount : 0;
      const score = Math.round(viewsNum * 0.5 + likesNum * 10 + (v.isNew ? 5000 : 0));
      return { video: v, score, viewsNum };
    });

    // 1. Most watched / Trending videos (Highest score / views first)
    const sortedByPopularity = [...scoredVideos].sort((a, b) => b.score - a.score);

    // 2. Videos that need views / Fresh / Under-exposed (Lowest views / newest first)
    const sortedByNeedsViews = [...scoredVideos].sort((a, b) => {
      if (a.video.isNew && !b.video.isNew) return -1;
      if (!a.video.isNew && b.video.isNew) return 1;
      return a.viewsNum - b.viewsNum;
    });

    const addSlide = (
      v: Video,
      tag: string,
      tagClass: string,
      subtitlePrefix: string
    ) => {
      if (!v || usedIds.has(v.id)) return;
      usedIds.add(v.id);

      const viewsDisplay = v.views || `${(v.viewsCount || 500).toLocaleString()} views`;
      const subtitle = `${subtitlePrefix} • ${viewsDisplay} • ${v.duration || '05:00'} • ${v.quality || 'HD'} Ultra-HD`;

      slides.push({
        id: `hero-${v.id}`,
        title: v.title || 'Featured Video',
        subtitle,
        bannerImage: v.thumbnail || '',
        tag,
        tagClass,
        targetVideoId: v.id,
        targetVideo: v,
        targetCategory: v.category || 'trending',
        ctaText: 'Watch Now',
        isActive: true,
      });
    };

    // Slot 1: 🔥 #1 Most Watched Video
    if (sortedByPopularity[0]) {
      addSlide(
        sortedByPopularity[0].video,
        '🔥 #1 MOST WATCHED',
        'bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 shadow-rose-950/50',
        'Top Trending'
      );
    }

    // Slot 2: ⚡ Top Viral Hit
    if (sortedByPopularity[1]) {
      addSlide(
        sortedByPopularity[1].video,
        '⚡ TOP VIRAL HIT',
        'bg-gradient-to-r from-amber-500 to-rose-600 shadow-amber-950/50',
        'Trending Now'
      );
    }

    // Slot 3: 🚀 Fresh Video (Needs Views / Promoted)
    const needView1 = sortedByNeedsViews.find((item) => !usedIds.has(item.video.id));
    if (needView1) {
      addSlide(
        needView1.video,
        '🚀 FRESH RELEASE',
        'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-950/50',
        'Newly Added • Discover Now'
      );
    }

    // Slot 4: 🌟 Fan Favorite (Most Popular Pool)
    const pop3 = sortedByPopularity.find((item) => !usedIds.has(item.video.id));
    if (pop3) {
      addSlide(
        pop3.video,
        '🌟 FAN FAVORITE',
        'bg-gradient-to-r from-pink-500 to-purple-600 shadow-purple-950/50',
        'Top Rated'
      );
    }

    // Slot 5: 💎 Hidden Gem (Needs Views / Promoted)
    const needView2 = sortedByNeedsViews.find((item) => !usedIds.has(item.video.id));
    if (needView2) {
      addSlide(
        needView2.video,
        '💎 HIDDEN GEM',
        'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-950/50',
        'Must Watch • Recommended'
      );
    }

    // Fallback: If less than 5 unique videos, fill from remaining active videos
    for (const item of activeVideos) {
      if (slides.length >= 5) break;
      if (!usedIds.has(item.id)) {
        addSlide(
          item,
          item.quality ? `${item.quality} ULTRA-HD` : 'FEATURED',
          'bg-gradient-to-r from-rose-500 to-pink-600',
          item.categoryLabel || 'Featured'
        );
      }
    }

    return slides.slice(0, 5);
  }, [activeBanners, activeVideos]);

  // Instant Image Pre-warming: Preload first banner image and next slide image immediately
  useEffect(() => {
    if (typeof window === 'undefined' || displayBanners.length === 0) return;
    
    // Preload current active slide image
    const activeBanner = displayBanners[currentSlideIndex];
    if (activeBanner) {
      const activeUrl = getBannerImageUrl(activeBanner, currentSlideIndex);
      if (activeUrl) {
        const img = new Image();
        img.src = getOptimizedImageUrl(activeUrl, 1080, 75);
      }
    }

    // Preload next slide image for seamless zero-delay transitions
    if (displayBanners.length > 1) {
      const nextIndex = (currentSlideIndex + 1) % displayBanners.length;
      const nextBanner = displayBanners[nextIndex];
      if (nextBanner) {
        const nextUrl = getBannerImageUrl(nextBanner, nextIndex);
        if (nextUrl) {
          const nextImg = new Image();
          nextImg.src = getOptimizedImageUrl(nextUrl, 1080, 75);
        }
      }
    }
  }, [currentSlideIndex, displayBanners]);

  // Continuous auto-swipe timer every 4.5 seconds (resets cleanly when user swipes or clicks)
  const autoSwipeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetAutoSwipeTimer = useCallback(() => {
    if (autoSwipeTimerRef.current) clearInterval(autoSwipeTimerRef.current);
    if (displayBanners.length <= 1) return;
    autoSwipeTimerRef.current = setInterval(() => {
      React.startTransition(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % displayBanners.length);
      });
    }, 4500);
  }, [displayBanners.length]);

  useEffect(() => {
    resetAutoSwipeTimer();
    return () => {
      if (autoSwipeTimerRef.current) clearInterval(autoSwipeTimerRef.current);
    };
  }, [resetAutoSwipeTimer]);

  // Pause auto-swipe while user is hovering the slider; resume on mouse leave
  useEffect(() => {
    if (isHoveredSlider) {
      if (autoSwipeTimerRef.current) clearInterval(autoSwipeTimerRef.current);
    } else {
      resetAutoSwipeTimer();
    }
  }, [isHoveredSlider, resetAutoSwipeTimer]);

  const goToNextSlide = useCallback(() => {
    React.startTransition(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % displayBanners.length);
    });
    resetAutoSwipeTimer();
  }, [displayBanners.length, resetAutoSwipeTimer]);

  const goToPrevSlide = useCallback(() => {
    React.startTransition(() => {
      setCurrentSlideIndex((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
    });
    resetAutoSwipeTimer();
  }, [displayBanners.length, resetAutoSwipeTimer]);

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToNextSlide();
  };

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    goToPrevSlide();
  };

  // Touch / Mobile Swipe Handlers
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchEndXRef = useRef<number>(0);
  const touchEndYRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchEndXRef.current = e.touches[0].clientX;
    touchEndYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
    if (autoSwipeTimerRef.current) clearInterval(autoSwipeTimerRef.current);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    touchEndXRef.current = e.touches[0].clientX;
    touchEndYRef.current = e.touches[0].clientY;
    const deltaX = Math.abs(touchEndXRef.current - touchStartXRef.current);
    const deltaY = Math.abs(touchEndYRef.current - touchStartYRef.current);
    if (deltaX > 10 && deltaX > deltaY) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    const deltaX = touchEndXRef.current - touchStartXRef.current;
    const deltaY = touchEndYRef.current - touchStartYRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Minimum swipe threshold (35px) and ensure horizontal intent over vertical scroll
    if (absX > 35 && absX > absY) {
      if (deltaX < 0) {
        // Swiped Left -> Next Slide
        goToNextSlide();
      } else {
        // Swiped Right -> Previous Slide
        goToPrevSlide();
      }
    } else {
      resetAutoSwipeTimer();
    }
  };

  // High-Precision Gender & Orientation Filter Engine (Zero False-Positive Collisions)
  const genderFilteredVideos = React.useMemo(() => {
    return filterVideosByOrientation(activeVideos, contentPreference);
  }, [activeVideos, contentPreference]);

  // Trending calculation using Cloud Firestore data / genderFilteredVideos (no 404 API calls)
  useEffect(() => {
    const scored = (genderFilteredVideos || []).filter((v) => v && typeof v === 'object').map((v) => {
      let viewsNum = typeof v.viewsCount === 'number' && !isNaN(v.viewsCount) ? v.viewsCount : 500;
      if (typeof v.views === 'string') {
        const uppercaseV = v.views.toUpperCase();
        if (uppercaseV.endsWith('M')) viewsNum = parseFloat(uppercaseV) * 1000000;
        else if (uppercaseV.endsWith('K')) viewsNum = parseFloat(uppercaseV) * 1000;
        else viewsNum = parseInt(uppercaseV.replace(/[^0-9]/g, ''), 10) || viewsNum;
      }
      const likesNum = typeof v.likesCount === 'number' && !isNaN(v.likesCount) ? v.likesCount : 0;
      const score = Math.round(viewsNum * 0.5 + likesNum * 10 + (v.isNew ? 5000 : 0));
      return { ...v, trendingScore: score };
    });

    scored.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
    setRankedTrendingVideos(
      scored.slice(0, 8).map((v, i) => ({ ...v, trendingRank: i + 1 }))
    );
  }, [genderFilteredVideos]);

  // Deferred search engine — keeps UI typing and clicking lightning responsive
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const cleanSearch = (deferredSearchQuery || '').trim();
  const searchedVideos = React.useMemo(() => {
    return cleanSearch ? smartSearch(genderFilteredVideos, cleanSearch) : genderFilteredVideos;
  }, [genderFilteredVideos, cleanSearch]);
  const isRealMatch = React.useMemo(() => {
    return cleanSearch ? hasRealMatches(genderFilteredVideos, cleanSearch) : true;
  }, [genderFilteredVideos, cleanSearch]);

  // Smart Language-Based Regional Recommendation Engine
  const regionalVideos = React.useMemo(() => {
    if (!currentLanguageMeta || !currentLanguageMeta.keywords || currentLanguageMeta.code === 'en') {
      return searchedVideos;
    }
    const keywords = currentLanguageMeta.keywords.map((k) => k.toLowerCase());
    const scored = searchedVideos.filter((v) => v && typeof v === 'object').map((video) => {
      let matchCount = 0;
      const titleLower = (video.title || '').toLowerCase();
      const descLower = (video.description || '').toLowerCase();
      const tagsLower = Array.isArray(video.tags)
        ? video.tags.map((t) => (typeof t === 'string' ? t.toLowerCase() : ''))
        : [];

      keywords.forEach((kw) => {
        if (titleLower.includes(kw)) matchCount += 3;
        if (descLower.includes(kw)) matchCount += 1;
        if (tagsLower.some((t) => t && t.includes(kw))) matchCount += 2;
      });

      return { video, score: matchCount };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((item) => item.video);
  }, [searchedVideos, currentLanguageMeta]);

  const justAddedVideos =
    selectedCategory === 'all'
      ? regionalVideos
      : regionalVideos.filter(
          (v) =>
            v &&
            (v.category === selectedCategory ||
              (Array.isArray(v.categories) && v.categories.includes(selectedCategory)))
        );

  // Helper to parse duration into seconds for precision filtering
  const parseDurationInSeconds = (durationStr?: string): number => {
    if (!durationStr) return 300;
    const parts = durationStr.trim().split(':').map((p) => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    const num = parseFloat(durationStr);
    return isNaN(num) ? 300 : Math.round(num * 60);
  };

  const durationFilteredVideos = React.useMemo(() => {
    if (durationFilter === 'all') return justAddedVideos;
    return justAddedVideos.filter((v) => {
      if (!v) return false;
      const sec = parseDurationInSeconds(v.duration);
      if (durationFilter === 'short') return sec < 600; // < 10 mins
      if (durationFilter === 'medium') return sec >= 600 && sec <= 1200; // 10 - 20 mins
      if (durationFilter === 'long') return sec > 1200; // > 20 mins
      return true;
    });
  }, [justAddedVideos, durationFilter]);

  const sortedVideos = React.useMemo(() => {
    const list = [...durationFilteredVideos];
    const parseViews = (v: Video): number => {
      if (!v) return 0;
      if (typeof v.viewsCount === 'number' && v.viewsCount > 0) return v.viewsCount;
      const str = typeof v.views === 'string' ? v.views : typeof v.views === 'number' ? `${v.views}` : '';
      const num = parseFloat(str.replace(/[^0-9.]/g, ''));
      if (isNaN(num)) return 0;
      if (/k/i.test(str)) return num * 1000;
      if (/m/i.test(str)) return num * 1000000;
      return num;
    };

    const parseRating = (v: Video): number => {
      if (!v) return 0;
      const r = typeof v.rating === 'string' ? v.rating : typeof v.rating === 'number' ? `${v.rating}` : '0';
      return parseInt(r.replace('%', ''), 10) || 0;
    };

    if (sortBy === 'latest') {
      list.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
    } else if (sortBy === 'most_popular' || (sortBy as any) === 'most_relevant') {
      list.sort((a, b) => parseViews(b) - parseViews(a));
    } else if (sortBy === 'top_rated') {
      list.sort((a, b) => {
        const interestA = parseRating(a) * 100 + (a?.likesCount || 0) * 10 + parseViews(a);
        const interestB = parseRating(b) * 100 + (b?.likesCount || 0) * 10 + parseViews(b);
        return interestB - interestA;
      });
    }
    return deduplicateVideos(list);
  }, [durationFilteredVideos, sortBy]);

  const [isPageSwitching, setIsPageSwitching] = useState<boolean>(false);

  // Compute total pages and effective current page
  const totalPages = Math.max(1, Math.ceil(sortedVideos.length / PAGE_SIZE));
  const effectiveCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const displayedVideos = React.useMemo(() => {
    const startIndex = (effectiveCurrentPage - 1) * PAGE_SIZE;
    return deduplicateVideos(sortedVideos.slice(startIndex, startIndex + PAGE_SIZE));
  }, [sortedVideos, effectiveCurrentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === effectiveCurrentPage) return;
    setIsPageSwitching(true);
    // Instant scroll to the top of the video grid section (zero sluggish scroll lag)
    if (videoGridTopRef.current) {
      videoGridTopRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
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

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <main className="w-full bg-white dark:bg-[#09090b] p-3 sm:p-6 md:p-12 pb-4 lg:ml-64 transition-colors">
      {/* Search / Gender Orientation Header Banner */}
      {(cleanSearch || contentPreference === 'gay' || contentPreference === 'lesbian') && (
        <section className="mb-4 sm:mb-6 flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[#e0358d] dark:text-[#ec4899] material-symbols-outlined text-2xl sm:text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {cleanSearch ? 'search' : contentPreference === 'gay' ? 'male' : 'female'}
            </span>
            <div>
              <h2 className="text-base sm:text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>
                  {cleanSearch
                    ? `${cleanSearch} PORN VIDEOS`
                    : contentPreference === 'gay'
                    ? 'GAY PORN VIDEOS'
                    : 'LESBIAN PORN VIDEOS'}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                {cleanSearch
                  ? `Showing top matching videos for "${cleanSearch}"`
                  : contentPreference === 'gay'
                  ? 'Curated male-on-male, twink, hunk & gay adult video collection'
                  : 'Curated girl-on-girl, sensual & lesbian adult video collection'}
              </p>
            </div>
          </div>

          {/* Reset Filter Button if Gender Orientation is Filtered */}
          {!cleanSearch && (contentPreference === 'gay' || contentPreference === 'lesbian') && onChangeContentPreference && (
            <button
              type="button"
              onClick={() => onChangeContentPreference('straight')}
              className="text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-[#e0358d] dark:hover:text-[#ec4899] flex items-center gap-1.5 bg-white dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/10 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm text-[#e0358d]">restart_alt</span>
              <span>Back to Straight Feed</span>
            </button>
          )}
        </section>
      )}

      {/* Smart Regional Recommendation Banner (Shown when non-English language selected & no active search query) */}
      {!cleanSearch && currentLanguageMeta && currentLanguageMeta.code !== 'en' && (
        <section className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#e0358d]/20 via-[#1f1d24] to-[#09090b] border border-[#e0358d]/40 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_20px_rgba(224,53,141,0.15)] animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentLanguageMeta.flag}</span>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                <span>Smart Regional Content Recommended for:</span>
                <span className="text-[#e0358d] font-extrabold underline decoration-[#e0358d]/40">
                  {currentLanguageMeta.label} ({currentLanguageMeta.englishName})
                </span>
                <span className="bg-[#e0358d]/20 text-[#e0358d] border border-[#e0358d]/30 text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  AUTO-FILTERED
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Surfacing top local & regional picks for your language without searching! You can still search any global content anytime.
              </p>
            </div>
          </div>
          <button
            onClick={() => setLanguage('en')}
            className="text-xs font-extrabold px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1 shrink-0 border border-white/10"
          >
            <span className="material-symbols-outlined text-sm text-[#e0358d]">public</span>
            Reset to Global English
          </button>
        </section>
      )}

      {/* Auto-Swiping 6-Image Hero Banner Slider (Hidden on mobile devices for ultra-clean direct feed) */}
      {!cleanSearch && selectedCategory === 'all' && displayBanners.length > 0 && (
        <section
          className="hero-banner-container hidden md:block mb-6 md:mb-10 relative w-full md:h-[360px] xl:h-[420px] overflow-hidden rounded-2xl border border-[#27272a] shadow-2xl group/slider select-none bg-[#09090b]"
          onMouseEnter={() => setIsHoveredSlider(true)}
          onMouseLeave={() => setIsHoveredSlider(false)}
        >
          {/* Continuous Hardware-Accelerated Sliding Track (Zero Black Gap) */}
          <div
            className="flex w-full h-full transition-transform duration-700 ease-in-out"
            style={{
              transform: `translateX(-${currentSlideIndex * 100}%)`,
              willChange: 'transform',
            }}
          >
            {displayBanners.map((banner, index) => {
              const isActive = index === currentSlideIndex;
              return (
                <div
                  key={banner.id}
                  onClick={() => {
                    if (isSwipingRef.current) return;
                    const targetVid = (banner as any).targetVideo || activeVideos.find((v) => v.id === (banner as any).targetVideoId);
                    if (targetVid) {
                      onSelectVideo(targetVid);
                    } else if (banner.targetCategory) {
                      onSelectCategory(banner.targetCategory);
                    }
                  }}
                  className="w-full h-full flex-shrink-0 relative flex items-end p-4 pb-10 sm:p-8 xl:p-12 cursor-pointer"
                >
                  {(() => {
                    const rawUrl = banner.bannerImage || getBannerImageUrl(banner, index);
                    const optimizedUrl = getOptimizedImageUrl(rawUrl, index === 0 ? 1080 : 800, 75);
                    const srcSet = getResponsiveImageSrcSet(rawUrl, [480, 800, 1200], 75);
                    return (
                      <img
                        src={optimizedUrl}
                        srcSet={srcSet || undefined}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px"
                        alt={banner.title}
                        decoding={index === 0 ? 'sync' : 'async'}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'low'}
                        onError={(e) => handleBannerImageError(e, index)}
                        className="absolute inset-0 w-full h-full object-cover gpu-accelerated"
                      />
                    );
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/95 via-[#09090b]/40 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#09090b]/80 via-transparent to-transparent pointer-events-none" />

                  <div
                    className={`relative z-10 max-w-xl sm:max-w-2xl space-y-1.5 sm:space-y-3 transition-all duration-700 ease-out ${
                      isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-90'
                    }`}
                  >
                    <span className={`hero-banner-tag inline-block px-2.5 py-1 sm:px-3.5 sm:py-1.5 ${(banner as any).tagClass || 'bg-[#ec4899]'} text-white text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg shadow-lg`}>
                      {banner.tag || 'Featured Release'}
                    </span>
                    <h1 className="hero-banner-title hero-text banner-title text-base sm:text-3xl xl:text-5xl font-black text-white italic tracking-tight hover:text-[#ffb0cd] transition-colors duration-150 line-clamp-1 sm:line-clamp-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                      {banner.title}
                    </h1>
                    <p className="hero-banner-subtitle text-[10px] sm:text-xs xl:text-sm text-zinc-100 line-clamp-1 sm:line-clamp-2 leading-snug sm:leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] font-medium">
                      {banner.subtitle}
                    </p>
                    <div className="pt-0.5 sm:pt-2">
                      <span className="hero-banner-cta inline-flex items-center gap-1 px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-black/70 hover:bg-[#ec4899] text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wider backdrop-blur-md transition-all duration-150 border border-white/30 shadow-lg hover:scale-105 active:scale-95">
                        <span className="text-white">{banner.ctaText || 'Watch Now'}</span>
                        <span className="material-symbols-outlined text-xs sm:text-sm text-white">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Corner Left Navigation Arrow - Visible on Banner Hover Only */}
          <button
            type="button"
            onClick={handlePrevSlide}
            aria-label="Previous Slide"
            title="Previous Banner Slide"
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/80 hover:bg-[#ec4899] text-white border border-white/40 flex items-center justify-center transition-all duration-300 opacity-0 group-hover/slider:opacity-100 pointer-events-none group-hover/slider:pointer-events-auto z-40 cursor-pointer shadow-2xl backdrop-blur-md active:scale-90 hover:scale-110"
          >
            <span className="material-symbols-outlined text-2xl md:text-3xl text-white">chevron_left</span>
          </button>

          {/* Corner Right Navigation Arrow - Visible on Banner Hover Only */}
          <button
            type="button"
            onClick={handleNextSlide}
            aria-label="Next Slide"
            title="Next Banner Slide"
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/80 hover:bg-[#ec4899] text-white border border-white/40 flex items-center justify-center transition-all duration-300 opacity-0 group-hover/slider:opacity-100 pointer-events-none group-hover/slider:pointer-events-auto z-40 cursor-pointer shadow-2xl backdrop-blur-md active:scale-90 hover:scale-110"
          >
            <span className="material-symbols-outlined text-2xl md:text-3xl text-white">chevron_right</span>
          </button>

          {/* Bottom Dot Indicators (Higher z-40 layer with explicit touch zone) */}
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-40 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 pointer-events-auto">
            {displayBanners.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex(index);
                  resetAutoSwipeTimer();
                }}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  index === currentSlideIndex
                    ? 'w-6 sm:w-8 bg-[#ec4899] shadow-neon-pink'
                    : 'w-2 sm:w-2.5 bg-white/50 hover:bg-white/90'
                }`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Advanced Recommendation & Trending Carousel Section — Desktop only (Hidden during active search) */}
      {!cleanSearch && rankedTrendingVideos.length > 3 && (
        <section className="hidden md:block mb-12 relative w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-rose-600 dark:text-[#ffb0cd] flex items-center gap-2">
              <span className="material-symbols-outlined fill-1 text-rose-500">local_fire_department</span>
              {t.trendingNow}
            </h2>
            <span className="text-xs text-zinc-500 dark:text-[#a19fa6] font-semibold tracking-wider uppercase hidden sm:inline">
              Ranked by Dynamic Engagement Engine
            </span>
          </div>

          <div className="flex overflow-x-auto hide-scrollbar gap-6 snap-x snap-mandatory pb-4">
            {rankedTrendingVideos.map((video, index) => (
              <div
                key={video.id}
                onClick={() => onSelectVideo(video)}
                className="snap-start shrink-0 w-[85vw] md:w-[60vw] lg:w-[45vw] aspect-video relative rounded-xl overflow-hidden group cursor-pointer border border-zinc-200 dark:border-[#27272a] hover:border-rose-500 transition-all duration-300 shadow-xl"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/95 via-[#09090b]/40 to-transparent" />

                {/* Dynamic Trending Rank Badge (#1, #2, #3) */}
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                  <div className="bg-rose-600 text-[#fafafa] font-black text-sm px-3 py-1 rounded-lg shadow-lg flex items-center gap-1 border border-rose-400/40">
                    <span>#{index + 1}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider">TOP</span>
                  </div>
                  {video.isExclusive && (
                    <span className="bg-[#ffb0cd]/20 text-[#ffb0cd] font-semibold text-xs px-2.5 py-1 rounded-lg backdrop-blur-md border border-[#ffb0cd]/30 uppercase tracking-wider">
                      {t.exclusive}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <div className="flex items-center gap-3 mb-2 text-xs font-semibold text-[#debec8]">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      {video.views.replace(/\s*views?/i, '').trim()} {t.views}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[#ffb0cd]">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {video.duration}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-1 group-hover:text-[#ffb0cd] transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-sm text-[#debec8] line-clamp-1">{video.description}</p>
                </div>
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category Pills Filter — hidden on mobile view since categories are already present in the side drawer & bottom navigation */}
      {!cleanSearch && (
        <section className="hidden md:block mb-10 w-full">
          <div className="flex md:flex-wrap gap-2 md:gap-3 overflow-x-auto md:overflow-x-visible hide-scrollbar snap-x snap-mandatory md:snap-none pb-1 md:pb-0">
            <button
              onClick={() => onSelectCategory('all')}
              className={`snap-start shrink-0 px-4 md:px-5 py-1.5 md:py-2 rounded-full font-semibold text-xs transition-all cursor-pointer active:scale-95 ${
                selectedCategory === 'all'
                  ? 'bg-[#ec4899] text-white border border-[#ec4899] shadow-neon-pink'
                  : 'bg-zinc-200 dark:bg-[#27272a] text-zinc-800 dark:text-white hover:bg-[#ec4899] hover:text-white dark:hover:bg-[#ffb0cd] dark:hover:text-black border border-transparent'
              }`}
            >
              {t.allCategories}
            </button>
            {categories.filter((c) => c.id !== 'trending').map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`snap-start shrink-0 px-4 md:px-5 py-1.5 md:py-2 rounded-full font-semibold text-xs transition-all cursor-pointer active:scale-95 capitalize ${
                  selectedCategory === cat.id
                    ? 'bg-[#ec4899] text-white border border-[#ec4899] shadow-neon-pink'
                    : 'bg-zinc-200 dark:bg-[#27272a] text-zinc-800 dark:text-white hover:bg-[#ec4899] hover:text-white dark:hover:bg-[#ffb0cd] dark:hover:text-black border border-transparent'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Video Grid Section */}
      <section ref={videoGridTopRef} className="w-full scroll-mt-20">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Interactive Sort Dropdown Header */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="sort-filter-btn flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1c1b1f] dark:hover:bg-[#27272a] text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/10 hover:border-[#e0358d] transition-all shadow-none cursor-pointer active:scale-95"
                title="Click to change video sorting filter"
              >
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#e0358d]">sort</span>
                  <span>
                    {sortBy === 'latest' ? 'Latest' : sortBy === 'most_popular' || (sortBy as any) === 'most_relevant' ? 'Most Popular' : 'Top Rated'}
                  </span>
                </span>
                <span className="material-symbols-outlined text-sm sm:text-base opacity-80">expand_more</span>
              </button>

              {isSortDropdownOpen && (
                <div className="dropdown-modal-menu absolute left-0 mt-2 w-48 rounded-2xl shadow-2xl py-1.5 z-50 text-xs border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#18171a] text-zinc-900 dark:text-white animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-[#debec8] border-b border-zinc-200 dark:border-white/10 mb-1 flex items-center justify-between">
                    <span>Sort Videos</span>
                    <span className="text-[#e0358d] text-[9px] font-mono">FILTER</span>
                  </div>

                  {/* Option 1: Latest */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSortDropdownOpen(false);
                      React.startTransition(() => {
                        setSortBy('latest');
                      });
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      sortBy === 'latest' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-zinc-100 dark:hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">Latest</span>
                    {sortBy === 'latest' && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>

                  {/* Option 2: Most Popular */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSortDropdownOpen(false);
                      React.startTransition(() => {
                        setSortBy('most_popular');
                      });
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      sortBy === 'most_popular' || (sortBy as any) === 'most_relevant' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-zinc-100 dark:hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">Most Popular</span>
                    {(sortBy === 'most_popular' || (sortBy as any) === 'most_relevant') && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>

                  {/* Option 3: Top Rated */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSortDropdownOpen(false);
                      React.startTransition(() => {
                        setSortBy('top_rated');
                      });
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      sortBy === 'top_rated' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-zinc-100 dark:hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">Top Rated</span>
                    {sortBy === 'top_rated' && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Duration Filter Dropdown Header (Pornhat Style Duration Filters) */}
            <div className="relative" ref={durationDropdownRef}>
              <button
                type="button"
                onClick={() => setIsDurationDropdownOpen(!isDurationDropdownOpen)}
                className={`sort-filter-btn flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                  durationFilter !== 'all'
                    ? 'bg-[#e0358d]/20 border-[#e0358d] text-zinc-900 dark:text-white shadow-[0_0_15px_rgba(224,53,141,0.2)]'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1c1b1f] dark:hover:bg-[#27272a] text-zinc-900 dark:text-white border-zinc-300 dark:border-white/10 hover:border-[#e0358d]'
                }`}
                title="Filter videos by length / duration"
              >
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#e0358d]">schedule</span>
                  <span>
                    {durationFilter === 'all'
                      ? 'All Lengths'
                      : durationFilter === 'short'
                      ? '< 10 Mins'
                      : durationFilter === 'medium'
                      ? '10 - 20 Mins'
                      : '20+ Mins'}
                  </span>
                </span>
                <span className="material-symbols-outlined text-sm sm:text-base opacity-80">expand_more</span>
              </button>

              {isDurationDropdownOpen && (
                <div className="dropdown-modal-menu absolute left-0 mt-2 w-48 rounded-2xl shadow-2xl py-1.5 z-50 text-xs border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#18171a] text-zinc-900 dark:text-white animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-[#debec8] border-b border-zinc-200 dark:border-white/10 mb-1 flex items-center justify-between">
                    <span>Duration Filter</span>
                    <span className="text-[#e0358d] text-[9px] font-mono">LENGTH</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDurationDropdownOpen(false);
                      React.startTransition(() => setDurationFilter('all'));
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      durationFilter === 'all' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-zinc-100 dark:hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">All Lengths</span>
                    {durationFilter === 'all' && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDurationDropdownOpen(false);
                      React.startTransition(() => setDurationFilter('short'));
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      durationFilter === 'short' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-zinc-100 dark:hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">Short (&lt; 10 mins)</span>
                    {durationFilter === 'short' && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDurationDropdownOpen(false);
                      React.startTransition(() => setDurationFilter('medium'));
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      durationFilter === 'medium' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-zinc-100 dark:hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">Medium (10 - 20 mins)</span>
                    {durationFilter === 'medium' && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDurationDropdownOpen(false);
                      React.startTransition(() => setDurationFilter('long'));
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      durationFilter === 'long' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-zinc-100 dark:hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">Long (20+ mins)</span>
                    {durationFilter === 'long' && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-300 font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Page <strong className="text-[#e0358d] font-extrabold">{effectiveCurrentPage}</strong> of <strong className="text-zinc-900 dark:text-white font-bold">{totalPages}</strong> ({displayedVideos.length} on this page • {sortedVideos.length.toLocaleString()} total)
            </span>
          </div>
        </div>

        {isPageSwitching ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-5 gap-x-4 sm:gap-6 my-2 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`page-skeleton-${i}`} className="flex flex-col gap-2.5">
                <div className="w-full aspect-video rounded-2xl bg-zinc-200 dark:bg-zinc-800/80" />
                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : displayedVideos.length > 0 ? (
          <>
            <div key={`page-grid-${effectiveCurrentPage}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-5 gap-x-4 sm:gap-6 animate-in fade-in duration-200">
              {displayedVideos.filter((v) => v && v.id).map((video, idx) => (
                <React.Fragment key={video.id}>
                  <VideoCard
                    video={video}
                    onClick={() => onSelectVideo(video)}
                  />

                  {/* Native Recommendation Widget in-between grid cards spanning full width (After 4th video) */}
                  {idx === 3 && (
                    <div key={`browse-native-recommended-in-grid-${selectedCategory}`} className="col-span-full my-3">
                      <NativeRecommendationAd key={`browse-native-${selectedCategory}`} reloadKey={selectedCategory} />
                    </div>
                  )}

                  {/* Single Clean In-Feed Outstream Ad Placement after the 8th card */}
                  {idx === 7 && (
                    <OutstreamVideoCardAd
                      key={`browse-outstream-${selectedCategory}`}
                      reloadKey={selectedCategory}
                    />
                  )}
                </React.Fragment>
              ))}
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
                  Showing videos {((effectiveCurrentPage - 1) * PAGE_SIZE) + 1} - {Math.min(effectiveCurrentPage * PAGE_SIZE, sortedVideos.length)} of {sortedVideos.length.toLocaleString()} total
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-zinc-600 dark:text-[#debec8] bg-zinc-50 dark:bg-[#1c1b1d] rounded-2xl border border-zinc-200 dark:border-[#353437] space-y-3 my-6">
            <span className="material-symbols-outlined text-5xl text-rose-500 dark:text-[#ffb0cd]">video_library</span>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No Videos Available</h3>
            <p className="text-sm text-zinc-600 dark:text-[#debec8] max-w-md mx-auto">
              No videos have been uploaded yet. Upload a video from the admin panel to get started!
            </p>
          </div>
        )}
      </section>
    </main>
  );
};
