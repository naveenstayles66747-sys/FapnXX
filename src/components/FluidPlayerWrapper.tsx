import React, { useState, useEffect, useRef, useCallback } from "react";
import { Video } from "../types";
import { videoService } from "../services/videoService";
import { AD_CONFIG } from "../config/adConfig";
import { stopAllBackgroundMedia } from "../utils/mediaHelper";
import { fetchVastAd, fireTrackingPixel, VastAd } from "../utils/vastEngine";

interface FluidPlayerWrapperProps {
  video: Video;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
}

export const FluidPlayerWrapper: React.FC<FluidPlayerWrapperProps> = ({
  video,
  autoPlay = true,
  onEnded,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);

  const [playerMode, setPlayerMode] = useState<"embed" | "video">("embed");
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>("");
  const [videoMountKey, setVideoMountKey] = useState<number>(0);

  // VAST In-Stream State
  const [isPrerollActive, setIsPrerollActive] = useState<boolean>(false);
  const [isAdLoading, setIsAdLoading] = useState<boolean>(false);
  const [directVastAd, setDirectVastAd] = useState<VastAd | null>(null);
  const [isAdMuted, setIsAdMuted] = useState<boolean>(true);
  const [adCurrentTime, setAdCurrentTime] = useState<number>(0);
  const [adDuration, setAdDuration] = useState<number>(15);

  // VIP Partner Badge Auto-Collapse Animation State
  const [isVipBadgeExpanded, setIsVipBadgeExpanded] = useState<boolean>(true);

  useEffect(() => {
    if (!isPrerollActive && (video.sourceWebsiteUrl || video.adLinkUrl)) {
      setIsVipBadgeExpanded(true);
      const timer = setTimeout(() => {
        setIsVipBadgeExpanded(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isPrerollActive, video?.id, video.sourceWebsiteUrl, video.adLinkUrl]);

  const directPlayerId = `fluid_direct_${(video?.id || "vid").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const VAST_TAG_URL = AD_CONFIG.VAST_TAG_URL || "https://s.magsrv.com/v1/vast.php?idz=6003184";

  // -- Helper: Clean & Normalize Embed URL directly to unblocked fast mirror ---
  const extractEmbedUrl = (rawInput?: string): { cleanUrl: string; isDirectVideo: boolean } => {
    let src = (rawInput || "").trim();
    if (src.startsWith("<iframe") || src.includes("src=")) {
      const match = src.match(/src=["']([^"']+)["']/i);
      if (match && match[1]) src = match[1];
    }
    src = src.replace(/^["']|["']$/g, "").trim();
    if (src.startsWith("//")) src = "https:" + src;

    // Direct normalizations for major adult video providers
    if (src.includes("pornhub.com/view_video.php?viewkey=") || src.includes("pornhub.org/view_video.php?viewkey=")) {
      const vKey = src.split("viewkey=")[1]?.split("&")[0];
      if (vKey) src = `https://www.pornhub.org/embed/${vKey}`;
    } else if (src.includes("pornhub.com/embed/")) {
      src = src.replace("pornhub.com/embed/", "pornhub.org/embed/");
    } else if (src.includes("xvideos.com/video") && !src.includes("embedframe")) {
      const vMatch = src.match(/xvideos\.com\/video(\d+)/i);
      if (vMatch && vMatch[1]) src = `https://www.xvideos.com/embedframe/${vMatch[1]}`;
    } else if (src.includes("streamtape.com/v/") || src.includes("streamta.pe/v/")) {
      src = src.replace("/v/", "/e/");
    } else if (src.includes("spankbang.com") && src.includes("/video/") && !src.includes("/embed/")) {
      src = src.replace("/video/", "/embed/");
    }

    const isKnownEmbed =
      /streamtape|streamta\.pe|dood|filemoon|spankbang|xvideos|pornhub|redtube|youporn|eporner|tube8|chaturbate|bembed|embedseek|streamhide|upstream|mixdrop|\/e\/|\/embed\//i.test(
        src
      );

    const hasVideoExtension = Boolean(src.match(/\.(mp4|webm|m3u8|mov|ogg)(\?.*)?$/i));
    const isStorageBlob =
      src.startsWith("blob:") ||
      (src.includes("firebasestorage.googleapis.com") && !src.includes("placeholder"));

    const isDirectVideo = !isKnownEmbed && (hasVideoExtension || isStorageBlob);

    return { cleanUrl: src, isDirectVideo };
  };

  // -- Global Unmount / Navigation Media Killer -----------------------------
  useEffect(() => {
    return () => {
      stopAllBackgroundMedia();
    };
  }, []);

  // -- Helper: Kill ad videos ----------------------------------------------
  const cleanupInstance = useCallback(() => {
    try {
      if (adVideoRef.current) {
        adVideoRef.current.pause();
        adVideoRef.current.muted = true;
        adVideoRef.current.src = "";
      }
      document
        .querySelectorAll(".fluid_ad_video, .fluid_video_wrapper video")
        .forEach((el: any) => {
          try {
            el.pause();
            el.muted = true;
            el.src = "";
          } catch {}
        });
    } catch {}
  }, []);

  // -- Transition Helper: Reveal Main Video Stream cleanly ----------------
  const startMainContent = useCallback(() => {
    cleanupInstance();
    setIsAdLoading(false);
    setIsPrerollActive(false);
    setDirectVastAd(null);
  }, [cleanupInstance]);

  // -- Effect: Resolve video stream source and fetch VAST Ad ---------------
  useEffect(() => {
    setVideoMountKey((k) => k + 1);
    setIsPrerollActive(false);
    setIsAdLoading(false);
    setDirectVastAd(null);
    setAdCurrentTime(0);
    setAdDuration(15);

    const rawEmbed = (
      video?.embedUrl ||
      (video as any)?.embedCode ||
      (video as any)?.videoUrl ||
      ""
    ).trim();
    const rawMp4 = (
      video?.previewMp4Url ||
      (video as any)?.mp4Url ||
      ""
    ).trim();

    if (rawEmbed) {
      const { cleanUrl: c, isDirectVideo: d } = extractEmbedUrl(rawEmbed);
      setPlayerMode(d ? "video" : "embed");
      setCurrentVideoSrc(c);
    } else if (rawMp4) {
      const { cleanUrl: c, isDirectVideo: d } = extractEmbedUrl(rawMp4);
      setPlayerMode(d ? "video" : "embed");
      setCurrentVideoSrc(c);
    } else {
      setPlayerMode("embed");
      setCurrentVideoSrc("");
    }

    // Dynamic VAST In-Stream Pre-roll Engine
    let isMounted = true;
    const dynamicVastTag = `${VAST_TAG_URL}${VAST_TAG_URL.includes("?") ? "&" : "?"}cb=${Date.now()}_${Math.random().toString(36).substring(2, 8)}&v=${encodeURIComponent(video?.id || "vid")}`;

    fetchVastAd(dynamicVastTag, 3000)
      .then((parsedAd) => {
        if (!isMounted) return;
        if (parsedAd && parsedAd.mediaUrl) {
          setDirectVastAd(parsedAd);
          setIsPrerollActive(true);
          if (parsedAd.durationSeconds && parsedAd.durationSeconds > 0) {
            setAdDuration(parsedAd.durationSeconds);
          }
          fireTrackingPixel(parsedAd.impressionUrls);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      cleanupInstance();
    };
  }, [video?.id, video?.embedUrl, video?.previewMp4Url, cleanupInstance, VAST_TAG_URL]);

  // Autoplay handler for VAST Ad Video
  useEffect(() => {
    if (isPrerollActive && directVastAd && adVideoRef.current) {
      adVideoRef.current.muted = isAdMuted;
      const playPromise = adVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (adVideoRef.current) {
            adVideoRef.current.muted = true;
            setIsAdMuted(true);
            adVideoRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [isPrerollActive, directVastAd, isAdMuted]);

  // Handle direct VAST ad time updates
  const handleDirectAdTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (isAdLoading && v.currentTime > 0.1) {
      setIsAdLoading(false);
    }
    setAdCurrentTime(v.currentTime);
    if (v.duration && !isNaN(v.duration) && v.duration > 0) {
      setAdDuration(v.duration);
    }
  };

  const handleAdClickThrough = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (directVastAd) {
      fireTrackingPixel(directVastAd.clickTrackingUrls);
      const targetUrl =
        directVastAd.clickThroughUrl ||
        "https://go.marzaent.com/smartpop/165aea9bcdd7aabac45f72d02f58fd24b8416bc57cfc540b1b4409ac823564af";
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleSkipAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (directVastAd) {
      fireTrackingPixel(directVastAd.trackingEvents?.skip);
    }
    startMainContent();
  };

  const toggleAdMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adVideoRef.current) {
      const nextMuted = !adVideoRef.current.muted;
      adVideoRef.current.muted = nextMuted;
      setIsAdMuted(nextMuted);
      if (directVastAd) {
        fireTrackingPixel(
          nextMuted
            ? directVastAd.trackingEvents?.mute
            : directVastAd.trackingEvents?.unmute
        );
      }
    }
  };

  const skipOffsetSec = Math.max(10, directVastAd?.skipOffsetSeconds || 10);
  const canSkip = adCurrentTime >= skipOffsetSec;
  const secondsToSkip = Math.max(0, Math.ceil(skipOffsetSec - adCurrentTime));

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* ----------------------------------------------------------------------
          STAGE 1: VAST IN-STREAM AD PREROLL
      ---------------------------------------------------------------------- */}
      {isPrerollActive && directVastAd && (
        <div className="absolute inset-0 z-30 w-full h-full bg-black flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={adVideoRef}
              src={directVastAd.mediaUrl}
              autoPlay
              playsInline
              preload="auto"
              muted={isAdMuted}
              onLoadedMetadata={(e) => {
                setIsAdLoading(false);
                const v = e.currentTarget;
                if (v.duration && !isNaN(v.duration) && v.duration > 0) {
                  setAdDuration(v.duration);
                }
              }}
              onCanPlay={() => {
                setIsAdLoading(false);
                if (adVideoRef.current && adVideoRef.current.paused) {
                  adVideoRef.current.play().catch(() => {});
                }
              }}
              onTimeUpdate={handleDirectAdTimeUpdate}
              onPlaying={() => setIsAdLoading(false)}
              onEnded={() => {
                if (directVastAd) {
                  fireTrackingPixel(directVastAd.trackingEvents?.complete);
                }
                startMainContent();
              }}
              className="w-full h-full object-contain block bg-black cursor-pointer"
              onClick={handleAdClickThrough}
            />

            {/* Sound Toggle (Bottom-Left) */}
            <div className="absolute bottom-3 left-3 z-40">
              <button
                type="button"
                onClick={toggleAdMute}
                className="p-2 bg-black/75 hover:bg-black/95 text-white rounded-full border border-white/20 shadow-lg transition-all cursor-pointer backdrop-blur-md flex items-center justify-center active:scale-95"
                title={isAdMuted ? "Unmute" : "Mute"}
              >
                <span className="material-symbols-outlined text-sm sm:text-base">
                  {isAdMuted ? "volume_off" : "volume_up"}
                </span>
              </button>
            </div>

            {/* Skip Ad Button (Bottom-Right) */}
            <div className="absolute bottom-3 right-3 z-40">
              {canSkip ? (
                <button
                  type="button"
                  onClick={handleSkipAd}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 bg-[#ec4899] hover:bg-[#db2777] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 shadow-2xl transition-all cursor-pointer backdrop-blur-md"
                >
                  <span>Skip Ad</span>
                  <span className="material-symbols-outlined text-base">skip_next</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/80 text-zinc-300 font-semibold text-xs rounded-xl border border-white/15 backdrop-blur-md shadow-lg pointer-events-none">
                  <span>Skip in</span>
                  <span className="font-mono text-white font-bold">{secondsToSkip}s</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          STAGE 2: MAIN VIDEO STREAM (100% Clean Iframe / Video Player)
      ---------------------------------------------------------------------- */}
      {playerMode === "embed" ? (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
          {currentVideoSrc ? (
            <iframe
              key={`iframe-${videoMountKey}`}
              src={currentVideoSrc}
              title={video?.title || "Video Stream"}
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              scrolling="no"
              frameBorder={0}
              className="w-full h-full border-none block bg-black"
              style={{ border: "none", width: "100%", height: "100%", display: "block" }}
            />
          ) : (
            <div className="text-zinc-400 text-sm flex flex-col items-center gap-2 p-4 text-center">
              <span className="material-symbols-outlined text-4xl text-rose-500">videocam_off</span>
              <p className="font-semibold text-white">No Stream Source Available</p>
              <p className="text-xs text-zinc-500">Please provide a valid embed URL or video stream link.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
          <video
            key={`direct-${videoMountKey}`}
            id={directPlayerId}
            src={currentVideoSrc}
            controls
            autoPlay={autoPlay}
            playsInline
            poster={video?.thumbnail || (video as any)?.thumbnailUrl || ""}
            onEnded={onEnded}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.duration && !isNaN(v.duration) && v.duration > 0) {
                const totalSec = Math.floor(v.duration);
                const hrs = Math.floor(totalSec / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;
                const formatted =
                  hrs > 0
                    ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
                    : `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
                // Set formatted duration locally
                if (video && !video.duration) {
                  video.duration = formatted;
                }
              }
            }}
            className="w-full h-full object-contain block bg-black"
          />

          {/* Partner / Brazzers VIP Watch Full Video Button inside Player (Auto-collapses to gold badge icon after 1.2s) */}
          {!isPrerollActive && (video.sourceWebsiteUrl || video.adLinkUrl) && (
            <a
              href={video.sourceWebsiteUrl || video.adLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setIsVipBadgeExpanded(true)}
              onMouseLeave={() => setIsVipBadgeExpanded(false)}
              className="absolute top-2.5 right-2.5 z-30 group/vip flex items-center gap-1.5 p-1.5 sm:py-1.5 sm:px-2.5 rounded-xl bg-black/85 hover:bg-black text-amber-400 hover:text-amber-300 font-bold text-[11px] sm:text-xs border border-amber-500/40 backdrop-blur-md shadow-2xl transition-all duration-300 ease-out cursor-pointer hover:scale-105 active:scale-95 select-none"
              title="Watch Full Scene on Brazzers"
            >
              <span className="material-symbols-outlined text-sm sm:text-base text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                workspace_premium
              </span>

              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-500 ease-out text-[11px] font-black tracking-wide ${
                  isVipBadgeExpanded ? 'max-w-[170px] opacity-100 mr-0.5' : 'max-w-0 opacity-0'
                }`}
              >
                Watch on Brazzers
              </span>

              <span className="material-symbols-outlined text-[13px] sm:text-sm text-amber-400/90 group-hover/vip:translate-x-0.5 transition-transform">
                open_in_new
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default FluidPlayerWrapper;
