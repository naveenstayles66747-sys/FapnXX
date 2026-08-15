import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { videoService } from '../services/videoService';

interface FluidPlayerWrapperProps {
  video: Video;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
}

// Default in-stream VAST Tag URL
const DEFAULT_IN_STREAM_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idz=6000128';

export const FluidPlayerWrapper: React.FC<FluidPlayerWrapperProps> = ({
  video,
  autoPlay = true,
  onEnded,
  className = '',
}) => {
  // adPhase: 'loading' = VAST fetching, 'playing' = ad on screen, 'done' = show video
  const [adPhase, setAdPhase] = useState<'loading' | 'playing' | 'done'>('loading');
  const [adCountdown, setAdCountdown] = useState<number>(5);
  const [canSkipAd, setCanSkipAd] = useState<boolean>(false);
  const [vastMediaUrl, setVastMediaUrl] = useState<string | null>(null);
  const [vastClickUrl, setVastClickUrl] = useState<string | null>(null);
  const [isAdVideoMuted, setIsAdVideoMuted] = useState<boolean>(false);

  const adVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [isPlayingDirect, setIsPlayingDirect] = useState<boolean>(false);
  // Key to force remount of video/iframe after ad ends
  const [videoMountKey, setVideoMountKey] = useState<number>(0);

  const vastAdUrlToUse = video.vastAdTagUrl?.trim() || DEFAULT_IN_STREAM_VAST_URL;

  // ── Helper: extract clean embed URL ──────────────────────────────────────
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

  // ── Effect 1: Reset everything when video changes ─────────────────────────
  useEffect(() => {
    setAdPhase('loading');
    setAdCountdown(5);
    setCanSkipAd(false);
    setVastMediaUrl(null);
    setVastClickUrl(null);
    setIsAdVideoMuted(false);
    setIsPlayingDirect(false);
    setVideoMountKey((k) => k + 1);

    // Resolve player source
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

  // ── Effect 2: Fetch VAST → transition 'loading' → 'playing' (or skip) ────
  useEffect(() => {
    let isMounted = true;

    const parseVast = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s hard timeout

        const response = await fetch(vastAdUrlToUse, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('VAST fetch failed');
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
          setAdPhase('playing');
        }
      } catch {
        // VAST failed / timed out → skip ad, go straight to video
        if (isMounted) setAdPhase('done');
      }
    };

    parseVast();
    return () => { isMounted = false; };
  }, [video.id, vastAdUrlToUse]);

  // ── Effect 3: Ad countdown — full 5 seconds required before skip ─────────────────────────
  useEffect(() => {
    if (adPhase !== 'playing') return;

    setAdCountdown(5);
    setCanSkipAd(false);

    const timer = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkipAd(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [adPhase, video.id]);

  // ── Effect 4: Auto-play ad video with mobile autoplay policy guard ────────
  useEffect(() => {
    if (adPhase === 'playing' && adVideoRef.current && vastMediaUrl) {
      adVideoRef.current.play().catch(() => {
        if (adVideoRef.current) {
          adVideoRef.current.muted = true;
          setIsAdVideoMuted(true);
          adVideoRef.current.play().catch(() => {});
        }
      });
    }
  }, [adPhase, vastMediaUrl]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSkipAd = () => setAdPhase('done');

  const handlePlayDirect = () => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPlayingDirect(true))
        .catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().then(() => setIsPlayingDirect(true)).catch(() => {});
          }
        });
    }
  };

  const isAdActive = adPhase === 'loading' || adPhase === 'playing';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center group/player ${className}`}
    >
      {/* ── AD PHASE OVERLAY (loading spinner OR ad video) ── */}
      {isAdActive && (
        <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center overflow-hidden">
          {adPhase === 'loading' ? (
            // Spinner while VAST XML is being fetched
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-white/20 border-t-[#e0358d] rounded-full animate-spin" />
              <span className="text-white/50 text-xs font-medium tracking-wider">Loading...</span>
            </div>
          ) : (
            // Ad is ready and playing
            <>
              {/* Top-left: Ad badge */}
              <div className="absolute top-3 left-3 z-50 flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-wider rounded shadow-md">
                  Ad
                </span>
              </div>

              {/* Top-right: Countdown / Skip button */}
              <div className="absolute top-3 right-3 z-50">
                {!canSkipAd ? (
                  <div className="px-3 py-1.5 bg-black/80 border border-white/20 text-white text-xs font-mono rounded-xl backdrop-blur-md">
                    Skip in {adCountdown}s
                  </div>
                ) : (
                  <button
                    onClick={handleSkipAd}
                    className="px-4 py-2 bg-[#e0358d] hover:bg-[#c9287a] text-white font-bold text-xs rounded-xl shadow-2xl transition-all flex items-center gap-1.5 cursor-pointer border border-white/20 active:scale-95"
                  >
                    <span>Skip Ad</span>
                    <span className="material-symbols-outlined text-sm">skip_next</span>
                  </button>
                )}
              </div>

              {/* Ad Content */}
              {vastMediaUrl ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    ref={adVideoRef}
                    src={vastMediaUrl}
                    autoPlay
                    loop
                    playsInline
                    controls={false}
                    onClick={() => { if (vastClickUrl) window.open(vastClickUrl, '_blank'); }}
                    className="w-full h-full object-contain cursor-pointer"
                  />
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
                // Fallback: render VAST url in iframe if media URL not extracted
                <div className="w-full h-full">
                  <iframe
                    src={vastAdUrlToUse}
                    title="Ad"
                    className="w-full h-full border-none block bg-black"
                    allow="autoplay; fullscreen"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MAIN VIDEO PLAYER — only mounted AFTER ad phase is 'done' ── */}
      {adPhase === 'done' && (
        playerMode === 'video' ? (
          <div
            className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group/videostage cursor-pointer"
            onClick={handlePlayDirect}
          >
            <video
              key={videoMountKey}
              ref={videoRef}
              src={currentVideoSrc}
              controls
              autoPlay={autoPlay}
              playsInline
              poster={video.thumbnail}
              onEnded={onEnded}
              onPlay={() => setIsPlayingDirect(true)}
              onPause={() => setIsPlayingDirect(false)}
              onError={() => console.warn('[FluidPlayer] Stream load warning.')}
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
                    videoService.updateVideo({ ...video, duration: formatted }).catch(() => {});
                  }
                }
              }}
              className="w-full h-full object-contain block bg-black"
            />

            {/* Play overlay — only when paused */}
            {!isPlayingDirect && (
              <div
                onClick={(e) => { e.stopPropagation(); handlePlayDirect(); }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer"
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
          // Embed / iframe player
          <div className="absolute top-0 left-0 w-full h-full bg-black overflow-hidden">
            <iframe
              key={videoMountKey}
              src={currentVideoSrc}
              title={video.title}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; web-share; xr-spatial-tracking"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              scrolling="no"
              frameBorder={0}
              className="w-full h-full border-none block bg-black"
              style={{ border: 'none', width: '100%', height: '100%', display: 'block' }}
              onLoad={(e) => {
                // Ensure iframe is fully visible after load
                const frame = e.currentTarget;
                frame.style.opacity = '1';
              }}
            />
          </div>
        )
      )}
    </div>
  );
};

export default FluidPlayerWrapper;
