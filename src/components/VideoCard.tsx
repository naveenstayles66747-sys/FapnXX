import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import { Video } from "../types";
import { useIsMobile } from "../hooks/useIsMobile";
import { cleanMediaUrl } from "../utils/mediaHelper";
import { videoService } from "../services/videoService";
import { getStoredSavedVideos, toggleStoredSavedVideo } from "../utils/storage";

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

  // Lightweight WebM / MP4 preview videos
  const videoPreviewSrc = cleanMediaUrl(video.previewWebmUrl || video.previewMp4Url || (video as any).mp4Url || "");
  if (videoPreviewSrc) {
    const urlPath = videoPreviewSrc.split("?")[0].split("#")[0].toLowerCase();
    const isVideo = /\.(mp4|webm|m3u8|mov|ogg)$/i.test(urlPath);
    if (isVideo) return { previewSrc: videoPreviewSrc, previewType: "video" as const, frames: [] };
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

// Single global coordinator across all video cards to keep INP ultra-fast
let globalPreviewListenerAttached = false;
const activePreviewSubscribers = new Set<(activeId: string | null) => void>();

function subscribeActivePreview(cb: (activeId: string | null) => void): () => void {
  activePreviewSubscribers.add(cb);
  if (!globalPreviewListenerAttached && typeof window !== "undefined") {
    globalPreviewListenerAttached = true;
    window.addEventListener(
      "active-global-video-preview" as any,
      ((e: CustomEvent<string | null>) => {
        const id = e?.detail ?? null;
        activePreviewSubscribers.forEach((fn) => fn(id));
      }) as any,
      { passive: true }
    );
  }
  return () => {
    activePreviewSubscribers.delete(cb);
  };
}

const VideoCardComponent: React.FC<VideoCardProps> = ({ video, onClick, layout = "grid" }) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);
  const [realDuration, setRealDuration] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(() => getStoredSavedVideos().includes(video.id));

  useEffect(() => {
    setIsSaved(getStoredSavedVideos().includes(video.id));
  }, [video.id]);

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
      video.id?.startsWith("dp-") ||
      video.adLinkUrl ||
      video.isSponsored ||
      video.sourceWebsiteUrl?.toLowerCase().includes("brazzers") ||
      video.sourceWebsite?.toLowerCase().includes("brazzers") ||
      video.channelName?.toLowerCase() === "brazzers" ||
      video.title?.toLowerCase().includes("brazzers") ||
      video.tags?.some((t) => t?.toLowerCase().includes("brazzers")) ||
      video.sourceWebsiteUrl?.toLowerCase().includes("digitalplayground") ||
      video.sourceWebsite?.toLowerCase().includes("digital playground") ||
      video.channelName?.toLowerCase() === "digital playground" ||
      video.title?.toLowerCase().includes("digital playground") ||
      video.tags?.some((t) => t?.toLowerCase().includes("digital playground"))
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

  // Frame cycling engine: runs continuously and smoothly while preview is active without getting stuck (when not manual scrubbing)
  useEffect(() => {
    if (isPlayingPreview && previewType === "frames" && frames.length > 1 && scrubProgress === null) {
      const totalFrames = frames.length;
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      frameIntervalRef.current = setInterval(() => {
        setCurrentFrameIndex((prev) => (prev + 1) % totalFrames);
      }, 850); // Natural 850ms per storyboard frame (Pornhub / TheyAreHuge standard)
    } else {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      if (!isPlayingPreview) {
        setCurrentFrameIndex(0);
      }
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [isPlayingPreview, previewType, frames, scrubProgress]);

  // Single global coordinator listener: Ensures ONLY ONE video previews across the whole page at any given moment
  useEffect(() => {
    return subscribeActivePreview((activeId) => {
      if (activeId !== video.id) {
        setIsPreviewActive(false);
        setIsHovered(false);
        setScrubProgress(null);
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }
    });
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
    }, 150); // Standard 150ms hover delay to eliminate accidental trigger & preserve 60fps scrolling
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHovered(false);
    setScrubProgress(null);
    setCurrentFrameIndex(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Ultra-Smooth Mouse-X Timeline Scrubbing (TheyAreHuge / Pornhub standard)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    if (!isHovered) {
      setIsHovered(true);
      preloadCardFrames();
      window.dispatchEvent(
        new CustomEvent("active-global-video-preview", {
          detail: video.id,
        })
      );
    }

    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = rect.width > 0 ? x / rect.width : 0;
      setScrubProgress(pct);

      if (previewType === "frames" && frames.length > 1) {
        const frameIdx = Math.min(frames.length - 1, Math.floor(pct * frames.length));
        setCurrentFrameIndex(frameIdx);
      } else if (previewType === "video" && videoRef.current && videoRef.current.duration) {
        const targetTime = pct * videoRef.current.duration;
        if (Math.abs(videoRef.current.currentTime - targetTime) > 0.3) {
          videoRef.current.currentTime = targetTime;
        }
      }
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
    setScrubProgress(null);
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
      setScrubProgress(null);
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
        className="group relative bg-[#131315] rounded-2xl overflow-hidden border border-[#353437] hover:border-[#ffb0cd]/50 gpu-smooth smooth-card-transition cursor-pointer flex flex-col md:flex-row fade-in-scroll card-hover-scale btn-ripple"
        style={{ contentVisibility: "auto", containIntrinsicSize: "300px" }}
      >
        <div className="relative w-full md:w-2/5 aspect-video md:aspect-auto overflow-hidden bg-black gpu-smooth">
          {isMp4Thumb ? (
            <video
              src={`${primaryThumb || video.previewMp4Url}#t=0.001`}
              preload="metadata"
              muted
              playsInline
              onLoadedMetadata={handleMetadataLoaded}
              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
            />
          ) : (
            <img
              src={displayThumbnail}
              alt={video.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer-when-downgrade"
              onError={handleImageError}
              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
            />
          )}

          {renderPreviewContent()}

          {/* Butter-Smooth Scrubbing / Progress Bar */}
          {isPlayingPreview && frames.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/70 z-20 pointer-events-none overflow-hidden">
              {scrubProgress !== null ? (
                <div
                  className="h-full bg-gradient-to-r from-[#e0358d] via-[#ec4899] to-[#ff70a6] shadow-[0_0_8px_#ec4899] transition-all duration-75 ease-out"
                  style={{ width: `${Math.round(scrubProgress * 100)}%` }}
                />
              ) : (
                <div
                  className="h-full bg-gradient-to-r from-[#e0358d] via-[#ec4899] to-[#ff70a6] shadow-[0_0_8px_#ec4899] card-smooth-progress"
                  style={{ animationDuration: `${frames.length * 850}ms` }}
                />
              )}
            </div>
          )}

          {/* Quick Save / Bookmark Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const updated = toggleStoredSavedVideo(video.id);
              setIsSaved(updated.includes(video.id));
            }}
            className={`thumb-save-btn absolute top-2 left-2 z-30 p-1.5 rounded-xl backdrop-blur-md transition-all duration-200 ease-out shadow-lg flex items-center justify-center cursor-pointer ${
              isSaved
                ? "bg-[#ec4899] text-white border border-[#ec4899] shadow-[0_0_10px_rgba(236,72,153,0.5)] opacity-100"
                : "opacity-0 group-hover:opacity-100 bg-black/70 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 hover:scale-105 active:scale-90"
            }`}
            title={isSaved ? "Saved to Watch Later" : "Save to Watch Later"}
          >
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
            >
              bookmark
            </span>
          </button>

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

  const channelName = useMemo(() => {
    return (
      video.channelName ||
      video.performerName ||
      (Array.isArray(video.performers) && video.performers[0]) ||
      (Array.isArray(video.modelsActors) && video.modelsActors[0]) ||
      video.sourceWebsite ||
      video.categoryLabel ||
      "Verified"
    );
  }, [video]);

  const channelInitial = useMemo(() => {
    return channelName.charAt(0).toUpperCase() || "V";
  }, [channelName]);

  return (
    <article
      ref={cardRef}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className="group cursor-pointer flex flex-col w-full max-w-full rounded-xl sm:rounded-2xl overflow-hidden gpu-smooth smooth-card-transition fade-in-scroll card-hover-scale btn-ripple"
      style={{ contentVisibility: "auto", containIntrinsicSize: "240px" }}
    >
      {/* 16:9 Full-Width Clean Thumbnail Container */}
      <div className="video-card-container relative w-full aspect-[16/9] rounded-lg sm:rounded-xl overflow-hidden border border-zinc-200/80 dark:border-white/10 hover:border-[#ec4899]/80 transition-colors duration-200 bg-[#09090b] gpu-smooth">
        {/* Default Static Thumbnail (Always acts as stable base layer) */}
        {isMp4Thumb ? (
          <video
            src={`${primaryThumb || video.previewMp4Url}#t=0.001`}
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={handleMetadataLoaded}
            className="static-thumb w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          />
        ) : (
          <img
            src={displayThumbnail}
            alt={video.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer-when-downgrade"
            onError={handleImageError}
            className="static-thumb w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
          />
        )}

        {/* Clean Live Hover / Frame Flipbook Preview */}
        {renderPreviewContent()}

        {/* Butter-Smooth Continuous / Scrub Progress Bar */}
        {isPlayingPreview && frames.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/70 z-20 pointer-events-none overflow-hidden">
            {scrubProgress !== null ? (
              <div
                className="h-full bg-gradient-to-r from-[#e0358d] via-[#ec4899] to-[#ff70a6] shadow-[0_0_8px_#ec4899] transition-all duration-75 ease-out"
                style={{ width: `${Math.round(scrubProgress * 100)}%` }}
              />
            ) : (
              <div
                className="h-full bg-gradient-to-r from-[#e0358d] via-[#ec4899] to-[#ff70a6] shadow-[0_0_8px_#ec4899] card-smooth-progress"
                style={{ animationDuration: `${frames.length * 850}ms` }}
              />
            )}
          </div>
        )}

        {/* Top-Left: Quick Save / Bookmark Button with Micro-Pop Animation */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const updated = toggleStoredSavedVideo(video.id);
            setIsSaved(updated.includes(video.id));
          }}
          className={`thumb-save-btn absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-30 p-1 sm:p-1.5 rounded-md sm:rounded-lg backdrop-blur-md transition-all duration-200 ease-out shadow-lg flex items-center justify-center cursor-pointer ${
            isSaved
              ? "bg-[#ec4899] text-white border border-[#ec4899] shadow-[0_0_12px_rgba(236,72,153,0.6)] opacity-100 scale-100"
              : "opacity-0 group-hover:opacity-100 bg-black/70 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 hover:scale-105 active:scale-90"
          }`}
          title={isSaved ? "Saved to Watch Later" : "Save to Watch Later"}
        >
          <span
            className={`material-symbols-outlined text-xs sm:text-sm ${isSaved ? "anim-bookmark-pop" : ""}`}
            style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
          >
            bookmark
          </span>
        </button>

        {/* Top-Right: Quality Badge */}
        {!isPlayingPreview && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20 flex flex-col items-end gap-1 pointer-events-none transition-opacity duration-300">
            <span className="thumb-hd-badge bg-black/85 text-white px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase shadow-sm tracking-wide border-0">
              {video.quality || "HD"}
            </span>
          </div>
        )}

        {/* Duration Badge (Bottom-Right matching xHamster standard) */}
        {!isPlayingPreview && !isSpecialPromo && (
          <div
            className="thumb-duration-badge absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 bg-black/85 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold text-white z-20 shadow-sm border-0 transition-opacity duration-300"
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
          className={`thumb-eye-btn absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 z-30 p-1 sm:p-1.5 rounded-md sm:rounded-lg backdrop-blur-md transition-all duration-300 ease-out shadow-2xl flex items-center justify-center cursor-pointer ${
            isPlayingPreview
              ? "opacity-0 pointer-events-none scale-75"
              : "opacity-90 hover:opacity-100 bg-[#141418]/90 text-zinc-200 hover:text-white border border-white/25 hover:scale-105 active:scale-90"
          }`}
          title="Play Video Preview"
        >
          <span className="material-symbols-outlined text-xs sm:text-sm">
            visibility
          </span>
        </button>
      </div>

      {/* Card Info Below Thumbnail - xHamster Style */}
      <div className="video-card-meta-box pt-1.5 sm:pt-2 px-0.5 space-y-1">
        <h3 className="video-card-meta-title font-semibold text-xs sm:text-[13px] md:text-sm text-zinc-900 dark:text-zinc-100 transition-colors line-clamp-2 leading-tight tracking-tight group-hover:text-[#ec4899]">
          {video.title}
        </h3>

        {/* Channel & Views Row (xHamster exact format) */}
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 font-medium overflow-hidden">
          {/* Mini Channel Avatar Circle */}
          <span className="shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full overflow-hidden bg-gradient-to-br from-[#e0358d] to-[#db2777] text-white flex items-center justify-center text-[8px] sm:text-[9px] font-black uppercase shadow-xs">
            {video.performerAvatar ? (
              <img src={video.performerAvatar} alt={channelName} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
            ) : (
              channelInitial
            )}
          </span>
          <span className="truncate max-w-[75px] sm:max-w-[120px] font-bold text-zinc-700 dark:text-zinc-300">
            {channelName}
          </span>
          <span className="text-zinc-400 dark:text-zinc-600 font-bold shrink-0">|</span>
          <span className="shrink-0 font-semibold text-zinc-500 dark:text-zinc-400">
            {formatCardViews(video)} {formatCardViews(video).toLowerCase().includes("view") ? "" : "views"}
          </span>
        </div>
      </div>
    </article>
  );
};

export const VideoCard = memo(VideoCardComponent);
export default VideoCard;
