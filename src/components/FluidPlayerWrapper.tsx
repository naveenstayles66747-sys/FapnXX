import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { videoService } from '../services/videoService';
import { AD_CONFIG } from '../config/adConfig';
import { stopAllBackgroundMedia } from '../utils/mediaHelper';
import { fetchVastAd, fireTrackingPixel, VastAd } from '../utils/vastEngine';

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
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const contentStartedRef = useRef<boolean>(false);
  const adVideoRef = useRef<HTMLVideoElement>(null);

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [videoMountKey, setVideoMountKey] = useState<number>(0);

  // VAST In-Stream State
  const [isPrerollActive, setIsPrerollActive] = useState<boolean>(true);
  const [isAdLoading, setIsAdLoading] = useState<boolean>(true);
  const [directVastAd, setDirectVastAd] = useState<VastAd | null>(null);
  const [isAdMuted] = useState<boolean>(true);
  const [adCurrentTime, setAdCurrentTime] = useState<number>(0);
  const [adDuration, setAdDuration] = useState<number>(15);

  const prerollPlayerId = `fluid_preroll_${video.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const directPlayerId = `fluid_direct_${video.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const VAST_TAG_URL = AD_CONFIG.VAST_TAG_URL || 'https://s.magsrv.com/v1/vast.php?idz=6003184';

  // ── Helper: Extract clean URL & detect direct MP4 vs Embed ──────────────
  const extractEmbedUrl = (rawInput?: string): { cleanUrl: string; isDirectVideo: boolean } => {
    let src = (rawInput || '').trim();
    if (src.startsWith('<iframe') || src.includes('src=')) {
      const match = src.match(/src=["']([^"']+)["']/i);
      if (match && match[1]) src = match[1];
    }
    src = src.replace(/^["']|["']$/g, '').trim();
    if (src.startsWith('//')) src = 'https:' + src;

    const isKnownEmbed =
      /streamtape|streamta\.pe|dood|filemoon|spankbang|xvideos|pornhub|redtube|youporn|eporner|tube8|chaturbate|bembed|embedseek|streamhide|upstream|mixdrop|\/e\/|\/embed\//i.test(
        src
      );

    const hasVideoExtension = Boolean(src.match(/\.(mp4|webm|m3u8|mov|ogg)(\?.*)?$/i));
    const isStorageBlob =
      src.startsWith('blob:') ||
      (src.includes('firebasestorage.googleapis.com') && !src.includes('placeholder'));

    const isDirectVideo = !isKnownEmbed && (hasVideoExtension || isStorageBlob);

    return { cleanUrl: src, isDirectVideo };
  };

  // ── Global Unmount / Navigation Media Killer ─────────────────────────────
  useEffect(() => {
    return () => {
      stopAllBackgroundMedia();
    };
  }, []);

  // ── Effect: Resolve video stream source ─────────────────────────────────
  useEffect(() => {
    setVideoMountKey((k) => k + 1);
    contentStartedRef.current = false;
    setIsPrerollActive(true);
    setIsAdLoading(true);
    setDirectVastAd(null);
    setAdCurrentTime(0);
    setAdDuration(15);

    const rawEmbed = (
      video.embedUrl ||
      (video as any).embedCode ||
      (video as any).videoUrl ||
      ''
    ).trim();
    const rawMp4 = (
      video.previewMp4Url ||
      (video as any).mp4Url ||
      ''
    ).trim();

    if (rawEmbed) {
      const { cleanUrl: c, isDirectVideo: d } = extractEmbedUrl(rawEmbed);
      setPlayerMode(d ? 'video' : 'embed');
      setCurrentVideoSrc(c);
    } else if (rawMp4) {
      const { cleanUrl: c, isDirectVideo: d } = extractEmbedUrl(rawMp4);
      setPlayerMode(d ? 'video' : 'embed');
      setCurrentVideoSrc(c);
    } else {
      setPlayerMode('embed');
      setCurrentVideoSrc('');
      setIsPrerollActive(false);
      setIsAdLoading(false);
      contentStartedRef.current = true;
    }
  }, [video.id, video.embedUrl, video.previewMp4Url]);

  // ── Helper: Kill all playing ad videos & destroy Fluid Player instance ───
  const cleanupInstance = () => {
    try {
      if (adVideoRef.current) {
        adVideoRef.current.pause();
        adVideoRef.current.muted = true;
        adVideoRef.current.src = '';
      }
      const prerollEl = document.getElementById(prerollPlayerId) as HTMLVideoElement;
      if (prerollEl) {
        prerollEl.pause();
        prerollEl.muted = true;
        prerollEl.src = '';
        prerollEl.load();
      }
      document
        .querySelectorAll(
          '.fluid_ad_video, .fluid_video_wrapper video, .fluid_vpaid_container video'
        )
        .forEach((el: any) => {
          try {
            el.pause();
            el.muted = true;
            el.src = '';
          } catch {}
        });
    } catch {}

    if (playerInstanceRef.current) {
      try {
        if (typeof playerInstanceRef.current.destroy === 'function') {
          playerInstanceRef.current.destroy();
        }
      } catch {}
      playerInstanceRef.current = null;
    }
  };

  // ── Transition Helper: Reveal Main Video Stream cleanly ────────────────
  const startMainContent = () => {
    if (contentStartedRef.current) return;
    contentStartedRef.current = true;

    cleanupInstance();
    stopAllBackgroundMedia();

    setIsAdLoading(false);
    setIsPrerollActive(false);
    setDirectVastAd(null);
  };

  // ── Effect: Direct Native HTML5 VAST In-Stream Engine (Mobile & Desktop) ───────
  useEffect(() => {
    if (!isPrerollActive || !currentVideoSrc) return;

    let isMounted = true;
    let fallbackSafetyTimer: NodeJS.Timeout | null = null;

    const dynamicVastTag = `${VAST_TAG_URL}${VAST_TAG_URL.includes('?') ? '&' : '?'}cb=${Date.now()}_${Math.random().toString(36).substring(2, 8)}&v=${encodeURIComponent(video.id)}`;

    fetchVastAd(dynamicVastTag, 4000)
      .then((parsedAd) => {
        if (!isMounted || contentStartedRef.current) return;
        if (parsedAd && parsedAd.mediaUrl) {
          setDirectVastAd(parsedAd);
          if (parsedAd.durationSeconds && parsedAd.durationSeconds > 0) {
            setAdDuration(parsedAd.durationSeconds);
          }
          setIsAdLoading(false);
          fireTrackingPixel(parsedAd.impressionUrls);
        } else {
          startMainContent();
        }
      })
      .catch(() => {
        if (isMounted && !contentStartedRef.current) {
          startMainContent();
        }
      });

    fallbackSafetyTimer = setTimeout(() => {
      if (isMounted && !contentStartedRef.current) {
        startMainContent();
      }
    }, 45000);

    return () => {
      isMounted = false;
      if (fallbackSafetyTimer) clearTimeout(fallbackSafetyTimer);
      cleanupInstance();
    };
  }, [isPrerollActive, currentVideoSrc, video.id, videoMountKey]);

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
        'https://go.marzaent.com/smartpop/165aea9bcdd7aabac45f72d02f58fd24b8416bc57cfc540b1b4409ac823564af';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Calculate remaining seconds for the single corner badge
  const remainingSec = Math.max(0, Math.ceil(adDuration - adCurrentTime));
  const formattedRemaining = `${Math.floor(remainingSec / 60)}:${(remainingSec % 60).toString().padStart(2, '0')}`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 1: VAST IN-STREAM AD PREROLL WITH SINGLE CORNER TIMER
      ══════════════════════════════════════════════════════════════════════ */}
      {isPrerollActive && (
        <div className="absolute inset-0 z-30 w-full h-full bg-black flex items-center justify-center overflow-hidden">
          
          {directVastAd ? (
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

              {/* ── Single Small Corner Time Badge (Bottom-Left) ── */}
              <div className="absolute bottom-3 left-3 z-40 pointer-events-none">
                <div className="bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/15 text-zinc-100 text-[11px] sm:text-xs font-mono font-bold shadow-lg flex items-center gap-1.5">
                  <span className="bg-[#ec4899] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">AD</span>
                  <span>{formattedRemaining}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 2: MAIN EMBEDDED VIDEO PLAYER (Streamtape / Embed or Direct MP4)
      ══════════════════════════════════════════════════════════════════════ */}
      {playerMode === 'embed' ? (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
          {currentVideoSrc ? (
            <iframe
              key={`iframe-${videoMountKey}`}
              src={currentVideoSrc}
              title={video.title || 'Video Stream'}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; web-share; xr-spatial-tracking"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              scrolling="no"
              frameBorder={0}
              className="w-full h-full border-none block bg-black"
              style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
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
            poster={video.thumbnail || (video as any).thumbnailUrl || ''}
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
                    ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                    : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                if (video.duration !== formatted) {
                  videoService.updateVideo({ ...video, duration: formatted }).catch(() => {});
                }
              }
            }}
            className="w-full h-full object-contain block bg-black"
          />
        </div>
      )}
    </div>
  );
};

export default FluidPlayerWrapper;
