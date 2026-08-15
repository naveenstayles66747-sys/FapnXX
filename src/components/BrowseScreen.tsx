import React, { useEffect, useState } from 'react';
import { CategoryId, CategoryInfo, LandingBanner, Video } from '../types';
import { CATEGORIES, INITIAL_LANDING_BANNERS, VIDEOS } from '../data';
import { VideoCard } from './VideoCard';
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
    bannerImage: '/assets/banners/banner1.jpg',
    tag: 'Featured 4K Release',
    targetCategory: 'trending',
    ctaText: 'Watch Now in 4K',
    isActive: true
  },
  {
    id: 'banner-2',
    title: 'Private VIP Encounters',
    subtitle: 'Unfiltered, raw, and intense scenes curated specifically for FapnXX members.',
    bannerImage: '/assets/banners/banner2.jpg',
    tag: 'Exclusive VIP',
    targetCategory: 'milf',
    ctaText: 'Explore VIP Series',
    isActive: true
  },
  {
    id: 'banner-3',
    title: 'Subtle Illumination & Passion',
    subtitle: 'Experience intimate POV and aesthetic romance shot on high-resolution cinema sensors.',
    bannerImage: '/assets/banners/banner3.jpg',
    tag: 'Trending POV',
    targetCategory: 'pov',
    ctaText: 'Stream Immediately',
    isActive: true
  },
  {
    id: 'banner-4',
    title: 'Velvet Dusk Rendezvous',
    subtitle: 'Sophisticated glamour and dramatic moonlight encounters in 60FPS Ultra HD.',
    bannerImage: '/assets/banners/banner4.jpg',
    tag: '4K Ultra-HD',
    targetCategory: 'amateur',
    ctaText: 'Watch Amateur Cut',
    isActive: true
  },
  {
    id: 'banner-5',
    title: 'Midnight Penthouse Encounter',
    subtitle: 'Uncut cinematic releases with immersive surround audio and 60fps streaming.',
    bannerImage: '/assets/banners/banner5.jpg',
    tag: '60FPS Cinema',
    targetCategory: 'lesbian',
    ctaText: 'Stream 60FPS',
    isActive: true
  },
  {
    id: 'banner-6',
    title: 'City Lights Encounters',
    subtitle: 'Vibrant urban aesthetic, moody neon lighting, and high-energy intimate encounters.',
    bannerImage: '/assets/banners/banner6.jpg',
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
  const sortDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter out any videos that have been taken down
  const activeVideos = videos.filter((v) => !v.isTakenDown);
  const activeBanners = (banners || []).filter((b) => b && b.isActive !== false);
  const displayBanners =
    activeBanners.length >= 6
      ? activeBanners
      : [...activeBanners, ...DEFAULT_DESKTOP_BANNERS.filter((db) => !activeBanners.some((ab) => ab.id === db.id))].slice(0, 6);

  // Preload all banner slide images into browser memory to eliminate image load flickering/glitching
  useEffect(() => {
    displayBanners.forEach((b) => {
      if (b.bannerImage) {
        const img = new Image();
        img.src = b.bannerImage;
      }
    });
  }, [displayBanners]);

  // Continuous auto-swipe timer every 4.5 seconds (never pauses on hover)
  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % displayBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [displayBanners.length]);

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev + 1) % displayBanners.length);
  };

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
  };

  // Trending calculation using Cloud Firestore data / activeVideos (no 404 API calls)
  useEffect(() => {
    const scored = (activeVideos || []).map((v) => {
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
  }, [videos]);

  // Smart search engine — fuzzy multi-field matching, always returns results
  const cleanSearch = searchQuery.trim();
  const searchedVideos = cleanSearch
    ? smartSearch(activeVideos, cleanSearch)
    : activeVideos;
  const isRealMatch = cleanSearch ? hasRealMatches(activeVideos, cleanSearch) : true;

  // Smart Language-Based Regional Recommendation Engine
  const regionalVideos = React.useMemo(() => {
    if (!currentLanguageMeta || !currentLanguageMeta.keywords || currentLanguageMeta.code === 'en') {
      return searchedVideos;
    }
    const keywords = currentLanguageMeta.keywords.map((k) => k.toLowerCase());
    const scored = searchedVideos.map((video) => {
      let matchCount = 0;
      const titleLower = video.title.toLowerCase();
      const descLower = video.description.toLowerCase();
      const tagsLower = video.tags.map((t) => t.toLowerCase());

      keywords.forEach((kw) => {
        if (titleLower.includes(kw)) matchCount += 3;
        if (descLower.includes(kw)) matchCount += 1;
        if (tagsLower.some((t) => t.includes(kw))) matchCount += 2;
      });

      return { video, score: matchCount };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((item) => item.video);
  }, [searchedVideos, currentLanguageMeta]);

  const justAddedVideos =
    selectedCategory === 'all'
      ? regionalVideos
      : regionalVideos.filter((v) => v.category === selectedCategory);

  const sortedVideos = React.useMemo(() => {
    const list = [...justAddedVideos];
    const parseViews = (v: Video): number => {
      if (typeof v.viewsCount === 'number' && v.viewsCount > 0) return v.viewsCount;
      const str = v.views || '';
      const num = parseFloat(str.replace(/[^0-9.]/g, ''));
      if (isNaN(num)) return 0;
      if (/k/i.test(str)) return num * 1000;
      if (/m/i.test(str)) return num * 1000000;
      return num;
    };

    const parseRating = (v: Video): number => {
      return parseInt((v.rating || '0').replace('%', ''), 10) || 0;
    };

    if (sortBy === 'latest') {
      // Sort by newest upload date timestamp
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === 'most_relevant') {
      // Sort strictly by views count descending (highest views first)
      list.sort((a, b) => parseViews(b) - parseViews(a));
    } else if (sortBy === 'top_rated') {
      // Sort by user interest engine (rating percentage + likes + view engagement)
      list.sort((a, b) => {
        const interestA = parseRating(a) * 100 + (a.likesCount || 0) * 10 + parseViews(a);
        const interestB = parseRating(b) * 100 + (b.likesCount || 0) * 10 + parseViews(b);
        return interestB - interestA;
      });
    }
    return list;
  }, [justAddedVideos, sortBy]);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <main className="flex-1 overflow-y-auto bg-[#09090b] p-4 md:p-12 pb-32 lg:ml-64">
      {/* Search Header Banner */}
      {cleanSearch && (
        <section className="mb-8 p-4 rounded-xl bg-[#1e1d21] border border-[#ec4899]/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="material-symbols-outlined text-[#ffb0cd]">search</span>
            <div>
              <span className="text-xs text-[#a19fa6]">
                {isRealMatch ? 'Search results for:' : 'No exact match — showing popular videos for:'}
              </span>
              <h3 className="text-lg font-bold text-white italic">"{searchQuery}"</h3>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              isRealMatch
                ? 'bg-[#ec4899]/20 text-[#ffb0cd] border-[#ec4899]/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {isRealMatch
                ? `${justAddedVideos.length} ${justAddedVideos.length === 1 ? 'video' : 'videos'} found`
                : 'Showing popular content'}
            </span>
          </div>
          {setSearchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-[#debec8] hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Clear Search
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

      {/* Auto-Swiping 6-Image Hero Banner Slider */}
      {selectedCategory === 'all' && displayBanners.length > 0 && (
        <section
          className="hero-banner-container block mb-6 md:mb-10 relative w-full h-[220px] sm:h-[320px] md:h-[360px] xl:h-[420px] overflow-hidden rounded-2xl border border-[#27272a] shadow-2xl group/slider select-none bg-[#09090b]"
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
                    if (banner.targetCategory) {
                      onSelectCategory(banner.targetCategory);
                    }
                  }}
                  className="w-full h-full flex-shrink-0 relative flex items-end p-4 pb-10 sm:p-8 xl:p-12 cursor-pointer"
                >
                  <img
                    src={getBannerImageUrl(banner, index)}
                    alt={banner.title}
                    decoding="async"
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
                    <span className="inline-block px-2 py-0.5 sm:px-3 sm:py-1 bg-[#ec4899] text-white text-[9px] sm:text-[11px] font-black uppercase tracking-wider rounded-md shadow-lg">
                      {banner.tag || 'Featured Release'}
                    </span>
                    <h1 className="text-base sm:text-3xl xl:text-5xl font-black text-white italic tracking-tight hover:text-[#ffb0cd] transition-colors duration-150 line-clamp-1 sm:line-clamp-none">
                      {banner.title}
                    </h1>
                    <p className="text-[10px] sm:text-xs xl:text-sm text-[#debec8] line-clamp-1 sm:line-clamp-2 leading-snug sm:leading-relaxed">
                      {banner.subtitle}
                    </p>
                    <div className="pt-0.5 sm:pt-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1 sm:px-5 sm:py-2.5 rounded-full bg-white/10 hover:bg-[#ec4899] text-white font-extrabold text-[9px] sm:text-xs uppercase tracking-wider backdrop-blur-md transition-all duration-150 border border-white/20 shadow-lg hover:scale-105 active:scale-95">
                        <span>{banner.ctaText || 'Watch Now'}</span>
                        <span className="material-symbols-outlined text-xs sm:text-sm">arrow_forward</span>
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

      {/* Advanced Recommendation & Trending Carousel Section — Desktop only */}
      {rankedTrendingVideos.length > 3 && (
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

      {/* Category Pills Filter — horizontal scroll on mobile, wrap on desktop */}
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

      {/* Video Grid Section */}
      <section className="w-full">
        <div className="flex items-center justify-between gap-4 mb-6">
          {/* Interactive Sort Dropdown Header (Replaces static Latest text) */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="sort-filter-btn flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#1c1b1f] hover:bg-[#27272a] text-white border border-white/10 hover:border-[#e0358d] transition-all shadow-none cursor-pointer active:scale-95"
              title="Click to change video sorting filter"
            >
              <span className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                {selectedCategory === 'all'
                  ? (sortBy === 'latest' ? 'Latest' : sortBy === 'most_relevant' ? 'Most Relevant' : 'Top Rated')
                  : `${selectedCategoryObj?.name || selectedCategory.toUpperCase()} (${sortBy === 'latest' ? 'Latest' : sortBy === 'most_relevant' ? 'Most Relevant' : 'Top Rated'})`}
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
                  onClick={() => {
                    setSortBy('latest');
                    setIsSortDropdownOpen(false);
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
                  onClick={() => {
                    setSortBy('most_relevant');
                    setIsSortDropdownOpen(false);
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
                  onClick={() => {
                    setSortBy('top_rated');
                    setIsSortDropdownOpen(false);
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
        </div>

        {sortedVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-5 gap-x-4 sm:gap-6">
            {sortedVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => onSelectVideo(video)}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-[#debec8] bg-[#1c1b1d] rounded-2xl border border-[#353437] space-y-3">
            <span className="material-symbols-outlined text-5xl text-[#ffb0cd]">cloud_off</span>
            <h3 className="text-xl font-bold text-white">No Videos Found</h3>
            <p className="text-sm text-[#debec8] max-w-md mx-auto">
              We couldn't find any content matching your current selection. Please try a different category or search query.
            </p>
          </div>
        )}
      </section>
    </main>
  );
};
