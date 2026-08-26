import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { videoService } from '../services/videoService';
import { AD_CONFIG } from '../config/adConfig';

interface FluidPlayerWrapperProps {
  video: Video;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
}

type VASTState = 'idle' | 'requesting' | 'adPlaying' | 'contentPlaying';

export const FluidPlayerWrapper: React.FC<FluidPlayerWrapperProps> = ({
  video,
  autoPlay = true,
  onEnded,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  // Content start idempotency guard (Prevents duplicate video starts across overlapping callbacks)
  const contentStartedRef = useRef<boolean>(false);

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [videoMountKey, setVideoMountKey] = useState<number>(0);

  // VAST PreRoll State
  const [vastState, setVastState] = useState<VASTState>('idle');
  const [showConnectingLoader, setShowConnectingLoader] = useState<boolean>(true);
  const retryCountRef = useRef<number>(0);

  const prerollPlayerId = `preroll-vast-${video.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const directPlayerId = `fluid-player-${video.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  // ── Helper: Extract clean URL & detect if it is a direct MP4 file or an embed ──────
  const extractEmbedUrl = (rawInput?: string): { cleanUrl: string; isDirectVideo: boolean } => {
    let src = (rawInput || '').trim();
    if (src.startsWith('<iframe') || src.includes('src=')) {
      const match = src.match(/src=["']([^"']+)["']/i);
      if (match && match[1]) src = match[1];
    }
    src = src.replace(/^["']|["']$/g, '').trim();
    if (src.startsWith('//')) src = 'https:' + src;

    // Check if it's a known embed site (Streamtape, Doodstream, Spankbang, XVideos, etc.)
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

  // ── Effect: Resolve Player Source (Embed vs Direct MP4/Stream) ───────────
  useEffect(() => {
    setVideoMountKey((k) => k + 1);
    contentStartedRef.current = false;
    retryCountRef.current = 0;
    setShowConnectingLoader(true);
    setVastState('requesting');

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
      setVastState('requesting');
    } else if (rawMp4) {
      const { cleanUrl: c, isDirectVideo: d } = extractEmbedUrl(rawMp4);
      setPlayerMode(d ? 'video' : 'embed');
      setCurrentVideoSrc(c);
      setVastState('requesting');
    } else {
      setPlayerMode('embed');
      setCurrentVideoSrc('');
      setVastState('contentPlaying');
      setShowConnectingLoader(false);
      contentStartedRef.current = true;
    }
  }, [video.id, video.embedUrl, video.previewMp4Url]);

  // ── Transition Helper: Start Main Video Stream Idempotently ─────────────
  const startMainContent = (reason: string) => {
    if (contentStartedRef.current) return;
    contentStartedRef.current = true;
    setShowConnectingLoader(false);

    if (playerInstanceRef.current) {
      try {
        if (typeof playerInstanceRef.current.destroy === 'function') {
          playerInstanceRef.current.destroy();
        }
      } catch {}
      playerInstanceRef.current = null;
    }

    setVastState('contentPlaying');
  };

  // ── Effect: Initialize Fluid Player VAST 3.0 PreRoll Engine with Zero Visual Blocking ───────
  useEffect(() => {
    if (vastState !== 'requesting' || !currentVideoSrc) return;

    let isMounted = true;
    let safetyFallbackTimer: NodeJS.Timeout | null = null;
    let loaderDismissTimer: NodeJS.Timeout | null = null;

    const cleanupPreroll = () => {
      if (playerInstanceRef.current) {
        try {
          if (typeof playerInstanceRef.current.destroy === 'function') {
            playerInstanceRef.current.destroy();
          }
        } catch {}
        playerInstanceRef.current = null;
      }
    };

    // Auto-dismiss the visual loader overlay in 1000ms max so it NEVER covers a playing ad
    loaderDismissTimer = setTimeout(() => {
      if (isMounted) {
        setShowConnectingLoader(false);
      }
    }, 1000);

    let fluidLoadAttempts = 0;
    const attachPrerollVast = () => {
      if (!isMounted || contentStartedRef.current) return;
      cleanupPreroll();

      const win = window as any;
      const targetEl = document.getElementById(prerollPlayerId) as HTMLVideoElement;

      if (!targetEl) {
        if (isMounted) setTimeout(attachPrerollVast, 60);
        return;
      }

      // Attach native playback listeners to immediately dismiss loader when ad video starts
      const handleAdStarted = () => {
        if (isMounted) {
          setShowConnectingLoader(false);
          setVastState('adPlaying');
        }
      };

      targetEl.addEventListener('play', handleAdStarted);
      targetEl.addEventListener('playing', handleAdStarted);
      targetEl.addEventListener('timeupdate', handleAdStarted);
      targetEl.addEventListener('loadeddata', handleAdStarted);

      if (typeof win.fluidPlayer === 'function') {
        try {
          const currentVastTag = `${AD_CONFIG.VAST_TAG_URL}&cb=${Date.now()}&attempt=${retryCountRef.current}`;

          const instance = win.fluidPlayer(prerollPlayerId, {
            layoutControls: {
              primaryColor: '#ec4899',
              posterImage: '', // Must remain empty to avoid static poster painting over video track
              playButtonShowing: false, // Prevents big play button covering ad video
              playPauseAnimation: false,
              fillToContainer: true,
              autoPlay: true,
              allowMutedAutoplay: true,
              mute: true, // Muted guarantees 100% video autoplay decoding on Chrome & Mobile
              playbackRateEnabled: false,
              allowTheatre: false,
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
                  vastTag: currentVastTag,
                  adText: 'Sponsor Advertisement',
                  adClickable: true,
                  vpaidMode: 'insecure',
                },
              ],
              skipButtonCaption: 'Skip in [seconds]s',
              skipButtonClickCaption: 'Skip Ad',
              adText: 'Advertisement',
              adTextPosition: 'top left',
              allowVPAID: true,
              vastAdvanced: {
                vastLoadedCallback: () => {
                  if (isMounted && !contentStartedRef.current) {
                    if (safetyFallbackTimer) clearTimeout(safetyFallbackTimer);
                    setShowConnectingLoader(false);
                    setVastState('adPlaying');
                  }
                },
                noVastVideoCallback: () => {
                  if (!isMounted || contentStartedRef.current) return;
                  startMainContent('no_vast_video');
                },
                vastVideoSkippedCallback: () => {
                  if (isMounted) {
                    startMainContent('vast_skipped');
                  }
                },
                vastVideoEndedCallback: () => {
                  if (isMounted) {
                    startMainContent('vast_completed');
                  }
                },
              },
            },
          });

          playerInstanceRef.current = instance;

          // Backup onended on dummy video element
          if (targetEl) {
            targetEl.onended = () => {
              if (isMounted) startMainContent('target_ended');
            };
          }
        } catch (err) {
          console.warn('[FluidPlayer] VAST engine init notice:', err);
          if (isMounted) startMainContent('init_exception');
        }
      } else {
        fluidLoadAttempts += 1;
        if (fluidLoadAttempts > 5) {
          if (isMounted) startMainContent('fluidplayer_not_available');
        } else {
          setTimeout(attachPrerollVast, 80);
        }
      }
    };

    const initTimer = setTimeout(attachPrerollVast, 30);

    // Fast Safeguard: 2.5s max fallback to prevent user getting stuck if ad network hangs
    safetyFallbackTimer = setTimeout(() => {
      if (isMounted && !contentStartedRef.current) {
        startMainContent('vast_safety_timeout');
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      if (loaderDismissTimer) clearTimeout(loaderDismissTimer);
      if (safetyFallbackTimer) clearTimeout(safetyFallbackTimer);
      cleanupPreroll();
    };
  }, [vastState, currentVideoSrc, video.id, videoMountKey, prerollPlayerId]);

  const isPrerollActive = vastState === 'requesting' || vastState === 'adPlaying';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* ── STAGE 1: PreRoll VAST In-Stream Ad Layer (100% Unobstructed Video) ── */}
      {isPrerollActive && (
        <div className="absolute inset-0 z-30 w-full h-full bg-black flex items-center justify-center">
          <video
            key={`preroll-${videoMountKey}`}
            id={prerollPlayerId}
            playsInline
            muted
            preload="auto"
            crossOrigin="anonymous"
            className="w-full h-full object-contain block bg-black"
            style={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#000000' }}
          >
            {playerMode === 'video' && currentVideoSrc ? (
              <source src={currentVideoSrc} type="video/mp4" />
            ) : (
              <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
            )}
          </video>

          {/* Quick Floating Skip Ad Button */}
          <button
            type="button"
            onClick={() => startMainContent('user_clicked_skip')}
            className="absolute top-3 right-3 z-50 px-3.5 py-1.5 rounded-full bg-black/70 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs shadow-xl backdrop-blur-md border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer pointer-events-auto"
            aria-label="Skip Advertisement"
          >
            <span>Skip Ad</span>
            <span className="material-symbols-outlined text-sm">skip_next</span>
          </button>

          {/* Lightweight Initial Connecting Badge (Disappears in <1s or immediately when ad video decodes) */}
          {showConnectingLoader && vastState === 'requesting' && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5 p-4 pointer-events-none">
              <div className="w-10 h-10 rounded-full border-3 border-rose-500/20 border-t-rose-500 animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Loading Sponsor Ad...</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── STAGE 2: Main Video Player (Streamtape Embed or Direct Video) ── */}
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
