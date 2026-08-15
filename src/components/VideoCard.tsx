import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';

interface VideoCardProps {
  video: Video;
  onClick: () => void;
  layout?: 'grid' | 'horizontal';
}

const formatViews = (count?: number, fallbackStr?: string): string => {
  let num = count;
  if (num === undefined && fallbackStr) {
    const parsed = parseInt(fallbackStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed)) num = parsed;
  }
  if (typeof num === 'number' && !isNaN(num) && num >= 0) {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
    return `${num} ${num === 1 ? 'view' : 'views'}`;
  }
  return fallbackStr || '1 view';
};

const formatTimeAgo = (createdAt?: string, fallbackStr?: string): string => {
  let dateObj: Date | null = null;
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }
  if (!dateObj && fallbackStr && fallbackStr !== 'Just now') {
    return fallbackStr;
  }
  if (!dateObj) {
    return 'Just now';
  }

  const diffMs = Math.max(0, Date.now() - dateObj.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear}y ago`;
};

const FALLBACK_THUMBNAIL = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop';

// ─── Extract ONLY dedicated preview media (WebP animated / MP4 clip) ───────────
// IMPORTANT: embedUrl is STRICTLY for the video player page — it is NEVER used
// as a hover preview on video cards, to avoid thumbnail/embed mismatch confusion.
const extractPreviewDetails = (video: Video) => {
  // Priority 1: Animated WebP / GIF thumbnail preview (best for cards)
  const webpSrc = (video.previewWebpUrl || '').trim();
  if (webpSrc) {
    const urlPath = webpSrc.split('?')[0].split('#')[0].toLowerCase();
    const isImage = /\.(webp|gif|png|jpe?g|avif|svg)$/i.test(urlPath);
    const isVideo = /\.(mp4|webm|m3u8|mov|ogg)$/i.test(urlPath);
    if (isImage) return { previewSrc: webpSrc, previewType: 'image' as const };
    if (isVideo) return { previewSrc: webpSrc, previewType: 'video' as const };
  }

  // Priority 2: Dedicated MP4/WebM preview clip (short 10-30s clip separate from embed)
  const mp4Src = (video.previewMp4Url || '').trim();
  if (mp4Src) {
    const urlPath = mp4Src.split('?')[0].split('#')[0].toLowerCase();
    const isVideo = /\.(mp4|webm|m3u8|mov|ogg)$/i.test(urlPath);
    const isImage = /\.(webp|gif|png|jpe?g|avif|svg)$/i.test(urlPath);
    if (isVideo) return { previewSrc: mp4Src, previewType: 'video' as const };
    if (isImage) return { previewSrc: mp4Src, previewType: 'image' as const };
    // If mp4Url is actually an embed link (wrongly stored) — skip it, don't show
    // embedseek / hornhub / external embed links are NOT preview media
    const isExternalEmbed = /embedseek|hornhub|iframe|embed\./.test(urlPath);
    if (!isExternalEmbed && mp4Src.startsWith('http')) {
      // Could be a direct CDN stream
      return { previewSrc: mp4Src, previewType: 'video' as const };
    }
  }

  // embedUrl is intentionally NOT used here — it belongs only to VideoDetailScreen player
  return { previewSrc: '', previewType: 'none' as const };
};

// Check if a video has an embed source (for badge display)
const hasEmbedSource = (video: Video): boolean => {
  return Boolean(video.embedUrl?.trim() || video.isEmbed);
};

export const VideoCard: React.FC<VideoCardProps> = ({ video, onClick, layout = 'grid' }) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMobilePreviewing, setIsMobilePreviewing] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 150); // Fast 150ms responsive hover trigger on desktop
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Detect mobile device strictly by screen width and coarse pointer
  useEffect(() => {
    const checkMobile = () => {
      const isSmallScreen = window.innerWidth <= 768;
      const isCoarseTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024;
      setIsMobile(isSmallScreen || isCoarseTouch);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Single active mobile preview lock across entire app (only 1 video plays at a time)
  useEffect(() => {
    const handleActiveChange = (e: CustomEvent<string | null>) => {
      if (e.detail !== video.id) {
        setIsMobilePreviewing(false);
      }
    };

    window.addEventListener('active-mobile-preview-change' as any, handleActiveChange as any);
    return () => {
      window.removeEventListener('active-mobile-preview-change' as any, handleActiveChange as any);
    };
  }, [video.id]);

  // Mobile Intersection Observer: Auto-stop preview when card scrolls out of view (less than 40% visible)
  useEffect(() => {
    if (!isMobile || !isMobilePreviewing || !cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.4) {
          setIsMobilePreviewing(false);
          window.dispatchEvent(
            new CustomEvent('active-mobile-preview-change', {
              detail: null,
            })
          );
        }
      },
      { threshold: [0, 0.4, 0.8] }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isMobile, isMobilePreviewing]);

  const toggleMobilePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const nextState = !isMobilePreviewing;
    setIsMobilePreviewing(nextState);

    // Notify all other VideoCard instances to stop playing so only 1 plays at a time!
    window.dispatchEvent(
      new CustomEvent('active-mobile-preview-change', {
        detail: nextState ? video.id : null,
      })
    );
  };

  const { previewSrc, previewType } = extractPreviewDetails(video);

  const shouldPlayPreview = isMobile ? isMobilePreviewing : isHovered;

  // Force autoplay for MP4 video previews when active
  useEffect(() => {
    if (videoRef.current && previewType === 'video') {
      if (shouldPlayPreview) {
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [shouldPlayPreview, previewType]);

  // Video's own thumbnail — with priority: custom thumbnail -> animated webp -> fallback
  const primaryThumb = (video.thumbnail || video.thumbnailUrl || video.previewWebpUrl || '').trim();
  const displayThumbnail = primaryThumb || FALLBACK_THUMBNAIL;

  const renderPreviewOverlay = () => {
    if (!shouldPlayPreview || !previewSrc) return null;

    if (previewType === 'image') {
      return (
        <img
          src={previewSrc}
          alt={video.title}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== FALLBACK_THUMBNAIL) {
              target.src = FALLBACK_THUMBNAIL;
            }
          }}
          className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none transition-opacity duration-300 z-10"
        />
      );
    }

    return (
      <video
        ref={videoRef}
        src={previewSrc}
        muted
        loop
        playsInline
        autoPlay
        controls={false}
        preload="auto"
        referrerPolicy="no-referrer"
        onCanPlay={(e) => {
          const v = e.currentTarget;
          v.muted = true;
          v.play().catch(() => {});
        }}
        onLoadedData={(e) => {
          const v = e.currentTarget;
          v.muted = true;
          v.play().catch(() => {});
        }}
        onError={() => {
          console.warn('[VideoCard] Preview video load error.');
        }}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 scale-105 z-10"
      />
    );
  };

  if (layout === 'horizontal') {
    return (
      <article
        ref={cardRef}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative bg-[#131315] rounded-2xl overflow-hidden border border-[#353437] hover:border-[#ffb0cd]/50 transition-colors cursor-pointer flex flex-col md:flex-row"
      >
        <div className="relative w-full md:w-2/5 aspect-video md:aspect-auto overflow-hidden bg-black">
          {/* Default Static Thumbnail */}
          <img
            src={displayThumbnail}
            alt={video.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== FALLBACK_THUMBNAIL) {
                target.src = FALLBACK_THUMBNAIL;
              }
            }}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          />

          {/* Active Preview Overlay */}
          {renderPreviewOverlay()}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* Active Preview Badge */}
          {isHovered && (
            <div className="absolute top-2 right-2 bg-[#ec4899] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1 animate-pulse z-20">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Previewing
            </div>
          )}

          {/* Compact Duration Badge at Bottom Right Corner */}
          {!shouldPlayPreview && (
            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white border border-white/10 z-20">
              {video.duration || '05:00'}
            </div>
          )}

          {/* Top-Left Quality Badge */}
          {!shouldPlayPreview && video.quality && (
            <div className="absolute top-2 left-2 z-20">
              <span className="bg-[#ec4899] text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-md">
                {video.quality}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 flex flex-col justify-between w-full md:w-3/5">
          <div>
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-bold text-lg md:text-xl text-[#e5e1e4] group-hover:text-[#ffb0cd] transition-colors line-clamp-2 leading-snug">
                {video.title}
              </h4>
            </div>
            <p className="text-[#debec8] text-sm line-clamp-2 mb-4 leading-relaxed">
              {video.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-[#2a2a2c] text-[#e5e1e4] text-xs px-2.5 py-1 rounded font-medium uppercase">
                {video.categoryLabel}
              </span>
              <span className="bg-[#2a2a2c] text-[#e5e1e4] text-xs px-2.5 py-1 rounded font-medium">
                {video.quality}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs text-[#debec8] font-medium pt-2 border-t border-white/5">
            <div className="flex items-center space-x-1">
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>{formatViews(video.viewsCount, video.views)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>{formatTimeAgo(video.createdAt, video.timeAgo)}</span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Dedicated animated preview (WebP/GIF) — only from previewWebpUrl field
  const webpPreviewUrl = (video.previewWebpUrl || '').trim() || (previewType === 'image' ? previewSrc : '');
  // Embed badge intentionally hidden — removed from card UI

  return (
    <article
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer flex flex-col w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300"
    >
      {/* 16:9 Full-Width Thumbnail Container matching requested spec */}
      <div className="video-card-container relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/10 hover:border-rose-500/80 transition-colors duration-200 bg-[#09090b]">
        {/* Default Static Thumbnail */}
        <img
          src={displayThumbnail}
          alt={video.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== FALLBACK_THUMBNAIL) {
              target.src = FALLBACK_THUMBNAIL;
            }
          }}
          className="static-thumb w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        />

        {/* Hover Animated WebP Preview */}
        {shouldPlayPreview && webpPreviewUrl && (
          <img
            src={webpPreviewUrl}
            alt={`${video.title} Animated Preview`}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            className="hover-webp absolute inset-0 w-full h-full object-cover transition-opacity duration-400 opacity-100 pointer-events-none z-10 scale-105"
          />
        )}

        {/* Dynamic Video Fallback Preview (for MP4 previews if no WebP) */}
        {shouldPlayPreview && !webpPreviewUrl && renderPreviewOverlay()}

      {/* ─── Thumbnail badges: HD top-right, Duration bottom-right (no mobile preview btn overlap) ─── */}

        {/* Top-Right: Quality Badge only */}
        {!shouldPlayPreview && (
          <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1">
            <span className="bg-black/85 text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md tracking-wide">
              {video.quality || 'HD'}
            </span>
          </div>
        )}

        {/* Duration Badge — bottom-right on desktop, bottom-left on mobile so preview btn doesn't overlap */}
        {!shouldPlayPreview && (
          <div
            className={`absolute bottom-2 bg-black/90 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white z-20 shadow-md ${
              isMobile ? 'left-2' : 'right-2'
            }`}
          >
            {video.duration || '05:00'}
          </div>
        )}

        {/* Mobile Touch Eye Preview Button */}
        {isMobile && (
          <button
            type="button"
            onClick={toggleMobilePreview}
            className={`absolute bottom-2 right-2 z-30 p-1.5 rounded-xl backdrop-blur-md transition-all duration-300 ease-out shadow-xl flex items-center justify-center cursor-pointer active:scale-90 ${
              shouldPlayPreview
                ? 'opacity-0 pointer-events-none scale-90'
                : 'opacity-100 scale-100 bg-black/75 hover:bg-black/90 text-white border border-white/25'
            }`}
            title="Toggle Video Preview"
          >
            <span className="material-symbols-outlined text-base">
              visibility
            </span>
          </button>
        )}
      </div>

      {/* ─── Card Info Below Thumbnail ─── */}
      <div className="pt-2 px-0.5 space-y-1.5">
        {/* Title */}
        <h3 className="font-bold text-sm md:text-[15px] text-white group-hover:text-rose-300 transition-colors line-clamp-2 leading-snug tracking-tight">
          {video.title}
        </h3>

        {/* Stats Row: Views • Rating • Time — reference image style */}
        <div className="flex items-center gap-3 text-[11px] text-white/55 font-medium">
          {/* Views */}
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-white/40">visibility</span>
            <span className="text-white/70 font-semibold">
              {(() => {
                const n = video.viewsCount;
                if (typeof n === 'number') {
                  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
                  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
                  return `${n}`;
                }
                return (video.views || '1').replace(/[^0-9KMk.]/g, '') || '1';
              })()}
            </span>
          </span>

          {/* Rating / Likes % */}
          {video.rating && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-white/40">thumb_up</span>
              <span className="text-white/70 font-semibold">{video.rating}</span>
            </span>
          )}

          {/* Time Ago */}
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-white/40">calendar_month</span>
            <span className="text-white/55">
              {formatTimeAgo(video.createdAt, video.timeAgo)}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
};
