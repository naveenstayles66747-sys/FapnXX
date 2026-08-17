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
  const [fluidPlayerFailed, setFluidPlayerFailed] = useState<boolean>(false);

  const playerId = `fluid-player-${video.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

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
    const isStorageBlob = src.startsWith('blob:') || (src.includes('firebasestorage.googleapis.com') && !src.includes('placeholder'));

    const isDirectVideo = !isKnownEmbed && (hasVideoExtension || isStorageBlob);

    return { cleanUrl: src, isDirectVideo };
  };

  // ── Effect: Resolve Player Source (Embed vs Direct MP4/Stream) ───────────
  useEffect(() => {
    setVideoMountKey((k) => k + 1);
    setFluidPlayerFailed(false);

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

  // ── Effect: Initialize Fluid Player with VAST In-Stream Ad for direct videos ──
  useEffect(() => {
    if (playerMode !== 'video' || !currentVideoSrc || fluidPlayerFailed) return;

    let isMounted = true;
    let fallbackTimeout: NodeJS.Timeout | null = null;

    const cleanupCurrentPlayer = () => {
      if (playerInstanceRef.current) {
        try {
          if (typeof playerInstanceRef.current.destroy === 'function') {
            playerInstanceRef.current.destroy();
          }
        } catch (e) {
          console.warn('[FluidPlayer] Cleanup warning:', e);
        }
        playerInstanceRef.current = null;
      }
    };

    const attachFluidPlayer = () => {
      if (!isMounted) return;
      cleanupCurrentPlayer();

      const win = window as any;
      const targetElement = document.getElementById(playerId) as HTMLVideoElement;

      if (!targetElement) {
        if (isMounted) setTimeout(attachFluidPlayer, 80);
        return;
      }

      if (typeof win.fluidPlayer === 'function') {
        try {
          // Safety 3-second timeout: If VAST ad network hangs or freezes, fallback to native HTML5 video
          fallbackTimeout = setTimeout(() => {
            if (isMounted && !playerInstanceRef.current) {
              console.warn('[FluidPlayer] VAST loading timeout - falling back to native player.');
              setFluidPlayerFailed(true);
            }
          }, 3000);

          const instance = win.fluidPlayer(playerId, {
            layoutControls: {
              primaryColor: '#ec4899',
              posterImage: video.thumbnail || (video as any).thumbnailUrl || '',
              playButtonShowing: true,
              playPauseAnimation: true,
              fillToContainer: true,
              autoPlay: autoPlay,
              allowMutedAutoplay: true,
              mute: false,
              playbackRateEnabled: true,
              allowTheatre: false,
              doubleclickFullscreen: true,
              controlBar: {
                autoHide: true,
                autoHideTimeout: 3,
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
                {
                  roll: 'midRoll',
                  vastTag: 'https://s.magsrv.com/v1/vast.php?idz=6003184',
                  timer: '00:03:00',
                },
              ],
              skipButtonCaption: 'Skip in [seconds]s',
              skipButtonClickCaption: 'Skip Ad <span class="skip_button_icon"></span>',
              adText: 'Advertisement',
              adTextPosition: 'top left',
              allowVPAID: true,
              showProgressbarMarkers: true,
              vastAdvanced: {
                vastLoadedCallback: () => {
                  if (fallbackTimeout) clearTimeout(fallbackTimeout);
                  console.log('[FluidPlayer] VAST Ad loaded successfully (Zone 6003184)');
                },
                noVastVideoCallback: () => {
                  if (fallbackTimeout) clearTimeout(fallbackTimeout);
                  console.log('[FluidPlayer] No VAST video available, playing main content.');
                },
                adErrorCallback: (error: any) => {
                  if (fallbackTimeout) clearTimeout(fallbackTimeout);
                  console.warn('[FluidPlayer] VAST Ad error:', error);
                },
              },
            },
          });

          playerInstanceRef.current = instance;
        } catch (err) {
          console.warn('[FluidPlayer] Initialization error:', err);
          setFluidPlayerFailed(true);
        }
      } else {
        // Retry script loading
        const scriptId = 'fluidplayer-sdk-loader';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = 'https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js';
          script.onload = () => {
            if (isMounted) setTimeout(attachFluidPlayer, 50);
          };
          document.head.appendChild(script);
        } else {
          setTimeout(attachFluidPlayer, 120);
        }
      }
    };

    const timer = setTimeout(attachFluidPlayer, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      cleanupCurrentPlayer();
    };
  }, [playerMode, currentVideoSrc, video.id, videoMountKey, autoPlay, playerId, fluidPlayerFailed]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {playerMode === 'embed' ? (
        // ── 1. Full Embed / Iframe Video Player (Streamtape, SpankBang, XVideos, DoodStream, etc.) ──
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
      ) : fluidPlayerFailed ? (
        // ── 2. Native HTML5 Fallback Player (Instant 0-delay playback if VAST or FluidPlayer fails) ──
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
          <video
            key={`native-v-${videoMountKey}`}
            src={currentVideoSrc}
            controls
            autoPlay={autoPlay}
            playsInline
            poster={video.thumbnail || (video as any).thumbnailUrl || ''}
            onEnded={onEnded}
            className="w-full h-full object-contain block bg-black"
          />
        </div>
      ) : (
        // ── 3. Fluid Player HTML5 Video Player with In-Stream VAST Ad Engine ──
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
          <video
            key={`fluid-v-${videoMountKey}`}
            id={playerId}
            playsInline
            poster={video.thumbnail || (video as any).thumbnailUrl || ''}
            preload="auto"
            onEnded={onEnded}
            onError={() => {
              console.warn('[Player] Direct stream load warning, switching to native fallback.');
              setFluidPlayerFailed(true);
            }}
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
          >
            {currentVideoSrc && <source src={currentVideoSrc} type="video/mp4" />}
            {currentVideoSrc && <source src={currentVideoSrc} type="video/webm" />}
          </video>
        </div>
      )}
    </div>
  );
};

export default FluidPlayerWrapper;
