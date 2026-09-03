import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import { Video } from "../types";
import { useIsMobile } from "../hooks/useIsMobile";
import { cleanMediaUrl } from "../utils/mediaHelper";
import { videoService } from "../services/videoService";

interface VideoCardProps {
  video: Video;
  onClick: () => void;
  layout?: "grid" | "horizontal";
}

const formatViews = (count?: number, fallbackStr?: string): string => {
  let num = count;
  if (num === undefined && fallbackStr) {
    const parsed = parseInt(fallbackStr.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed)) num = parsed;
  }
  if (typeof num === "number" && !isNaN(num) && num >= 0) {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K views`;
    return `${num} ${num === 1 ? "view" : "views"}`;
  }
  return fallbackStr || "1 view";
};

const formatCardViews = (video: Video): string => {
  const n = video.viewsCount;
  if (typeof n === "number" && !isNaN(n) && n > 0) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${n}`;
  }
  if (video.views) {
    const cleaned = video.views.replace(/\s*views?/i, "").trim();
    if (cleaned) return cleaned;
  }
  return "1.2K";
};

const formatCardRating = (video: Video): string => {
  if (video.rating && typeof video.rating === "string" && video.rating.trim() !== "" && video.rating !== "0%") {
    return video.rating.includes("%") ? video.rating : `${video.rating}%`;
  }
  const likes = typeof video.likesCount === "number" ? video.likesCount : 0;
  if (likes > 0) {
    const views = typeof video.viewsCount === "number" && video.viewsCount > 0 ? video.viewsCount : 500;
    const ratio = Math.min(1, likes / (views * 0.05));
    const score = Math.min(99, Math.max(70, Math.round(75 + ratio * 24)));
    return `${score}%`;
  }
  return "92%";
};

const formatTimeAgo = (createdAt?: string, fallbackStr?: string): string => {
  let dateObj: Date | null = null;
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }
  if (!dateObj && fallbackStr && fallbackStr !== "Just now") {
    return fallbackStr;
  }
  if (!dateObj) {
    return "Trending";
  }

  const diffMs = Math.max(0, Date.now() - dateObj.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return "Just now";
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

const FALLBACK_THUMBNAIL = "/images/categories/trending.jpg";

// Extract exactly 10 percentage milestone frames (0%, 10%, 20%, ... 90%/100%)
const extract10PercentageFrames = (rawFrames: string[]): string[] => {
  if (!Array.isArray(rawFrames) || rawFrames.length === 0) return [];
  if (rawFrames.length <= 10) return rawFrames;

  const result: string[] = [];
  const TOTAL_STEPS = 10;
  for (let i = 0; i < TOTAL_STEPS; i++) {
    const pct = i / (TOTAL_STEPS - 1);
    const targetIdx = Math.round(pct * (rawFrames.length - 1));
    result.push(rawFrames[targetIdx]);
  }
  return result;
};

const extractPreviewDetails = (video: Video) => {
  // Full 16-Frame Pornhub Storyboard Timeline
  if (Array.isArray(video.previewFrames) && video.previewFrames.length > 0) {
    return { previewSrc: video.previewFrames[0], previewType: "frames" as const, frames: video.previewFrames };
  }

  const mp4Src = cleanMediaUrl(video.previewMp4Url || (video as any).mp4Url || "");
  if (mp4Src) {
    const urlPath = mp4Src.split("?")[0].split("#")[0].toLowerCase();
    const isVideo = /\.(mp4|webm|m3u8|mov|ogg)$/i.test(urlPath);
    if (isVideo) return { previewSrc: mp4Src, previewType: "video" as const, frames: [] };
  }

  const webpSrc = cleanMediaUrl(video.previewWebpUrl || "");
  if (webpSrc) {
    const urlPath = webpSrc.split("?")[0].split("#")[0].toLowerCase();
    const isVideo = /\.(mp4|webm|m3u8|mov|ogg)$/i.test(urlPath);
    if (isVideo) return { previewSrc: webpSrc, previewType: "video" as const, frames: [] };
    return { previewSrc: webpSrc, previewType: "webp" as const, frames: [] };
  }

  // Auto-construct 16-frame storyboard if thumbnail matches phncdn CDN pattern
  const thumb = cleanMediaUrl(video.thumbnail || video.thumbnailUrl || "");
  const fallbackFrames: string[] = [];
  if (thumb && thumb.includes("phncdn.com") && /\d+\.jpg/i.test(thumb)) {
    for (let i = 1; i <= 16; i++) {
      fallbackFrames.push(thumb.replace(/\d+\.jpg/i, `${i}.jpg`));
    }
  }

  if (fallbackFrames.length > 0) {
    return { previewSrc: fallbackFrames[0], previewType: "frames" as const, frames: fallbackFrames };
  }

  // Check cached frames in session
  try {
    const cached = sessionStorage.getItem(`pv_frames_${video.id}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { previewSrc: parsed[0], previewType: "frames" as const, frames: parsed };
      }
    }
  } catch {}

  return { previewSrc: thumb, previewType: "frames" as const, frames: thumb ? [thumb] : [] };
};

// Global memory cache of already preloaded image URLs across session
const PRELOADED_URLS = new Set<string>();

const VideoCardComponent: React.FC<VideoCardProps> = ({ video, onClick, layout = "grid" }) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [realDuration, setRealDuration] = useState<string | null>(null);

  const handleMetadataLoaded = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const sec = e.currentTarget.duration;
    if (typeof sec === "number" && !isNaN(sec) && sec > 0) {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      const formatted = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      setRealDuration(formatted);
    }
  }, []);

  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastToggleTimeRef = useRef<number>(0);

  const { previewSrc, previewType, frames } = useMemo(() => extractPreviewDetails(video), [video]);
  const isPlayingPreview = isMobile ? isPreviewActive : (isHovered || isPreviewActive);

  const primaryThumb = cleanMediaUrl(video.thumbnail || video.thumbnailUrl || "");
  const isMp4Thumb = useMemo(() => {
    const raw = (primaryThumb || video.previewMp4Url || "").toLowerCase();
    return raw.includes(".mp4") || raw.includes(".webm") || raw.includes(".mov");
  }, [primaryThumb, video.previewMp4Url]);
  const isSpecialPromo = useMemo(() => {
    return Boolean(
      video.id?.startsWith("bz-") ||
      video.adLinkUrl ||
      video.isSponsored ||
      video.sourceWebsiteUrl?.toLowerCase().includes("brazzers") ||
      video.sourceWebsite?.toLowerCase().includes("brazzers") ||
      video.channelName?.toLowerCase() === "brazzers" ||
      video.title?.toLowerCase().includes("brazzers") ||
      video.tags?.some((t) => t?.toLowerCase().includes("brazzers"))
    );
  }, [video]);
  const displayThumbnail = primaryThumb || FALLBACK_THUMBNAIL;

  // Active frame image URL
  const currentFrameUrl = useMemo(() => {
    if (frames.length > 0) {
      return frames[currentFrameIndex % frames.length] || displayThumbnail;
    }
    return displayThumbnail;
  }, [frames, currentFrameIndex, displayThumbnail]);

  // On-demand frame loader: ONLY loads when user explicitly hovers or clicks eye on this specific card
  const preloadCardFrames = useCallback(() => {
    if (frames.length === 0) return;
    frames.forEach((fUrl) => {
      if (!PRELOADED_URLS.has(fUrl)) {
        PRELOADED_URLS.add(fUrl);
        const img = new Image();
        img.decoding = "async";
        img.src = fUrl;
      }
    });
  }, [frames]);

  // Frame cycling engine: runs continuously and smoothly while preview is active without getting stuck
  useEffect(() => {
    if (isPlayingPreview && previewType === "frames" && frames.length > 1) {
      const totalFrames = frames.length;
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      frameIntervalRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % totalFrames);
      }, 850); // Natural 850ms per storyboard frame (Pornhub standard)
    } else {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      setCurrentFrameIndex(0);
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [isPlayingPreview, previewType, frames]);

  // Global listener: Ensures ONLY ONE video previews across the whole page at any given moment
  useEffect(() => {
    const handleActiveChange = (e: CustomEvent<string | null>) => {
      if (e.detail !== video.id) {
        setIsPreviewActive(false);
        setIsHovered(false);
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }
    };

    window.addEventListener("active-global-video-preview" as any, handleActiveChange as any, { passive: true });
    window.addEventListener("active-desktop-hover-change" as any, handleActiveChange as any, { passive: true });
    window.addEventListener("active-mobile-preview-change" as any, handleActiveChange as any, { passive: true });

    return () => {
      window.removeEventListener("active-global-video-preview" as any, handleActiveChange as any);
      window.removeEventListener("active-desktop-hover-change" as any, handleActiveChange as any);
      window.removeEventListener("active-mobile-preview-change" as any, handleActiveChange as any);
    };
  }, [video.id]);

  const handleMouseEnter = () => {
    if (isMobile) return;
    preloadCardFrames();
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(true);
      window.dispatchEvent(
        new CustomEvent("active-global-video-preview", {
          detail: video.id,
        })
      );
    }, 100);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
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

  const handleMouseMove = () => {
    if (isMobile) return;
    if (!isHovered) {
      setIsHovered(true);
      window.dispatchEvent(
        new CustomEvent("active-global-video-preview", {
          detail: video.id,
        })
      );
    }
  };

  const handleCardClick = () => {
    if (Date.now() - lastToggleTimeRef.current < 450) {
      return;
    }
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHovered(false);
    setIsPreviewActive(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    onClick();
  };

  const togglePreview = (e?: React.MouseEvent | React.TouchEvent | React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
      if ((e as any).nativeEvent?.stopImmediatePropagation) {
        (e as any).nativeEvent.stopImmediatePropagation();
      }
    }
    lastToggleTimeRef.current = Date.now();
    const next = !isPreviewActive;
    if (next) {
      preloadCardFrames();
      setIsPreviewActive(true);
      window.dispatchEvent(
        new CustomEvent("active-global-video-preview", {
          detail: video.id,
        })
      );
    } else {
      setIsPreviewActive(false);
      setIsHovered(false);
      window.dispatchEvent(
        new CustomEvent("active-global-video-preview", {
          detail: null,
        })
      );
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== FALLBACK_THUMBNAIL) {
      target.src = FALLBACK_THUMBNAIL;
    }
  };

  const renderPreviewContent = () => {
    if (!isPlayingPreview) return null;

    if (previewType === "video" && previewSrc) {
      return (
        <video
          ref={videoRef}
          src={previewSrc}
          muted
          loop
          playsInline
          autoPlay
          controls={false}
          onLoadedMetadata={handleMetadataLoaded}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 scale-105 z-10 bg-black"
        />
      );
    }

    if (previewType === "webp" && previewSrc) {
      return (
        <img
          src={previewSrc}
          alt={video.title}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer-when-downgrade"
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none transition-opacity duration-300 z-10"
        />
      );
    }

  // Dynamic Multi-frame Flipbook (Seamless Zero-Glitch Render)
  if (currentFrameUrl) {
    return (
      <img
        src={currentFrameUrl}
        alt={video.title}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer-when-downgrade"
        onError={handleImageError}
        className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none transition-opacity duration-150 z-10"
      />
    );
  }

    return null;
  };

  if (layout === "horizontal") {
    return (
      <article
        ref={cardRef}
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        className="group relative bg-[#131315] rounded-2xl overflow-hidden border border-[#353437] hover:border-[#ffb0cd]/50 transition-colors cursor-pointer flex flex-col md:flex-row"
        style={{ contentVisibility: "auto", containIntrinsicSize: "300px" }}
      >
        <div className="relative w-full md:w-2/5 aspect-video md:aspect-auto overflow-hidden bg-black">
          {isMp4Thumb ? (
            <video
              src={`${primaryThumb || video.previewMp4Url}#t=0.001`}
              preload="metadata"
              muted
              playsInline
              onLoadedMetadata={handleMetadataLoaded}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          ) : (
            <img
              src={displayThumbnail}
              alt={video.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer-when-downgrade"
              onError={handleImageError}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            />
          )}

          {renderPreviewContent()}

          {/* Butter-Smooth Continuous Progress Bar */}
          {isPlayingPreview && frames.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/70 z-20 pointer-events-none overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#e0358d] via-[#ec4899] to-[#ff70a6] shadow-[0_0_8px_#ec4899] card-smooth-progress"
                style={{ animationDuration: `${frames.length * 850}ms` }}
              />
            </div>
          )}

          {!isPlayingPreview && !isSpecialPromo && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white font-mono text-xs px-2 py-0.5 rounded z-20">
              {video.duration || "05:00"}
            </div>
          )}

          {/* Eye Preview Trigger Button: FADES OUT / HIDES during preview */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePreview(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePreview(e);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className={`thumb-eye-btn absolute bottom-2 left-2 z-30 p-1.5 rounded-xl backdrop-blur-md transition-all duration-300 ease-out shadow-2xl flex items-center justify-center cursor-pointer ${
              isPlayingPreview
                ? "opacity-0 pointer-events-none scale-75"
                : "opacity-90 hover:opacity-100 bg-[#141418]/90 text-zinc-200 hover:text-white border border-white/25 hover:scale-105 active:scale-90"
            }`}
            title="Play Video Preview"
          >
            <span className="material-symbols-outlined text-base">visibility</span>
          </button>
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-base md:text-lg mb-2 line-clamp-2 group-hover:text-rose-400 transition-colors">
              {video.title}
            </h4>
            <p className="text-zinc-400 text-xs line-clamp-2 mb-3 leading-relaxed">
              {video.description || `Watch ${video.title} in HD on FapnXX.`}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium pt-2 border-t border-white/5">
            <span>{formatViews(video.viewsCount, video.views)}</span>
            <span>{formatTimeAgo(video.createdAt, video.timeAgo)}</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      ref={cardRef}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className="group cursor-pointer flex flex-col w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300"
      style={{ contentVisibility: "auto", containIntrinsicSize: "240px" }}
    >
      {/* 16:9 Full-Width Clean Thumbnail Container */}
      <div className="video-card-container relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-zinc-200/80 dark:border-white/10 hover:border-rose-500/80 transition-colors duration-200 bg-[#09090b]">
        {/* Default Static Thumbnail (Always acts as stable base layer) */}
        {isMp4Thumb ? (
          <video
            src={`${primaryThumb || video.previewMp4Url}#t=0.001`}
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={handleMetadataLoaded}
            className="static-thumb w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          />
        ) : (
          <img
            src={displayThumbnail}
            alt={video.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer-when-downgrade"
            onError={handleImageError}
            className="static-thumb w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
          />
        )}

        {/* Clean Live Hover / Frame Flipbook Preview */}
        {renderPreviewContent()}

        {/* Butter-Smooth Continuous Progress Bar: Never Freezes */}
        {isPlayingPreview && frames.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/70 z-20 pointer-events-none overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#e0358d] via-[#ec4899] to-[#ff70a6] shadow-[0_0_8px_#ec4899] card-smooth-progress"
              style={{ animationDuration: `${frames.length * 850}ms` }}
            />
          </div>
        )}

        {/* Top-Right: Quality Badge (Hidden during preview for 100% clean video view) */}
        {!isPlayingPreview && (
          <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1 pointer-events-none transition-opacity duration-300">
            <span className="thumb-hd-badge bg-black/85 text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-sm tracking-wide border-0">
              {video.quality || "HD"}
            </span>
          </div>
        )}

        {/* Duration Badge (Clean Borderless Pill Matching YouTube/Pornhub; Hidden for promo cards) */}
        {!isPlayingPreview && !isSpecialPromo && (
          <div
            className={`thumb-duration-badge absolute bottom-2 bg-black/85 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white z-20 shadow-sm border-0 transition-opacity duration-300 ${
              isMobile ? "left-2" : "right-2"
            }`}
          >
            {realDuration || video.duration || "05:00"}
          </div>
        )}

        {/* Eye Preview Trigger Button: FADES OUT / HIDES during preview */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePreview(e);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePreview(e);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          className={`thumb-eye-btn absolute bottom-2 right-2 z-30 p-1.5 sm:p-2 rounded-xl backdrop-blur-md transition-all duration-300 ease-out shadow-2xl flex items-center justify-center cursor-pointer ${
            isPlayingPreview
              ? "opacity-0 pointer-events-none scale-75"
              : "opacity-90 hover:opacity-100 bg-[#141418]/90 text-zinc-200 hover:text-white border border-white/25 hover:scale-105 active:scale-90"
          }`}
          title="Play Video Preview"
        >
          <span className="material-symbols-outlined text-base sm:text-lg">
            visibility
          </span>
        </button>
      </div>

      {/* Card Info Below Thumbnail */}
      <div className="video-card-meta-box pt-2 px-0.5 space-y-1">
        <h3 className="video-card-meta-title font-bold text-sm md:text-[15px] text-zinc-900 dark:text-white transition-colors line-clamp-2 leading-snug tracking-tight">
          {video.title}
        </h3>

        {/* Stats Row: Views, Rating, Duration */}
        <div className="video-card-stats-row flex items-center gap-3 sm:gap-3.5 text-[11px] sm:text-xs font-semibold text-[#334155] dark:text-zinc-300">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] sm:text-sm text-[#64748b] dark:text-zinc-400">visibility</span>
            <span className="video-card-stat-value text-[#0f172a] dark:text-zinc-100 font-bold">
              {formatCardViews(video)}
            </span>
          </span>

          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] sm:text-sm text-[#64748b] dark:text-zinc-400">thumb_up</span>
            <span className="video-card-stat-value text-[#0f172a] dark:text-zinc-100 font-bold">
              {formatCardRating(video)}
            </span>
          </span>

          {!isSpecialPromo && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] sm:text-sm text-[#64748b] dark:text-zinc-400">schedule</span>
              <span className="video-card-stat-value text-[#0f172a] dark:text-zinc-100 font-bold">
                {video.duration || "05:00"}
              </span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export const VideoCard = memo(VideoCardComponent);
export default VideoCard;
