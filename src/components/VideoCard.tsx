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

const smartAutoConvertPreviewUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (url.match(/\.(webp|gif|png|jpe?g)($|\?|#)/i)) {
    url = url.replace(/\.(webp|gif|png|jpe?g)($|\?|#)/i, '.mp4$2');
  }
  return url;
};

const extractPreviewDetails = (video: Video) => {
  let rawInput =
    smartAutoConvertPreviewUrl(video.previewWebpUrl || '') ||
    smartAutoConvertPreviewUrl(video.previewMp4Url || '') ||
    (video.embedUrl || '').trim();

  if (!rawInput) {
    return { previewSrc: '', previewType: 'none' as const };
  }

  let src = rawInput;
  if (src.startsWith('<iframe') || src.includes('src=')) {
    const match = src.match(/src=["']([^"']+)["']/);
    if (match && match[1]) src = match[1];
  }
  src = src.replace(/^["']|["']$/g, '').trim();

  const urlPath = src.split('?')[0].split('#')[0].toLowerCase();
  const decodedPath = decodeURIComponent(urlPath);

  // 1. Image Preview detection (.webp, .gif, .png, .jpg, .jpeg, .avif, .svg)
  const isImage = /\.(webp|gif|png|jpe?g|avif|svg)$/i.test(urlPath) || /\.(webp|gif|png|jpe?g|avif|svg)$/i.test(decodedPath);
  if (isImage) {
    return { previewSrc: src, previewType: 'image' as const };
  }

  // 2. Direct Video File (.mp4, .webm, .m3u8, .mov, .ogg)
  const isDirectVideo = /\.(mp4|webm|m3u8|mov|ogg)$/i.test(urlPath) || /\.(mp4|webm|m3u8|mov|ogg)$/i.test(decodedPath);
  if (isDirectVideo) {
    return { previewSrc: src, previewType: 'video' as const };
  }

  // 3. YouTube URL auto-conversion to embed player
  if (src.includes('youtube.com') || src.includes('youtu.be')) {
    let yId = '';
    if (src.includes('youtu.be/')) yId = src.split('youtu.be/')[1]?.split('?')[0] || '';
    else if (src.includes('watch?v=')) yId = src.split('watch?v=')[1]?.split('&')[0] || '';
    else if (src.includes('embed/')) yId = src.split('embed/')[1]?.split('?')[0] || '';
    if (yId) {
      return {
        previewSrc: `https://www.youtube.com/embed/${yId}?autoplay=1&muted=1&mute=1&controls=0&loop=1&playlist=${yId}`,
        previewType: 'embed' as const,
      };
    }
  }

  // 4. Vimeo URL auto-conversion
  if (src.includes('vimeo.com')) {
    const vId = src.split('vimeo.com/')[1]?.split('?')[0] || '';
    if (vId && !isNaN(Number(vId))) {
      return {
        previewSrc: `https://player.vimeo.com/video/${vId}?autoplay=1&muted=1&autopause=0&background=1`,
        previewType: 'embed' as const,
      };
    }
  }

  // 5. Explicit Embed / iFrame links
  if (src.includes('embed') || src.includes('player') || src.includes('iframe') || src.includes('embedseek')) {
    let embedSrc = src;
    if (!embedSrc.includes('muted=1') && !embedSrc.includes('mute=1')) {
      const connector = embedSrc.includes('?') ? '&' : '?';
      embedSrc = `${embedSrc}${connector}autoplay=1&muted=1&mute=1&controls=0`;
    }
    return { previewSrc: embedSrc, previewType: 'embed' as const };
  }

  // 6. If rawInput is a non-media webpage link, return none
  if (!src.match(/\.(mp4|webm|m3u8|mov|ogg|webp|gif|png|jpe?g)$/i)) {
    return { previewSrc: '', previewType: 'none' as const };
  }

  return { previewSrc: src, previewType: 'video' as const };
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

  const primaryThumb = (video.thumbnail || video.thumbnailUrl || '').trim();
  const isPlaceholderThumb = primaryThumb.includes('lh3.googleusercontent.com');
  const displayThumbnail =
    (primaryThumb && !isPlaceholderThumb
      ? primaryThumb
      : previewType === 'image' && previewSrc
      ? previewSrc
      : primaryThumb) || FALLBACK_THUMBNAIL;

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

    if (previewType === 'embed') {
      return (
        <div className="iframe-wrapper absolute inset-0 w-full h-full bg-black overflow-hidden pointer-events-none z-10">
          <iframe
            src={previewSrc}
            title={video.title}
            allow="autoplay; fullscreen; picture-in-picture"
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full border-none block bg-black scale-105"
            style={{ border: 'none' }}
          />
        </div>
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
          {/* Default Static Thumbnail (Video First Frame / Poster or Image) */}
          {previewType === 'video' && previewSrc ? (
            <video
              src={`${previewSrc}#t=0.1`}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          ) : (
            <img
              src={displayThumbnail}
              alt={video.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (previewType === 'image' && previewSrc && target.src !== previewSrc) {
                  target.src = previewSrc;
                } else if (target.src !== FALLBACK_THUMBNAIL) {
                  target.src = FALLBACK_THUMBNAIL;
                }
              }}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          )}

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

  const webpPreviewUrl = video.previewWebpUrl || (previewType === 'image' ? previewSrc : '');

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
        {/* Default Static Thumbnail (Video First Frame / Poster or Image) */}
        {previewType === 'video' && previewSrc ? (
          <video
            src={`${previewSrc}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            className="static-thumb w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          />
        ) : (
          <img
            src={displayThumbnail}
            alt={video.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (previewType === 'image' && previewSrc && target.src !== previewSrc) {
                target.src = previewSrc;
              } else if (target.src !== FALLBACK_THUMBNAIL) {
                target.src = FALLBACK_THUMBNAIL;
              }
            }}
            className="static-thumb w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          />
        )}

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

        {/* Gradient Overlay for Badges */}
        {!shouldPlayPreview && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none z-10" />
        )}

        {/* Mobile Touch Eye Preview Button (Smooth Fade Out on Preview Start, Fade In on Stop) */}
        {isMobile && (
          <button
            type="button"
            onClick={toggleMobilePreview}
            className={`absolute bottom-2 right-2 z-30 p-1.5 sm:p-2 rounded-xl backdrop-blur-md transition-all duration-300 ease-out shadow-xl flex items-center justify-center cursor-pointer active:scale-90 ${
              shouldPlayPreview
                ? 'opacity-0 pointer-events-none scale-90'
                : 'opacity-100 scale-100 bg-black/75 hover:bg-black/90 text-white border border-white/25'
            }`}
            title="Toggle Video Preview"
          >
            <span className="material-symbols-outlined text-base sm:text-lg">
              visibility
            </span>
          </button>
        )}

        {/* Top-Right Quality Badge */}
        {!shouldPlayPreview && (
          <div className="absolute top-2 right-2 z-20">
            <span className="bg-[#282830]/90 border border-white/10 text-white px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md">
              {video.quality || 'HD'}
            </span>
          </div>
        )}

        {/* Video Duration Badge */}
        {!shouldPlayPreview && (
          <div
            className={`absolute bottom-2 bg-black/90 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white z-20 shadow-md ${
              isMobile ? 'left-2' : 'right-2'
            }`}
          >
            {video.duration || '20:59'}
          </div>
        )}
      </div>

      {/* Video Title & Metadata */}
      <div className="pt-2 px-1 space-y-1">
        <h3 className="font-bold text-sm md:text-base text-white group-hover:text-[#ffb0cd] transition-colors line-clamp-2 leading-snug tracking-tight hover:underline cursor-pointer">
          {video.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[#a19fa6] font-medium pt-0.5 leading-snug">
          {video.performerName && (
            <>
              <span className="text-[#debec8] truncate max-w-[110px] font-semibold">{video.performerName}</span>
              <span>•</span>
            </>
          )}
          <span className="whitespace-nowrap">{formatViews(video.viewsCount, video.views)}</span>
          <span>•</span>
          <span className="whitespace-nowrap">{formatTimeAgo(video.createdAt, video.timeAgo)}</span>
        </div>
      </div>
    </article>
  );
};
