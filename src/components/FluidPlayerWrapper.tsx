import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { videoService } from '../services/videoService';

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

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [videoMountKey, setVideoMountKey] = useState<number>(0);

  // PreRoll Ad Stage State (Allows VAST Ads before both Streamtape and Direct Videos)
  const [isPrerollDone, setIsPrerollDone] = useState<boolean>(false);
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

    // Direct video ONLY if it has an actual video file extension or blob/storage
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
    setIsPrerollDone(false);

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
    }
  }, [video.id, video.embedUrl, video.previewMp4Url]);

  // ── Effect: Initialize PreRoll VAST Ad Stage (Runs for ALL videos including Streamtape) ──
  useEffect(() => {
    if (isPrerollDone || !currentVideoSrc) return;

    let isMounted = true;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const cleanupPreroll = () => {
      if (playerInstanceRef.current) {
        try {
          if (typeof playerInstanceRef.current.destroy === 'function') {
            playerInstanceRef.current.destroy();
          }
        } catch (e) {}
        playerInstanceRef.current = null;
      }
    };

    const attachPrerollVast = () => {
      if (!isMounted) return;
      cleanupPreroll();

      const win = window as any;
      const targetEl = document.getElementById(prerollPlayerId) as HTMLVideoElement;

      if (!targetEl) {
        if (isMounted) setTimeout(attachPrerollVast, 80);
        return;
      }

      if (typeof win.fluidPlayer === 'function') {
        try {
          // If VAST network takes > 2.5s or frequency cap is reached, finish preroll immediately
          fallbackTimer = setTimeout(() => {
            if (isMounted && !isPrerollDone) {
              console.log('[FluidPlayer] VAST PreRoll finished / timeout - loading main content.');
              cleanupPreroll();
              setIsPrerollDone(true);
            }
          }, 2500);

          const instance = win.fluidPlayer(prerollPlayerId, {
            layoutControls: {
              primaryColor: '#ec4899',
              posterImage: video.thumbnail || (video as any).thumbnailUrl || '',
              playButtonShowing: true,
              playPauseAnimation: true,
              fillToContainer: true,
              autoPlay: true,
              allowMutedAutoplay: true,
              mute: false,
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
                  vastTag: 'https://s.magsrv.com/v1/vast.php?idz=6003184',
                  adText: 'Advertisement',
                  adClickable: true,
                },
              ],
              skipButtonCaption: 'Skip in [seconds]s',
              skipButtonClickCaption: 'Skip Ad <span class="skip_button_icon"></span>',
              adText: 'Advertisement',
              adTextPosition: 'top left',
              allowVPAID: true,
              vastAdvanced: {
                vastLoadedCallback: () => {
                  if (fallbackTimer) clearTimeout(fallbackTimer);
                  console.log('[FluidPlayer] VAST Ad loaded and playing (Zone 6003184)');
                },
                noVastVideoCallback: () => {
                  if (fallbackTimer) clearTimeout(fallbackTimer);
                  console.log('[FluidPlayer] No VAST ad returned (Frequency Capped / No Fill).');
                  cleanupPreroll();
                  setIsPrerollDone(true);
                },
                adErrorCallback: (error: any) => {
                  if (fallbackTimer) clearTimeout(fallbackTimer);
                  console.warn('[FluidPlayer] VAST error:', error);
                  cleanupPreroll();
                  setIsPrerollDone(true);
                },
              },
            },
          });

          playerInstanceRef.current = instance;

          // When video in preroll ends, advance to main player
          if (targetEl) {
            targetEl.onended = () => {
              if (fallbackTimer) clearTimeout(fallbackTimer);
              cleanupPreroll();
              setIsPrerollDone(true);
            };
          }
        } catch (err) {
          console.warn('[FluidPlayer] Preroll init error:', err);
          if (fallbackTimer) clearTimeout(fallbackTimer);
          cleanupPreroll();
          setIsPrerollDone(true);
        }
      } else {
        setTimeout(attachPrerollVast, 100);
      }
    };

    const initTimer = setTimeout(attachPrerollVast, 60);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      cleanupPreroll();
    };
  }, [isPrerollDone, currentVideoSrc, video.id, videoMountKey, prerollPlayerId]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* ── STAGE 1: PreRoll VAST In-Stream Ad Layer (Attempts ad for ALL videos) ── */}
      {!isPrerollDone && (
        <div className="absolute inset-0 z-30 w-full h-full bg-black flex items-center justify-center">
          <video
            key={`preroll-${videoMountKey}`}
            id={prerollPlayerId}
            playsInline
            poster={video.thumbnail || (video as any).thumbnailUrl || ''}
            preload="auto"
            className="w-full h-full object-contain block bg-black"
          >
            {/* Minimal dummy base clip for FluidPlayer to attach VAST PreRoll */}
            <source
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
              type="video/mp4"
            />
          </video>

          {/* Quick Skip button in case user wants to jump directly to Streamtape */}
          <button
            type="button"
            onClick={() => setIsPrerollDone(true)}
            className="absolute top-3 right-3 z-40 bg-black/80 hover:bg-rose-600 text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20 shadow-lg cursor-pointer transition-colors flex items-center gap-1"
          >
            <span>Skip to Video</span>
            <span className="material-symbols-outlined text-xs">fast_forward</span>
          </button>
        </div>
      )}

      {/* ── STAGE 2: Main Video Player (Loads after PreRoll or immediately if ad is skipped/empty) ── */}
      {playerMode === 'embed' ? (
        // ── Full Embed / Iframe Video Player (Streamtape, SpankBang, XVideos, DoodStream, etc.) ──
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
        // ── Direct MP4 / HLS HTML5 Video Player ──
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
