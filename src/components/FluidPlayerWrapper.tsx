import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { videoService } from '../services/videoService';
import { AD_CONFIG } from '../config/adConfig';
import { stopAllBackgroundMedia } from '../utils/mediaHelper';

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

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [videoMountKey, setVideoMountKey] = useState<number>(0);
  const [isPrerollActive, setIsPrerollActive] = useState<boolean>(true);

  const prerollPlayerId = `fluid_preroll_${video.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const directPlayerId = `fluid_direct_${video.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

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
      // When leaving player / navigating back, kill all audio and video streams immediately
      stopAllBackgroundMedia();
    };
  }, []);

  // ── Effect: Resolve video stream source ─────────────────────────────────
  useEffect(() => {
    setVideoMountKey((k) => k + 1);
    contentStartedRef.current = false;
    setIsPrerollActive(true);

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
      contentStartedRef.current = true;
    }
  }, [video.id, video.embedUrl, video.previewMp4Url]);

  // ── Helper: Kill all playing ad videos & destroy Fluid Player instance ───
  const cleanupInstance = () => {
    try {
      const prerollEl = document.getElementById(prerollPlayerId) as HTMLVideoElement;
      if (prerollEl) {
        prerollEl.pause();
        prerollEl.muted = true;
        prerollEl.src = '';
      }
      document.querySelectorAll('.fluid_ad_video, .fluid_video_wrapper video, .fluid_vpaid_container video').forEach((el: any) => {
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

    // Call internal cleanup to kill ad players
    cleanupInstance();
    // Also use global media helper to ensure audio elements are silenced
    stopAllBackgroundMedia();

    setIsPrerollActive(false);
  };

  // ── Effect: Fluid Player Native VAST In-Stream Engine Initialization ────
  useEffect(() => {
    if (!isPrerollActive || !currentVideoSrc) return;

    let isMounted = true;
    let fallbackTimer: NodeJS.Timeout | null = null;

    let attempts = 0;
    const initNativeFluidVast = () => {
      if (!isMounted || contentStartedRef.current) return;
      cleanupInstance();

      const win = window as any;
      const targetEl = document.getElementById(prerollPlayerId) as HTMLVideoElement;

      if (!targetEl) {
        if (isMounted) setTimeout(initNativeFluidVast, 50);
        return;
      }

      if (typeof win.fluidPlayer === 'function') {
        try {
          const vastTagUrl = AD_CONFIG.VAST_TAG_URL || 'https://s.magsrv.com/v1/vast.php?idz=6003184';

          const instance = win.fluidPlayer(prerollPlayerId, {
            layoutControls: {
              primaryColor: '#ec4899',
              posterImage: '',
              playButtonShowing: true,
              playPauseAnimation: true,
              fillToContainer: true,
              autoPlay: true,
              allowMutedAutoplay: true,
              mute: false,
              controlBar: {
                autoHide: true,
                autoHideTimeout: 2,
                animated: true,
              },
            },
            vastOptions: {
              adList: [
                {
                  roll: 'preRoll',
                  vastTag: vastTagUrl,
                  adClickable: true,
                  vpaidMode: 'insecure',
                },
              ],
              skipButtonCaption: 'Skip in [seconds]s',
              skipButtonClickCaption: 'Skip Ad ✕',
              allowVPAID: true,
              vastAdvanced: {
                vastLoadedCallback: () => {
                  if (fallbackTimer) clearTimeout(fallbackTimer);
                },
                vastVideoStartedCallback: () => {
                  if (fallbackTimer) clearTimeout(fallbackTimer);
                },
                noVastVideoCallback: () => {
                  if (isMounted) startMainContent();
                },
                vastVideoSkippedCallback: () => {
                  if (isMounted) startMainContent();
                },
                vastVideoEndedCallback: () => {
                  if (isMounted) startMainContent();
                },
              },
            },
          });

          playerInstanceRef.current = instance;

          // Backup native end trigger
          if (targetEl) {
            targetEl.onplay = () => {
              if (fallbackTimer) clearTimeout(fallbackTimer);
            };
            targetEl.onended = () => {
              if (isMounted) startMainContent();
            };
          }
        } catch (err) {
          console.warn('[FluidPlayer] VAST engine warning:', err);
          if (isMounted) startMainContent();
        }
      } else {
        attempts += 1;
        if (attempts > 6) {
          if (isMounted) startMainContent();
        } else {
          setTimeout(initNativeFluidVast, 80);
        }
      }
    };

    const timer = setTimeout(initNativeFluidVast, 30);

    // Safeguard timeout (8s) in case network drops or zero fill occurs
    fallbackTimer = setTimeout(() => {
      if (isMounted && !contentStartedRef.current) {
        startMainContent();
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      cleanupInstance();
    };
  }, [isPrerollActive, currentVideoSrc, video.id, videoMountKey, prerollPlayerId]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* ── STAGE 1: Official Native Fluid Player VAST PreRoll (Zero Custom Overlays) ── */}
      {isPrerollActive && (
        <div className="absolute inset-0 z-30 w-full h-full bg-black flex items-center justify-center">
          <video
            key={`preroll-${videoMountKey}`}
            id={prerollPlayerId}
            playsInline
            preload="auto"
            className="w-full h-full object-contain block bg-black"
          >
            {playerMode === 'video' && currentVideoSrc ? (
              <source src={currentVideoSrc} type="video/mp4" />
            ) : (
              <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
            )}
          </video>
        </div>
      )}

      {/* ── STAGE 2: Main Video Player (Streamtape / Embed or Direct Video) ── */}
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
