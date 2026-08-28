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
  const [adCurrentTime, setAdCurrentTime] = useState<number>(0);
  const [adDuration, setAdDuration] = useState<number>(15);
  const [isAdMuted, setIsAdMuted] = useState<boolean>(true);
  const [canSkipAd, setCanSkipAd] = useState<boolean>(false);
  const [skipRemainingSeconds, setSkipRemainingSeconds] = useState<number>(5);

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
    setCanSkipAd(false);
    setSkipRemainingSeconds(5);

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

  // ── Effect: Fluid Player Native VAST + Direct VAST Fallback Engine ───────
  useEffect(() => {
    if (!isPrerollActive || !currentVideoSrc) return;

    let isMounted = true;
    let fallbackSafetyTimer: NodeJS.Timeout | null = null;
    let directVastStarted = false;

    // 1. Ensure Fluid Player CDN script and CSS are loaded dynamically on demand
    if (typeof window !== 'undefined') {
      if (!document.getElementById('fluidplayer-cdn-css')) {
        const link = document.createElement('link');
        link.id = 'fluidplayer-cdn-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.fluidplayer.com/v3/current/fluidplayer.min.css';
        link.type = 'text/css';
        document.head.appendChild(link);
      }
      if (!(window as any).fluidPlayer && !document.getElementById('fluidplayer-cdn-script')) {
        const script = document.createElement('script');
        script.id = 'fluidplayer-cdn-script';
        script.src = 'https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js';
        script.async = true;
        document.head.appendChild(script);
      }
    }

    // 2. Concurrently fetch parsed VAST XML for fast fallback with unique cache-buster
    const dynamicVastTag = `${VAST_TAG_URL}${VAST_TAG_URL.includes('?') ? '&' : '?'}cb=${Date.now()}_${Math.random().toString(36).substring(2, 8)}&v=${encodeURIComponent(video.id)}`;

    fetchVastAd(dynamicVastTag, 4500)
      .then((parsedAd) => {
        if (!isMounted || contentStartedRef.current) return;
        if (parsedAd && parsedAd.mediaUrl) {
          setTimeout(() => {
            if (isMounted && !contentStartedRef.current && isPrerollActive && !playerInstanceRef.current) {
              directVastStarted = true;
              setDirectVastAd(parsedAd);
              setAdDuration(parsedAd.durationSeconds || 15);
              setSkipRemainingSeconds(parsedAd.skipOffsetSeconds || 5);
              fireTrackingPixel(parsedAd.impressionUrls);
            }
          }, 1800);
        }
      })
      .catch(() => {});

    // 3. Try initializing Official Fluid Player VAST
    let attempts = 0;
    const initFluidVast = () => {
      if (!isMounted || contentStartedRef.current || directVastStarted) return;
      cleanupInstance();

      const win = window as any;
      const targetEl = document.getElementById(prerollPlayerId) as HTMLVideoElement;

      if (!targetEl || typeof win.fluidPlayer !== 'function') {
        attempts += 1;
        if (isMounted && attempts < 30) {
          setTimeout(initFluidVast, 150);
        } else if (isMounted && !directVastStarted && attempts >= 30) {
          // If fluid player CDN or video element took too long, transition to main content
          startMainContent();
        }
        return;
      }

      try {
        const instance = win.fluidPlayer(prerollPlayerId, {
          layoutControls: {
            primaryColor: '#ec4899',
            posterImage: '',
            playButtonShowing: true,
            playPauseAnimation: true,
            fillToContainer: true,
            autoPlay: true,
            allowMutedAutoplay: true,
            mute: true, // Muted autoplay ensures 100% browser compatibility without getting blocked
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
                vastTag: dynamicVastTag,
                adClickable: true,
                vpaidMode: 'insecure',
              },
            ],
            allowVPAID: true,
            vastAdvanced: {
              vastLoadedCallback: () => {
                if (isMounted) setIsAdLoading(false);
              },
              vastVideoStartedCallback: () => {
                if (isMounted) {
                  setIsAdLoading(false);
                  if (fallbackSafetyTimer) clearTimeout(fallbackSafetyTimer);
                }
              },
              noVastVideoCallback: () => {
                if (isMounted && !directVastStarted) {
                  setTimeout(() => {
                    if (isMounted && !directVastStarted && !contentStartedRef.current) {
                      startMainContent();
                    }
                  }, 2500);
                }
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

        // Instant DOM watcher: as soon as ad elements are rendered, hide loading overlay
        const checkAdElements = () => {
          if (!isMounted) return;
          const adEls = document.querySelectorAll(
            '.fluid_video_wrapper, .fluid_ad_video, .fluid_vpaid_container, .fluid_vpaid_iframe, .fluid_controls_container'
          );
          if (adEls.length > 0) {
            setIsAdLoading(false);
          }
        };

        checkAdElements();
        const adDomInterval = setInterval(checkAdElements, 100);
        setTimeout(() => clearInterval(adDomInterval), 3000);

        targetEl.addEventListener('playing', () => {
          if (isMounted) {
            setIsAdLoading(false);
            if (fallbackSafetyTimer) clearTimeout(fallbackSafetyTimer);
          }
        });

        targetEl.addEventListener('timeupdate', () => {
          if (isMounted && targetEl.currentTime > 0.1) {
            setIsAdLoading(false);
          }
        });

        targetEl.addEventListener('play', () => {
          if (isMounted) setIsAdLoading(false);
        });

        targetEl.addEventListener('ended', () => {
          if (isMounted) startMainContent();
        });
      } catch (err) {
        console.warn('[FluidPlayer] VAST initialization notice:', err);
        if (isMounted && !directVastStarted) {
          setTimeout(() => {
            if (isMounted && !contentStartedRef.current) startMainContent();
          }, 1500);
        }
      }
    };

    const initTimer = setTimeout(initFluidVast, 80);

    // Hard cap: Loading spinner must NEVER stay visible longer than 1.5 seconds
    const hideLoadingCapTimer = setTimeout(() => {
      if (isMounted) {
        setIsAdLoading(false);
      }
    }, 1500);

    // Safeguard fallback: if ad network drops or no fill occurs within 12 seconds, transition to main video
    fallbackSafetyTimer = setTimeout(() => {
      if (isMounted && !contentStartedRef.current) {
        startMainContent();
      }
    }, 12000);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      clearTimeout(hideLoadingCapTimer);
      if (fallbackSafetyTimer) clearTimeout(fallbackSafetyTimer);
      cleanupInstance();
    };
  }, [isPrerollActive, currentVideoSrc, video.id, videoMountKey, prerollPlayerId]);

  // Handle direct VAST ad time updates and skip countdown
  const handleDirectAdTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (isAdLoading && v.currentTime > 0.1) {
      setIsAdLoading(false);
    }
    setAdCurrentTime(v.currentTime);
    if (v.duration && !isNaN(v.duration) && v.duration > 0) {
      setAdDuration(v.duration);
    }

    const skipOffset = directVastAd?.skipOffsetSeconds || 5;
    const remaining = Math.max(0, Math.ceil(skipOffset - v.currentTime));
    setSkipRemainingSeconds(remaining);
    if (remaining === 0 && !canSkipAd) {
      setCanSkipAd(true);
    }
  };

  const handleSkipAdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (directVastAd) {
      fireTrackingPixel(directVastAd.trackingEvents?.skip);
    }
    startMainContent();
  };

  const handleAdClickThrough = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (directVastAd) {
      fireTrackingPixel(directVastAd.clickTrackingUrls);
      const targetUrl = directVastAd.clickThroughUrl || 'https://go.marzaent.com/smartpop/165aea9bcdd7aabac45f72d02f58fd24b8416bc57cfc540b1b4409ac823564af';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 1: VAST IN-STREAM AD PREROLL WITH LOADING OVERLAY
      ══════════════════════════════════════════════════════════════════════ */}
      {isPrerollActive && (
        <div className="absolute inset-0 z-30 w-full h-full bg-black flex items-center justify-center overflow-hidden">
          
          {/* Direct VAST Player UI (Active when direct VAST is engaged) */}
          {directVastAd ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={adVideoRef}
                src={directVastAd.mediaUrl}
                autoPlay
                playsInline
                muted={isAdMuted}
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

              {/* Direct Ad Top Bar: Badge & Unmute Button */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-40 pointer-events-auto">
                <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-yellow-500/40 shadow-lg">
                  <span className="bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded">
                    AD
                  </span>
                  <span className="text-white text-xs font-mono">
                    Ad ends in {Math.max(0, Math.ceil(adDuration - adCurrentTime))}s
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAdMuted(!isAdMuted);
                    if (adVideoRef.current) {
                      adVideoRef.current.muted = !isAdMuted;
                    }
                  }}
                  className="bg-black/80 hover:bg-black text-white px-3 py-1.5 rounded-full border border-white/20 text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm text-rose-500">
                    {isAdMuted ? 'volume_off' : 'volume_up'}
                  </span>
                  <span>{isAdMuted ? 'Unmute' : 'Mute'}</span>
                </button>
              </div>

              {/* Direct Ad Bottom Bar: CTA Link, Progress Bar & Skip Button */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 z-40 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleAdClickThrough}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-xl transition-all transform hover:scale-105 active:scale-95 border border-rose-400/40 cursor-pointer"
                >
                  <span>{directVastAd.ctaText || 'Visit Sponsor'}</span>
                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                </button>

                <div className="flex items-center gap-2">
                  {canSkipAd ? (
                    <button
                      type="button"
                      onClick={handleSkipAdClick}
                      className="bg-white/90 hover:bg-white text-black font-extrabold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xl transition-all active:scale-95 border border-white/50 cursor-pointer"
                    >
                      <span>Skip Ad</span>
                      <span className="material-symbols-outlined text-xs">skip_next</span>
                    </button>
                  ) : (
                    <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-zinc-300 text-xs font-mono">
                      Skip in {skipRemainingSeconds}s
                    </div>
                  )}
                </div>
              </div>

              {/* Ad Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-40">
                <div
                  className="h-full bg-rose-500 transition-all duration-150"
                  style={{ width: `${Math.min(100, (adCurrentTime / (adDuration || 1)) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            /* Fluid Player Native VAST PreRoll Element */
            <video
              key={`preroll-${videoMountKey}`}
              id={prerollPlayerId}
              playsInline
              preload="auto"
              muted
              className="w-full h-full object-contain block bg-black"
            >
              <source
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                type="video/mp4"
              />
            </video>
          )}

          {/* ── LOADING SPINNER OVERLAY (Visible until VAST Ad Starts Playing) ── */}
          {isAdLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 gap-3 transition-opacity duration-300 pointer-events-none">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-3 border-rose-500/20 border-t-rose-500 animate-spin" />
                <span className="material-symbols-outlined text-rose-500 text-sm absolute">
                  play_arrow
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5 text-center px-4">
                <span className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
                  Loading In-Stream Ad...
                </span>
                <span className="text-[10px] text-zinc-500">
                  Video will start automatically after sponsor
                </span>
              </div>
            </div>
          )}
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
