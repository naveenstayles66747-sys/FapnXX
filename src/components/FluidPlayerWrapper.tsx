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
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [videoMountKey, setVideoMountKey] = useState<number>(0);
  const [isFluidPlayerActive, setIsFluidPlayerActive] = useState<boolean>(false);

  // ── Helper: Extract clean URL from raw embed / iframe / video input ──────
  const extractEmbedUrl = (rawInput?: string): { cleanUrl: string; isDirectVideo: boolean } => {
    let src = (rawInput || '').trim();
    if (src.startsWith('<iframe') || src.includes('src=')) {
      const match = src.match(/src=["']([^"']+)["']/i);
      if (match && match[1]) src = match[1];
    }
    src = src.replace(/^["']|["']$/g, '').trim();
    if (src.startsWith('//')) src = 'https:' + src;
    const isDirectVideo =
      Boolean(src.match(/\.(mp4|webm|m3u8|mov|ogg)(\?.*)?$/i)) || src.startsWith('blob:');
    return { cleanUrl: src, isDirectVideo };
  };

  // ── Effect: Resolve Player Source (Embed vs Direct MP4/Stream) ───────────
  useEffect(() => {
    setVideoMountKey((k) => k + 1);
    setIsFluidPlayerActive(false);

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

  // ── Effect: Initialize Fluid Player with VAST In-Stream Ad ───────────
  useEffect(() => {
    if (playerMode !== 'video' || !currentVideoSrc || !videoRef.current) return;

    let isMounted = true;

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
      if (!isMounted || !videoRef.current) return;
      cleanupCurrentPlayer();

      const win = window as any;
      if (typeof win.fluidPlayer === 'function') {
        try {
          const instance = win.fluidPlayer(videoRef.current, {
            layoutControls: {
              primaryColor: '#ec4899',
              posterImage: video.thumbnail || (video as any).thumbnailUrl || '',
              playButtonShowing: true,
              playPauseAnimation: true,
              fillToContainer: true,
              autoPlay: autoPlay,
              allowDownload: false,
              playbackRateEnabled: true,
              allowTheatre: false,
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
              vastAdvanced: {
                vastLoadedCallback: () => {
                  console.log('[FluidPlayer] In-Stream VAST Ad loaded successfully (Zone 6003184)');
                },
                noVastVideoCallback: () => {
                  console.log('[FluidPlayer] No VAST video available, streaming main content.');
                },
                adErrorCallback: (error: any) => {
                  console.warn('[FluidPlayer] VAST Ad error:', error);
                },
              },
            },
          });

          playerInstanceRef.current = instance;
          setIsFluidPlayerActive(true);
        } catch (err) {
          console.warn('[FluidPlayer] Initialization error:', err);
        }
      } else {
        // If fluidPlayer script is still loading, retry after brief delay
        setTimeout(attachFluidPlayer, 150);
      }
    };

    const timer = setTimeout(attachFluidPlayer, 80);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      cleanupCurrentPlayer();
    };
  }, [playerMode, currentVideoSrc, video.id, videoMountKey, autoPlay]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {playerMode === 'embed' ? (
        // ── 1. Full Embed / Iframe Video Player (SpankBang, XVideos, Streamtape, DoodStream, etc.) ──
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
        // ── 2. Fluid Player HTML5 Video Player with In-Stream VAST Ad Engine ──
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
          <video
            key={`fluid-${videoMountKey}`}
            ref={videoRef}
            src={currentVideoSrc}
            playsInline
            poster={video.thumbnail || (video as any).thumbnailUrl || ''}
            onEnded={onEnded}
            onError={() => console.warn('[Player] Direct stream load warning.')}
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
