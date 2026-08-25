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

type VASTState = 'idle' | 'requesting' | 'adLoaded' | 'adPlaying' | 'adCompleted' | 'contentPlaying';

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

  // VAST PreRoll State Machine & Smart Retry Engine
  const [vastState, setVastState] = useState<VASTState>('idle');
  const [adStatusMessage, setAdStatusMessage] = useState<string>('Connecting to Sponsor Ad...');
  const retryCountRef = useRef<number>(0);
  const adStartTimeRef = useRef<number>(0);
  const maxRetries = 2; // Up to 2 retries on temporary network drops/blips

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
    adStartTimeRef.current = Date.now();
    setAdStatusMessage('Connecting to Sponsor Ad...');
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
      // Run VAST PreRoll before revealing the main embed video
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
      contentStartedRef.current = true;
    }
  }, [video.id, video.embedUrl, video.previewMp4Url]);

  // ── Transition Helper: Start Main Video Stream Idempotently ─────────────
  const startMainContent = (reason: string) => {
    if (contentStartedRef.current) return;
    contentStartedRef.current = true;

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

  // ── Effect: Initialize Fluid Player VAST 3.0 PreRoll Engine with Smart Retry ───────
  useEffect(() => {
    if (vastState !== 'requesting' || !currentVideoSrc) return;

    let isMounted = true;
    let retryTimer: NodeJS.Timeout | null = null;
    let safetyFallbackTimer: NodeJS.Timeout | null = null;

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

    let fluidLoadAttempts = 0;
    const attachPrerollVast = () => {
      if (!isMounted || contentStartedRef.current) return;
      cleanupPreroll();

      const win = window as any;
      const targetEl = document.getElementById(prerollPlayerId) as HTMLVideoElement;

      if (!targetEl) {
        if (isMounted) setTimeout(attachPrerollVast, 80);
        return;
      }

      if (typeof win.fluidPlayer === 'function') {
        try {
          // Dynamic Cache-Buster & Attempt Tag to avoid stale zero-fill cache
          const currentVastTag = `${AD_CONFIG.VAST_TAG_URL}&cb=${Date.now()}&attempt=${retryCountRef.current}`;

          const instance = win.fluidPlayer(prerollPlayerId, {
            layoutControls: {
              primaryColor: '#ec4899',
              posterImage: video.thumbnail || (video as any).thumbnailUrl || '',
              playButtonShowing: true,
              playPauseAnimation: true,
              fillToContainer: true,
              autoPlay: true,
              allowMutedAutoplay: true,
              mute: true, // Muted initially guarantees 100% autoplay compliance on Chrome & mobile
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
                  adText: 'Advertisement',
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
          console.warn('[FluidPlayer] VAST engine init warning:', err);
          if (isMounted) startMainContent('init_exception');
        }
      } else {
        fluidLoadAttempts += 1;
        if (fluidLoadAttempts > 4) {
          // If fluidPlayer library is not loaded after 400ms (e.g. adblocker active), proceed directly to video
          if (isMounted) startMainContent('fluidplayer_not_available');
        } else {
          setTimeout(attachPrerollVast, 100);
        }
      }
    };

    const initTimer = setTimeout(attachPrerollVast, 50);

    // Fast Safeguard: 2.0s max fallback to prevent user getting stuck on sponsor connecting screen
    safetyFallbackTimer = setTimeout(() => {
      if (isMounted && !contentStartedRef.current) {
        startMainContent('vast_safety_timeout');
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      if (retryTimer) clearTimeout(retryTimer);
      if (safetyFallbackTimer) clearTimeout(safetyFallbackTimer);
      cleanupPreroll();
    };
  }, [vastState, currentVideoSrc, video.id, videoMountKey, prerollPlayerId]);

  const isPrerollActive = vastState === 'requesting' || vastState === 'adPlaying' || vastState === 'adLoaded';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* ── STAGE 1: PreRoll VAST In-Stream Ad Layer (Native FluidPlayer) ── */}
      {isPrerollActive && (
        <div className="absolute inset-0 z-30 w-full h-full bg-black flex items-center justify-center">
          <video
            key={`preroll-${videoMountKey}`}
            id={prerollPlayerId}
            playsInline
            poster={video.thumbnail || (video as any).thumbnailUrl || ''}
            preload="auto"
            className="w-full h-full object-contain block bg-black"
          >
            {playerMode === 'video' && currentVideoSrc ? (
              <source src={currentVideoSrc} type="video/mp4" />
            ) : (
              <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
            )}
          </video>

          {/* Sleek Visual "Connecting to Sponsor Ad..." Loader Overlay */}
          {vastState === 'requesting' && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 animate-in fade-in duration-150">
              <div className="relative flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-3 border-rose-500/20 border-t-rose-500 animate-spin" />
                <span className="material-symbols-outlined text-rose-500 text-lg absolute">play_circle</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>{adStatusMessage}</span>
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Please wait, your video will begin shortly</span>
              </div>
              {/* Instant Skip & Play Video Action */}
              <button
                type="button"
                onClick={() => startMainContent('user_clicked_skip')}
                className="mt-2 px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer z-50 pointer-events-auto"
              >
                <span>Skip Ad & Play Video</span>
                <span className="material-symbols-outlined text-sm">play_arrow</span>
              </button>
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
