import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';

interface FluidPlayerWrapperProps {
  video: Video;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
}

// Default in-stream VAST Tag URL provided by user
const DEFAULT_IN_STREAM_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idz=6000128';

export const FluidPlayerWrapper: React.FC<FluidPlayerWrapperProps> = ({
  video,
  autoPlay = true,
  onEnded,
  className = '',
}) => {
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(true);
  const [adCountdown, setAdCountdown] = useState<number>(5);
  const [canSkipAd, setCanSkipAd] = useState<boolean>(false);
  const [vastMediaUrl, setVastMediaUrl] = useState<string | null>(null);
  const [vastClickUrl, setVastClickUrl] = useState<string | null>(null);
  const [isAdVideoMuted, setIsAdVideoMuted] = useState<boolean>(false);

  const adVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [isPlayingDirect, setIsPlayingDirect] = useState<boolean>(false);

  const vastAdUrlToUse = video.vastAdTagUrl?.trim() || DEFAULT_IN_STREAM_VAST_URL;

  // 1. Fetch & Parse VAST XML for In-Stream Ad Media
  useEffect(() => {
    let isMounted = true;

    const parseVast = async () => {
      try {
        const response = await fetch(vastAdUrlToUse);
        if (!response.ok) return;
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');

        // Extract MediaFile URL
        const mediaFiles = xml.getElementsByTagName('MediaFile');
        let extractedMedia: string | null = null;
        for (let i = 0; i < mediaFiles.length; i++) {
          const text = mediaFiles[i].textContent?.trim();
          if (text && (text.includes('.mp4') || text.includes('.webm') || text.startsWith('http'))) {
            extractedMedia = text;
            break;
          }
        }

        // Extract ClickThrough URL
        const clickThroughs = xml.getElementsByTagName('ClickThrough');
        let extractedClick: string | null = null;
        if (clickThroughs.length > 0 && clickThroughs[0].textContent) {
          extractedClick = clickThroughs[0].textContent.trim();
        }

        if (isMounted) {
          setVastMediaUrl(extractedMedia);
          setVastClickUrl(extractedClick);
        }
      } catch (err) {
        console.warn('[VAST Parser] CORS or XML error. Using iframe fallback:', err);
      }
    };

    parseVast();
    return () => {
      isMounted = false;
    };
  }, [vastAdUrlToUse, video.id]);

  // 2. Handle In-Stream Ad Countdown - Ad MUST stay on screen until user clicks Skip Ad button
  useEffect(() => {
    setIsAdPlaying(true);
    setAdCountdown(5);
    setCanSkipAd(false);

    const timer = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 3) {
          setCanSkipAd(true);
        }
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkipAd(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [video.id]);

  // Attempt Ad Video Playback with Browser Autoplay Policy Guard
  useEffect(() => {
    if (isAdPlaying && adVideoRef.current && vastMediaUrl) {
      adVideoRef.current
        .play()
        .catch((err) => {
          console.warn('[In-Stream Ad] Autoplay blocked with audio, switching to muted:', err);
          if (adVideoRef.current) {
            adVideoRef.current.muted = true;
            setIsAdVideoMuted(true);
            adVideoRef.current.play().catch(() => {});
          }
        });
    }
  }, [isAdPlaying, vastMediaUrl]);

  const handleSkipAd = () => {
    setIsAdPlaying(false);
  };

  // Helper to extract clean embed URL from raw embed strings or <iframe> tags
  const extractEmbedUrl = (rawInput?: string): { cleanUrl: string; isDirectVideo: boolean } => {
    let raw = (rawInput || '').trim();
    let src = raw;
    if (src.startsWith('<iframe') || src.includes('src=')) {
      const match = src.match(/src=["']([^"']+)["']/);
      if (match && match[1]) {
        src = match[1];
      }
    }

    src = src.replace(/^["']|["']$/g, '').trim();

    if (src.startsWith('//')) {
      src = 'https:' + src;
    }

    const isDirectVideo =
      Boolean(src.match(/\.(mp4|webm|m3u8|mov|ogg)(\?.*)?$/i)) || src.startsWith('blob:');

    return { cleanUrl: src, isDirectVideo };
  };

  const mainSource = (video.embedUrl || '').trim() || (video.previewMp4Url || '').trim();
  const { cleanUrl, isDirectVideo } = extractEmbedUrl(mainSource);
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>(cleanUrl || '');

  useEffect(() => {
    const rawEmbed = (video.embedUrl || '').trim();
    const rawMp4 = (video.previewMp4Url || '').trim();

    if (rawEmbed) {
      const { cleanUrl: extractedCleanUrl, isDirectVideo: extractedIsDirect } = extractEmbedUrl(rawEmbed);
      if (extractedIsDirect) {
        setPlayerMode('video');
        setCurrentVideoSrc(extractedCleanUrl);
      } else {
        setPlayerMode('embed');
        setCurrentVideoSrc(extractedCleanUrl);
      }
    } else if (rawMp4) {
      const { cleanUrl: extractedCleanUrl } = extractEmbedUrl(rawMp4);
      setPlayerMode('video');
      setCurrentVideoSrc(extractedCleanUrl);
    } else {
      setPlayerMode('embed');
      setCurrentVideoSrc(cleanUrl);
    }
    setIsPlayingDirect(false);
  }, [video.id, video.embedUrl, video.previewMp4Url]);

  const handlePlayDirect = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => setIsPlayingDirect(true))
        .catch((err) => {
          console.warn('[FluidPlayerWrapper] Auto-play restricted by browser. Retrying muted playback:', err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().then(() => setIsPlayingDirect(true)).catch(() => {});
          }
        });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center group/player ${className}`}
    >
      {/* 1. In-Stream VAST Ad Overlay Stage */}
      {isAdPlaying ? (
        <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300">
          {/* Top Control Bar: Ad Badge + Countdown / Skip Ad Button */}
          <div className="absolute top-3 left-3 z-50 flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-wider rounded shadow-md">
              Ad
            </span>
            <span className="text-white/80 text-xs font-semibold hidden sm:inline">
              Sponsored In-Stream Announcement
            </span>
          </div>

          <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
            {!canSkipAd ? (
              <div className="px-3 py-1.5 bg-black/80 border border-white/20 text-white text-xs font-mono rounded-xl backdrop-blur-md shadow-lg">
                Skip Ad in {adCountdown}s
              </div>
            ) : (
              <button
                onClick={handleSkipAd}
                className="px-4 py-2 bg-[#e0358d] hover:bg-[#c9287a] text-white font-bold text-xs rounded-xl shadow-2xl transition-all flex items-center gap-1.5 cursor-pointer animate-pulse border border-white/20 active:scale-95"
              >
                <span>Skip Ad</span>
                <span className="material-symbols-outlined text-sm">skip_next</span>
              </button>
            )}
          </div>

          {/* Ad Media Content: Direct Media Video vs Frame Fallback */}
          {vastMediaUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={adVideoRef}
                src={vastMediaUrl}
                autoPlay
                loop
                playsInline
                controls={false}
                onClick={() => {
                  if (vastClickUrl) window.open(vastClickUrl, '_blank');
                }}
                className="w-full h-full object-contain cursor-pointer"
              />

              {/* Mobile Mute Indicator */}
              {isAdVideoMuted && (
                <button
                  onClick={() => {
                    if (adVideoRef.current) {
                      adVideoRef.current.muted = false;
                      setIsAdVideoMuted(false);
                    }
                  }}
                  className="absolute bottom-4 left-4 z-50 px-3 py-1.5 bg-black/80 text-white text-xs font-bold rounded-lg border border-white/20 flex items-center gap-1.5 backdrop-blur-md"
                >
                  <span className="material-symbols-outlined text-base">volume_off</span>
                  <span>Tap for Sound</span>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <iframe
                src={vastAdUrlToUse}
                title="In-Stream VAST Ad"
                className="w-full h-full border-none block bg-black"
                allow="autoplay; fullscreen"
              />
            </div>
          )}
        </div>
      ) : null}

      {/* 2. Main Embedded Video Player Stage */}
      {playerMode === 'video' ? (
        <div
          className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group/videostage cursor-pointer"
          onClick={handlePlayDirect}
        >
          <video
            ref={videoRef}
            src={currentVideoSrc}
            controls={true}
            autoPlay={autoPlay}
            playsInline
            poster={video.thumbnail}
            onEnded={onEnded}
            onPlay={() => setIsPlayingDirect(true)}
            onPause={() => setIsPlayingDirect(false)}
            onError={() => {
              console.warn('[FluidPlayerWrapper] Video stream load warning.');
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.duration && !isNaN(v.duration) && v.duration > 0) {
                const totalSec = Math.floor(v.duration);
                const hrs = Math.floor(totalSec / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;
                const formatted = hrs > 0 
                  ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                  : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                
                if (video.duration !== formatted) {
                  video.duration = formatted;
                  import('../services/videoService').then(({ videoService }) => {
                    videoService.updateVideo({ ...video, duration: formatted }).catch(() => {});
                  });
                }
              }
            }}
            className="w-full h-full object-contain block bg-black"
          />

          {/* Big Center Play Overlay Button on Mobile/Desktop if not yet playing */}
          {!isPlayingDirect && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handlePlayDirect();
              }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all hover:bg-black/30 cursor-pointer"
            >
              <button
                className="w-16 h-16 md:w-20 md:h-20 bg-[#e0358d] hover:bg-[#c9287a] text-white rounded-full flex items-center justify-center shadow-2xl shadow-[#e0358d]/50 transform hover:scale-110 active:scale-95 transition-all border-2 border-white/20"
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
      ) : (
        <div className="iframe-wrapper absolute top-0 left-0 w-full h-full bg-black overflow-hidden group/iframe">
          <iframe
            src={cleanUrl}
            title={video.title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; web-share"
            allowFullScreen
            loading="lazy"
            className="w-full h-full border-none block bg-black"
            style={{ border: 'none', width: '100%', height: '100%' }}
          />
        </div>
      )}
    </div>
  );
};

export default FluidPlayerWrapper;
