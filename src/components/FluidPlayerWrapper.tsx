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

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [isPlayingDirect, setIsPlayingDirect] = useState<boolean>(false);
  const [videoMountKey, setVideoMountKey] = useState<number>(0);

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
    setIsPlayingDirect(false);
    setVideoMountKey((k) => k + 1);

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

  const handlePlayDirect = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => setIsPlayingDirect(true))
        .catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current
              .play()
              .then(() => setIsPlayingDirect(true))
              .catch(() => {});
          }
        });
    }
  };

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
        // ── 2. Direct MP4 / HLS HTML5 Video Player ──
        <div
          className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group/videostage cursor-pointer"
          onClick={handlePlayDirect}
        >
          <video
            key={`direct-${videoMountKey}`}
            ref={videoRef}
            src={currentVideoSrc}
            controls
            autoPlay={autoPlay}
            playsInline
            poster={video.thumbnail}
            onEnded={onEnded}
            onPlay={() => setIsPlayingDirect(true)}
            onPause={() => setIsPlayingDirect(false)}
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

          {/* Direct stream play button overlay when paused */}
          {!isPlayingDirect && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handlePlayDirect();
              }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer"
            >
              <button
                className="w-16 h-16 md:w-20 md:h-20 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-rose-600/50 transform hover:scale-110 active:scale-95 transition-all border-2 border-white/20"
                aria-label="Play Video"
              >
                <span className="material-symbols-outlined text-4xl md:text-5xl ml-1">play_arrow</span>
              </button>
              <span className="mt-3 px-3.5 py-1 bg-black/70 rounded-full text-white text-xs font-semibold backdrop-blur-sm">
                Tap to Play Stream
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FluidPlayerWrapper;
