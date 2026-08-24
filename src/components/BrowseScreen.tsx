import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CategoryId, CategoryInfo, LandingBanner, Video } from '../types';
import { CATEGORIES, INITIAL_LANDING_BANNERS, VIDEOS } from '../data';
import { VideoCard } from './VideoCard';
import { OutstreamVideoCardAd, NativeRecommendationAd } from './AdSpaces';
import { AD_CONFIG } from '../config/adConfig';
import { useLanguage } from '../i18n/LanguageContext';
import { getBannerImageUrl, handleBannerImageError } from '../utils/mediaHelper';
import { smartSearch, hasRealMatches } from '../utils/searchEngine';

interface BrowseScreenProps {
  onSelectVideo: (video: Video) => void;
  onSelectCategory: (id: CategoryId) => void;
  selectedCategory: CategoryId;
  videos?: Video[];
  categories?: CategoryInfo[];
  banners?: LandingBanner[];
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

const DEFAULT_DESKTOP_BANNERS: LandingBanner[] = [
  {
    id: 'banner-1',
    title: 'Neon Midnight Fantasies',
    subtitle: 'Exclusive 4K Ultra-HD release featuring top international performers in a private penthouse setting.',
    bannerImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=75&w=1600&auto=format&fit=crop',
    tag: 'Featured 4K Release',
    targetCategory: 'trending',
    ctaText: 'Watch Now in 4K',
    isActive: true
  },
  {
    id: 'banner-2',
    title: 'Private VIP Encounters',
    subtitle: 'Unfiltered, raw, and intense scenes curated specifically for FapnXX members.',
    bannerImage: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=75&w=1600&auto=format&fit=crop',
    tag: 'Exclusive VIP',
    targetCategory: 'milf',
    ctaText: 'Explore VIP Series',
    isActive: true
  },
  {
    id: 'banner-3',
    title: 'Subtle Illumination & Passion',
    subtitle: 'Experience intimate POV and aesthetic romance shot on high-resolution cinema sensors.',
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=75&w=1600&auto=format&fit=crop',
    tag: 'Trending POV',
    targetCategory: 'pov',
    ctaText: 'Stream Immediately',
    isActive: true
  },
  {
    id: 'banner-4',
    title: 'Velvet Dusk Rendezvous',
    subtitle: 'Sophisticated glamour and dramatic moonlight encounters in 60FPS Ultra HD.',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=75&w=1600&auto=format&fit=crop',
    tag: '4K Ultra-HD',
    targetCategory: 'amateur',
    ctaText: 'Watch Amateur Cut',
    isActive: true
  },
  {
    id: 'banner-5',
    title: 'Midnight Penthouse Encounter',
    subtitle: 'Uncut cinematic releases with immersive surround audio and 60fps streaming.',
    bannerImage: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=75&w=1600&auto=format&fit=crop',
    tag: '60FPS Cinema',
    targetCategory: 'lesbian',
    ctaText: 'Stream 60FPS',
    isActive: true
  },
  {
    id: 'banner-6',
    title: 'City Lights Encounters',
    subtitle: 'Vibrant urban aesthetic, moody neon lighting, and high-energy intimate encounters.',
    bannerImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=75&w=1600&auto=format&fit=crop',
    tag: 'Top Choice',
    targetCategory: 'teen',
    ctaText: 'Discover Highlights',
    isActive: true
  }
];

export const BrowseScreen: React.FC<BrowseScreenProps> = ({
  onSelectVideo,
  onSelectCategory,
  selectedCategory,
  videos = VIDEOS,
  categories = CATEGORIES,
  banners = INITIAL_LANDING_BANNERS,
  searchQuery = '',
  setSearchQuery,
}) => {
  const { t, language, setLanguage, currentLanguageMeta } = useLanguage();
  const [rankedTrendingVideos, setRankedTrendingVideos] = useState<Video[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isHoveredSlider, setIsHoveredSlider] = useState<boolean>(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'most_relevant' | 'top_rated'>('latest');
  const [isDurationDropdownOpen, setIsDurationDropdownOpen] = useState(false);
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [visibleCount, setVisibleCount] = useState<number>(16);

  const sortDropdownRef = React.useRef<HTMLDivElement>(null);
  const durationDropdownRef = React.useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = React.useRef<HTMLDivElement>(null);

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

  // Reset pagination on filter or search changes
  useEffect(() => {
    setVisibleCount(16);
  }, [selectedCategory, searchQuery, sortBy, durationFilter]);

  // Filter out any videos that have been taken down
  const activeVideos = React.useMemo(
    () => (videos || []).filter((v) => v && typeof v === 'object' && !v.isTakenDown),
    [videos]
  );
  const activeBanners = React.useMemo(
    () => (banners || []).filter((b) => b && typeof b === 'object' && b.isActive !== false),
    [banners]
  );
  const displayBanners = React.useMemo(() => {
    return activeBanners.length >= 6
      ? activeBanners
      : [...activeBanners, ...DEFAULT_DESKTOP_BANNERS.filter((db) => !activeBanners.some((ab) => ab.id === db.id))].slice(0, 6);
  }, [activeBanners]);

  // Preload banner slide images once when banners change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloaded = new Set<string>();
    displayBanners.forEach((b) => {
      if (b && b.bannerImage && !preloaded.has(b.bannerImage)) {
        preloaded.add(b.bannerImage);
        const img = new Image();
        img.src = b.bannerImage;
      }
    });
  }, [displayBanners]);

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

  // Trending calculation using Cloud Firestore data / activeVideos (no 404 API calls)
  useEffect(() => {
    const scored = (activeVideos || []).filter((v) => v && typeof v === 'object').map((v) => {
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
  }, [activeVideos]);

  // Deferred search engine — keeps UI typing and clicking lightning responsive
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const cleanSearch = (deferredSearchQuery || '').trim();
  const searchedVideos = React.useMemo(() => {
    return cleanSearch ? smartSearch(activeVideos, cleanSearch) : activeVideos;
  }, [activeVideos, cleanSearch]);
  const isRealMatch = React.useMemo(() => {
    return cleanSearch ? hasRealMatches(activeVideos, cleanSearch) : true;
  }, [activeVideos, cleanSearch]);

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
      : regionalVideos.filter((v) => v && v.category === selectedCategory);

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
    } else if (sortBy === 'most_relevant') {
      list.sort((a, b) => parseViews(b) - parseViews(a));
    } else if (sortBy === 'top_rated') {
      list.sort((a, b) => {
        const interestA = parseRating(a) * 100 + (a?.likesCount || 0) * 10 + parseViews(a);
        const interestB = parseRating(b) * 100 + (b?.likesCount || 0) * 10 + parseViews(b);
        return interestB - interestA;
      });
    }
    return list;
  }, [durationFilteredVideos, sortBy]);

  // Infinite Scroll IntersectionObserver trigger
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && sortedVideos.length > visibleCount) {
          setVisibleCount((prev) => Math.min(prev + 12, sortedVideos.length));
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [sortedVideos.length, visibleCount]);

  const displayedVideos = React.useMemo(() => {
    return sortedVideos.slice(0, visibleCount);
  }, [sortedVideos, visibleCount]);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <main className="flex-1 overflow-y-auto bg-[#09090b] p-4 md:p-12 pb-32 lg:ml-64">
      {/* Search Header Banner (Ultra Clean Minimalist Reference Header) */}
      {cleanSearch && (
        <section className="mb-4 sm:mb-6 flex items-center justify-between">
          <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <span>{cleanSearch} PORN VIDEOS</span>
            <span
              className="text-[#e0358d] dark:text-[#ec4899] material-symbols-outlined text-xl sm:text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              stars
            </span>
          </h2>
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

      {/* Auto-Swiping 6-Image Hero Banner Slider (Hidden during active search so searched results show at very top) */}
      {!cleanSearch && selectedCategory === 'all' && displayBanners.length > 0 && (
        <section
          className="hero-banner-container block mb-6 md:mb-10 relative w-full h-[220px] sm:h-[320px] md:h-[360px] xl:h-[420px] overflow-hidden rounded-2xl border border-[#27272a] shadow-2xl group/slider select-none bg-[#09090b] touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
                    if (banner.targetCategory) {
                      onSelectCategory(banner.targetCategory);
                    }
                  }}
                  className="w-full h-full flex-shrink-0 relative flex items-end p-4 pb-10 sm:p-8 xl:p-12 cursor-pointer"
                >
                  <img
                    src={getBannerImageUrl(banner, index)}
                    alt={banner.title}
                    decoding={index === 0 ? 'sync' : 'async'}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    onError={(e) => handleBannerImageError(e, index)}
                    className="absolute inset-0 w-full h-full object-cover gpu-accelerated"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/95 via-[#09090b]/40 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#09090b]/80 via-transparent to-transparent pointer-events-none" />

                  <div
                    className={`relative z-10 max-w-xl sm:max-w-2xl space-y-1.5 sm:space-y-3 transition-all duration-700 ease-out ${
                      isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-90'
                    }`}
                  >
                    <span className="hero-banner-tag inline-block px-2 py-0.5 sm:px-3 sm:py-1 bg-[#ec4899] text-white text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-md shadow-lg">
                      {banner.tag || 'Featured Release'}
                    </span>
                    <h1 className="hero-banner-title hero-text banner-title text-base sm:text-3xl xl:text-5xl font-black text-white italic tracking-tight hover:text-[#ffb0cd] transition-colors duration-150 line-clamp-1 sm:line-clamp-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                      {banner.title}
                    </h1>
                    <p className="hero-banner-subtitle text-[10px] sm:text-xs xl:text-sm text-zinc-100 line-clamp-1 sm:line-clamp-2 leading-snug sm:leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] font-medium">
                      {banner.subtitle}
                    </p>
                    <div className="pt-0.5 sm:pt-2">
                      <span className="hero-banner-cta inline-flex items-center gap-1 px-3 py-1 sm:px-5 sm:py-2.5 rounded-full bg-black/70 hover:bg-[#ec4899] text-white font-extrabold text-[9px] sm:text-xs uppercase tracking-wider backdrop-blur-md transition-all duration-150 border border-white/30 shadow-lg hover:scale-105 active:scale-95">
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
            <h2 className="text-2xl md:text-3xl font-bold text-[#ffb0cd] flex items-center gap-2">
              <span className="material-symbols-outlined fill-1 text-rose-500">local_fire_department</span>
              {t.trendingNow}
            </h2>
            <span className="text-xs text-[#a19fa6] font-semibold tracking-wider uppercase hidden sm:inline">
              Ranked by Dynamic Engagement Engine
            </span>
          </div>

          <div className="flex overflow-x-auto hide-scrollbar gap-6 snap-x snap-mandatory pb-4">
            {rankedTrendingVideos.map((video, index) => (
              <div
                key={video.id}
                onClick={() => onSelectVideo(video)}
                className="snap-start shrink-0 w-[85vw] md:w-[60vw] lg:w-[45vw] aspect-video relative rounded-xl overflow-hidden group cursor-pointer border border-[#27272a] hover:border-[#ffb0cd] transition-all duration-300 shadow-xl"
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

      {/* Category Pills Filter — hidden during search query so results surface right at top */}
      {!cleanSearch && (
        <section className="mb-10 w-full">
          <div className="flex md:flex-wrap gap-2 md:gap-3 overflow-x-auto md:overflow-x-visible hide-scrollbar snap-x snap-mandatory md:snap-none pb-1 md:pb-0">
            <button
              onClick={() => onSelectCategory('all')}
              className={`snap-start shrink-0 px-4 md:px-5 py-1.5 md:py-2 rounded-full font-semibold text-xs transition-all cursor-pointer active:scale-95 ${
                selectedCategory === 'all'
                  ? 'bg-[#ec4899] text-white border border-[#ec4899] shadow-neon-pink'
                  : 'bg-[#27272a] text-white hover:bg-[#ffb0cd] hover:text-black border border-transparent'
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
                    : 'bg-[#27272a] text-white hover:bg-[#ffb0cd] hover:text-black border border-transparent'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Video Grid Section */}
      <section className="w-full">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Interactive Sort Dropdown Header */}
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="sort-filter-btn flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#1c1b1f] hover:bg-[#27272a] text-white border border-white/10 hover:border-[#e0358d] transition-all shadow-none cursor-pointer active:scale-95"
                title="Click to change video sorting filter"
              >
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#e0358d]">sort</span>
                  <span>
                    {sortBy === 'latest' ? 'Latest' : sortBy === 'most_relevant' ? 'Most Relevant' : 'Top Rated'}
                  </span>
                </span>
                <span className="material-symbols-outlined text-sm sm:text-base opacity-80">expand_more</span>
              </button>

              {isSortDropdownOpen && (
                <div className="dropdown-modal-menu absolute left-0 mt-2 w-48 rounded-2xl shadow-2xl py-1.5 z-50 text-xs border border-white/10 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#debec8] border-b border-white/10 mb-1 flex items-center justify-between">
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
                      sortBy === 'latest' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">Latest</span>
                    {sortBy === 'latest' && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>

                  {/* Option 2: Most Relevant */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSortDropdownOpen(false);
                      React.startTransition(() => {
                        setSortBy('most_relevant');
                      });
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      sortBy === 'most_relevant' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">Most Relevant</span>
                    {sortBy === 'most_relevant' && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
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
                      sortBy === 'top_rated' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-white/10 font-semibold'
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
                    ? 'bg-[#e0358d]/20 border-[#e0358d] text-white shadow-[0_0_15px_rgba(224,53,141,0.2)]'
                    : 'bg-[#1c1b1f] hover:bg-[#27272a] text-white border-white/10 hover:border-[#e0358d]'
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
                <div className="dropdown-modal-menu absolute left-0 mt-2 w-48 rounded-2xl shadow-2xl py-1.5 z-50 text-xs border border-white/10 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#debec8] border-b border-white/10 mb-1 flex items-center justify-between">
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
                      durationFilter === 'all' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-white/10 font-semibold'
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
                      durationFilter === 'short' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-white/10 font-semibold'
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
                      durationFilter === 'medium' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-white/10 font-semibold'
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
                      durationFilter === 'long' ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="font-bold text-xs">Long (20+ mins)</span>
                    {durationFilter === 'long' && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-zinc-400 font-mono font-semibold">
            <span>Showing {displayedVideos.length} of {sortedVideos.length} Videos</span>
          </div>
        </div>

        {displayedVideos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-5 gap-x-4 sm:gap-6">
              {displayedVideos.filter((v) => v && v.id).map((video, idx) => (
                <React.Fragment key={video.id}>
                  <VideoCard
                    video={video}
                    onClick={() => onSelectVideo(video)}
                  />
                  {/* In-Feed Outstream Video Ad Placement every AD_CONFIG.OUTSTREAM_FEED_FREQUENCY cards */}
                  {(idx + 1) % AD_CONFIG.OUTSTREAM_FEED_FREQUENCY === 0 && (
                    <OutstreamVideoCardAd key={`outstream-ad-card-${idx}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Sentinel element for automatic Infinite Scroll */}
            <div ref={loadMoreTriggerRef} className="h-6 w-full my-4" />

            {/* Load More Button fallback */}
            {visibleCount < sortedVideos.length && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 16, sortedVideos.length))}
                  className="px-6 py-3 rounded-2xl bg-[#1c1b1f] hover:bg-[#27272a] text-white font-extrabold text-xs uppercase tracking-wider border border-white/10 hover:border-[#e0358d] transition-all cursor-pointer active:scale-95 shadow-lg flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm text-[#e0358d]">expand_more</span>
                  <span>Load More Videos ({sortedVideos.length - visibleCount} Remaining)</span>
                </button>
              </div>
            )}

            {/* Multi-Device Native Recommendation Sponsored Widget (Zone ID: 6010176) */}
            <NativeRecommendationAd title="Sponsored Picks & Recommendations" className="mt-8" />
          </>
        ) : (
          <div className="p-12 text-center text-[#debec8] bg-[#1c1b1d] rounded-2xl border border-[#353437] space-y-3">
            <span className="material-symbols-outlined text-5xl text-[#ffb0cd]">cloud_off</span>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No Videos Found</h3>
            <p className="text-sm text-[#debec8] max-w-md mx-auto">
              We couldn't find any content matching your current selection. Please try a different category, duration, or search query.
            </p>
          </div>
        )}
      </section>
    </main>
  );
};
