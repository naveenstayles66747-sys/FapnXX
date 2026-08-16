import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { videoService } from '../services/videoService';

interface FluidPlayerWrapperProps {
  video: Video;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
}

// ExoClick Official In-Stream VAST Tag (Zone ID: 6003184)
const EXOCLICK_VAST_TAG = 'https://s.magsrv.com/v1/vast.php?idz=6003184';

// Sample fallback stream for embed transitions
const FALLBACK_STREAM = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export const FluidPlayerWrapper: React.FC<FluidPlayerWrapperProps> = ({
  video,
  autoPlay = true,
  onEnded,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fluidInstanceRef = useRef<any>(null);

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(true);
  const [videoMountKey, setVideoMountKey] = useState<number>(0);

  const vastTagUrl = video.vastAdTagUrl?.trim() || EXOCLICK_VAST_TAG;

  // ── Helper: Extract clean URL ─────────────────────────────────────────────
  const extractEmbedUrl = (rawInput?: string): { cleanUrl: string; isDirectVideo: boolean } => {
    let src = (rawInput || '').trim();
    if (src.startsWith('<iframe') || src.includes('src=')) {
      const match = src.match(/src=["']([^"']+)["']/);
      if (match && match[1]) src = match[1];
    }
    src = src.replace(/^["']|["']$/g, '').trim();
    if (src.startsWith('//')) src = 'https:' + src;
    const isDirectVideo =
      Boolean(src.match(/\.(mp4|webm|m3u8|mov|ogg)(\?.*)?$/i)) || src.startsWith('blob:');
    return { cleanUrl: src, isDirectVideo };
  };

  // ── Effect 1: Resolve Video Source ────────────────────────────────────────
  useEffect(() => {
    setIsAdPlaying(true);
    setVideoMountKey((k) => k + 1);

    const rawEmbed = (video.embedUrl || '').trim();
    const rawMp4 = (video.previewMp4Url || '').trim();

    if (rawEmbed) {
      const { cleanUrl: c, isDirectVideo: d } = extractEmbedUrl(rawEmbed);
      setPlayerMode(d ? 'video' : 'embed');
      setCurrentVideoSrc(c);
    } else if (rawMp4) {
      const { cleanUrl: c } = extractEmbedUrl(rawMp4);
      setPlayerMode('video');
      setCurrentVideoSrc(c);
    } else {
      setPlayerMode('embed');
      setCurrentVideoSrc('');
    }
  }, [video.id]);

  // ── Effect 2: Initialize Fluid Player with ExoClick VAST Tag ──────────────
  useEffect(() => {
    const videoElementId = `fluid-player-${video.id}`;
    let isMounted = true;

    const initFluid = () => {
      const win = window as any;
      if (!win.fluidPlayer) return false;

      const el = document.getElementById(videoElementId) as HTMLVideoElement;
      if (!el) return false;

      try {
        if (fluidInstanceRef.current && typeof fluidInstanceRef.current.destroy === 'function') {
          try {
            fluidInstanceRef.current.destroy();
          } catch {}
        }

        const player = win.fluidPlayer(videoElementId, {
          layoutControls: {
            primaryColor: '#e0358d',
            posterImage: video.thumbnail || '',
            fillToContainer: true,
            autoPlay: autoPlay,
            mute: false,
            keyboardControl: true,
            playbackRateControl: true,
            allowDownload: false,
            playPauseAnimation: true,
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
                vastTag: vastTagUrl,
                timer: 5,
              },
            ],
            skipButtonCaption: 'Skip ad in [seconds]',
            skipButtonClickCaption: 'Skip ad',
            adText: 'Advertisement',
            adTextPosition: 'top left',
            vastAdvanced: {
              vastLoadedCallback: () => {
                if (isMounted) setIsAdPlaying(true);
              },
              noVastVideoCallback: () => {
                if (isMounted) setIsAdPlaying(false);
              },
              vastVideoEndedCallback: () => {
                if (isMounted) setIsAdPlaying(false);
              },
              vastVideoSkippedCallback: () => {
                if (isMounted) setIsAdPlaying(false);
              },
            },
          },
        });

        fluidInstanceRef.current = player;
        return true;
      } catch (err) {
        console.warn('[FluidPlayer] Initialization error:', err);
        return false;
      }
    };

    // Retry initialization if Fluid Player script is still loading from CDN
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (initFluid() || attempts > 20) {
        clearInterval(interval);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (fluidInstanceRef.current && typeof fluidInstanceRef.current.destroy === 'function') {
        try {
          fluidInstanceRef.current.destroy();
        } catch {}
      }
    };
  }, [video.id, vastTagUrl, autoPlay, videoMountKey]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {/* ── Fluid Player Video Stage with ExoClick VAST Integration ── */}
      <div
        className={`w-full h-full ${
          playerMode === 'embed' && !isAdPlaying ? 'hidden' : 'block'
        }`}
      >
        <video
          id={`fluid-player-${video.id}`}
          key={`video-${videoMountKey}`}
          src={playerMode === 'video' ? currentVideoSrc : FALLBACK_STREAM}
          playsInline
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
        >
          <source
            src={playerMode === 'video' ? currentVideoSrc : FALLBACK_STREAM}
            type="video/mp4"
          />
        </video>
      </div>

      {/* ── Embed Iframe Stage (Mounts seamlessly once Pre-Roll Ad ends or skips) ── */}
      {playerMode === 'embed' && !isAdPlaying && (
        <div className="absolute inset-0 w-full h-full bg-black overflow-hidden z-20">
          <iframe
            key={`iframe-${videoMountKey}`}
            src={currentVideoSrc}
            title={video.title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; web-share; xr-spatial-tracking"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            scrolling="no"
            frameBorder={0}
            className="w-full h-full border-none block bg-black"
            style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      )}
    </div>
  );
};

export default FluidPlayerWrapper;
