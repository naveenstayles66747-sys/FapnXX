import React, { useEffect, useState } from 'react';
import { CategoryId, CategoryInfo, LandingBanner, Video } from '../types';
import { CATEGORIES, INITIAL_LANDING_BANNERS, VIDEOS } from '../data';
import { VideoCard } from './VideoCard';
import { useLanguage } from '../i18n/LanguageContext';

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
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
    tag: 'Featured 4K Release',
    targetCategory: 'trending',
    ctaText: 'Watch Now in 4K',
    isActive: true
  },
  {
    id: 'banner-2',
    title: 'Private VIP Encounters',
    subtitle: 'Unfiltered, raw, and intense scenes curated specifically for FapnXX members.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTSrT7ZfnLWJmVyGjfLgykiPkmf7a4I4Z57uEg4c8C2_mJ0w3Y2UlFj5Gp5iEtMegkDAtFW4BKpVK3JE5pODTLTPETiDTQyukLYcV--2v9vb8b-OEkgHaWihpbbRppVRY0YbgqDfyvtuphn5xrfVZWgyDUKRJA2wZVxWJTWpDmQ6DpzeuUmUe8ySRNKup3oJc5VLYhRtM6nfKRK-UOZLtbi132Yme7AQeLMsUzD79lpUUp9Ckdox0HQQ',
    tag: 'Exclusive VIP',
    targetCategory: 'milf',
    ctaText: 'Explore VIP Series',
    isActive: true
  },
  {
    id: 'banner-3',
    title: 'Subtle Illumination & Passion',
    subtitle: 'Experience intimate POV and aesthetic romance shot on high-resolution cinema sensors.',
    bannerImage: 'https://lh3.googleusercontent.com/aida/AP1WRLs5y8ft3CThjXzumEpc3azxLY3QKyR8aZ3p0q786H2ndH2rdcjcbpMGVerFh_bCioKAuQRfUOdkx48FNdonP0tx-OxsMFArRHUx9_QMZ2q3VzQfWAIUBUZRvK9VGHJC3MYO8-zKg1JY36tH2BC8gl54Fg4OZqAl6Hu5nnfDFy8rgLjErqdnCiXTkuhA-Z7dKwuX0Z5XdGhS8uBLxIWlygmG82L4DvNTvPVWLxnZMiLdsJspXJESERcqnj4w',
    tag: 'Trending POV',
    targetCategory: 'pov',
    ctaText: 'Stream Immediately',
    isActive: true
  },
  {
    id: 'banner-4',
    title: 'Velvet Dusk Rendezvous',
    subtitle: 'Sophisticated glamour and dramatic moonlight encounters in 60FPS Ultra HD.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBE-0RTWMQV-7aa5pGek-uZcH-J6NVY0INtMVyfRl352aCeM1uLLWSiSffe_5UkDXumbA8P3mzZ8nlChpgEnecAWSvWzXNqVF9bdRrgn4ZLRJ0p4JPa9gHP10i8FLpBvywDMR2gwDmptUGPby7rE6kgzi1eMivMfKRgQnn9pVpXkpeoFyMXZ4pY8uuvPTDbXWKvLc4gDcITGq9j9T1u3RoFCipZwkUoxWZl6_xUwgrJW_EK5rGwLAtbqQ',
    tag: '4K Ultra-HD',
    targetCategory: 'amateur',
    ctaText: 'Watch Amateur Cut',
    isActive: true
  },
  {
    id: 'banner-5',
    title: 'Midnight Penthouse Encounter',
    subtitle: 'Uncut cinematic releases with immersive surround audio and 60fps streaming.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvVmv9cY2dl_zIEo33CGIwiRDN909BI0EosxDqwew2wWmzQP_fALhg57IyLPUEyXtxxUMdzTRHoU0b9duqmKCxKFHCaeOISv7kzyqQWZSkSvX5nQoG2fSInUivHEMqe740-4kJ8zEnE66XQAAe5y_iKuxl9fyETTTK2S3XuvUPBR8LeBvKRBZ7dWH7xKWCDTBBIS2NHus-SKFoVKwTAg2FwIYbonIdNIJRVcHnX3UV-TD_hHUgC1J6yw',
    tag: '60FPS Cinema',
    targetCategory: 'lesbian',
    ctaText: 'Stream 60FPS',
    isActive: true
  },
  {
    id: 'banner-6',
    title: 'City Lights Encounters',
    subtitle: 'Vibrant urban aesthetic, moody neon lighting, and high-energy intimate encounters.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-OYI524BZ48HOkZ2JX5LYqmyIji7hU1exKz5GYHfhzSmB-U9IkbGli86UCYFTtvOQH6an4ENmj1uvF4sp72yvfkdjfOxj4DabRz53a-5QteTtz51X2hJV59fVqCRf3CrvuQnvsBdSIKtFTJccaSZBw0iKvQmyqLiRjp1PVyDgBCKIjG7Dg9_ImGXxeIWah3swnYZ874JWJFH3yph7U5Z1lVuSuGTNd2F8mgXi84tEP0lIYp8o_MLS4A',
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
  const { t } = useLanguage();
  const [rankedTrendingVideos, setRankedTrendingVideos] = useState<Video[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isHoveredSlider, setIsHoveredSlider] = useState<boolean>(false);

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

  // Filter videos by category and search query
  const cleanSearch = searchQuery.trim().toLowerCase();
  const searchedVideos = cleanSearch
    ? activeVideos.filter(
        (v) =>
          v.title.toLowerCase().includes(cleanSearch) ||
          v.description.toLowerCase().includes(cleanSearch) ||
          v.tags.some((t) => t.toLowerCase().includes(cleanSearch)) ||
          v.performerName?.toLowerCase().includes(cleanSearch)
      )
    : activeVideos;

  const justAddedVideos =
    selectedCategory === 'all'
      ? searchedVideos
      : searchedVideos.filter((v) => v.category === selectedCategory);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <main className="flex-1 overflow-y-auto bg-[#09090b] p-4 md:p-12 pb-32 lg:ml-64">
      {/* Search Header Banner */}
      {cleanSearch && (
        <section className="mb-8 p-4 rounded-xl bg-[#1e1d21] border border-[#ec4899]/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#ffb0cd]">search</span>
            <div>
              <span className="text-xs text-[#a19fa6]">Search results for:</span>
              <h3 className="text-lg font-bold text-white italic">"{searchQuery}"</h3>
            </div>
            <span className="bg-[#ec4899]/20 text-[#ffb0cd] border border-[#ec4899]/30 text-xs font-bold px-2.5 py-0.5 rounded-full ml-2">
              {justAddedVideos.length} {justAddedVideos.length === 1 ? 'video' : 'videos'} found
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

      {/* Auto-Swiping 6-Image Hero Banner Slider */}
      {selectedCategory === 'all' && displayBanners.length > 0 && (
        <section
          className="hero-banner-container block mb-6 md:mb-10 relative w-full h-[260px] sm:h-[320px] md:h-[360px] xl:h-[420px] overflow-hidden rounded-2xl border border-[#27272a] shadow-2xl group/slider select-none bg-[#09090b]"
        >
          {/* Preloaded GPU Cross-Fade Banner Slide Layers */}
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
                className={`absolute inset-0 w-full h-full flex items-end p-8 xl:p-12 cursor-pointer transition-all duration-700 ease-in-out ${
                  isActive
                    ? 'opacity-100 scale-100 z-10 pointer-events-auto'
                    : 'opacity-0 scale-105 z-0 pointer-events-none'
                }`}
                style={{ willChange: 'opacity, transform' }}
              >
                <img
                  src={banner.bannerImage || DEFAULT_DESKTOP_BANNERS[0].bannerImage}
                  alt={banner.title}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover gpu-accelerated"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#09090b]/90 via-transparent to-transparent pointer-events-none" />

                <div
                  className={`relative z-10 max-w-2xl space-y-3 transition-all duration-700 ease-out ${
                    isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}
                >
                  <span className="inline-block px-3 py-1 bg-[#ec4899] text-white text-[11px] font-black uppercase tracking-wider rounded-md shadow-lg">
                    {banner.tag || 'Featured Release'}
                  </span>
                  <h1 className="text-3xl xl:text-5xl font-black text-white italic tracking-tight hover:text-[#ffb0cd] transition-colors duration-150">
                    {banner.title}
                  </h1>
                  <p className="text-xs xl:text-sm text-[#debec8] line-clamp-2 leading-relaxed">
                    {banner.subtitle}
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-[#ec4899] text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md transition-all duration-150 border border-white/20 shadow-lg hover:scale-105 active:scale-95">
                      <span>{banner.ctaText || 'Watch Now'}</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

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

          {/* Bottom Dot Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {displayBanners.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex(index);
                }}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  index === currentSlideIndex
                    ? 'w-8 bg-[#ec4899] shadow-neon-pink'
                    : 'w-2.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Advanced Recommendation & Trending Carousel Section */}
      {rankedTrendingVideos.length > 3 && (
        <section className="mb-12 relative w-full">
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

      {/* Category Pills Filter */}
      <section className="mb-10 w-full">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-5 py-2 rounded-full font-semibold text-xs transition-all cursor-pointer active:scale-95 ${
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
              className={`px-5 py-2 rounded-full font-semibold text-xs transition-all cursor-pointer active:scale-95 capitalize ${
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
        <h2 className="text-2xl font-bold text-white mb-6">
          {selectedCategory === 'all'
            ? 'Just Added'
            : `${selectedCategoryObj?.name || selectedCategory.toUpperCase()} Videos`}
        </h2>

        {justAddedVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {justAddedVideos.map((video) => (
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
