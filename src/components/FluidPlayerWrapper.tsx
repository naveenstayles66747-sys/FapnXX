import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { videoService } from '../services/videoService';
import { OnStreamVideoBanner } from './AdSpaces';

interface FluidPlayerWrapperProps {
  video: Video;
  autoPlay?: boolean;
  onEnded?: () => void;
  className?: string;
}

// Default in-stream VAST Tag URL (ExoClick In-Stream Video Ad Zone ID: 6003184)
const DEFAULT_IN_STREAM_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idz=6003184';

// High-converting fallback pre-roll video when ad network returns a wrapper or geo zero-fill
const FALLBACK_AD_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
const FALLBACK_AD_CLICK_URL = 'https://fapnxx.com/vip-cams';

export const FluidPlayerWrapper: React.FC<FluidPlayerWrapperProps> = ({
  video,
  autoPlay = true,
  onEnded,
  className = '',
}) => {
  // adPhase: 'playing' = ad video on screen, 'done' = ad skipped/ended -> show main video
  const [adPhase, setAdPhase] = useState<'playing' | 'done'>('playing');
  const [adCountdown, setAdCountdown] = useState<number>(5);
  const [canSkipAd, setCanSkipAd] = useState<boolean>(false);
  const [vastMediaUrl, setVastMediaUrl] = useState<string>(FALLBACK_AD_VIDEO_URL);
  const [vastClickUrl, setVastClickUrl] = useState<string>(FALLBACK_AD_CLICK_URL);
  const [isAdVideoMuted, setIsAdVideoMuted] = useState<boolean>(false);

  // Impression & Quartile tracking beacons
  const impressionUrlsRef = useRef<string[]>([]);
  const clickTrackingUrlsRef = useRef<string[]>([]);
  const trackingEventsRef = useRef<Record<string, string[]>>({});
  const firedEventsRef = useRef<Set<string>>(new Set());

  // On-Stream In-Video Banner state
  const [showOnStreamBanner, setShowOnStreamBanner] = useState<boolean>(false);
  const [onStreamBannerDismissed, setOnStreamBannerDismissed] = useState<boolean>(false);

  const adVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [isPlayingDirect, setIsPlayingDirect] = useState<boolean>(false);
  const [videoMountKey, setVideoMountKey] = useState<number>(0);

  const vastAdUrlToUse = video.vastAdTagUrl?.trim() || DEFAULT_IN_STREAM_VAST_URL;

  // ── Helper: Fire tracking beacons to ExoClick ─────────────────────────────
  const fireBeacon = (url: string) => {
    if (!url || typeof window === 'undefined') return;
    try {
      const img = new Image();
      img.src = url;
    } catch {
      try {
        fetch(url, { mode: 'no-cors' }).catch(() => {});
      } catch {}
    }
  };

  const fireTrackingEvent = (eventName: string) => {
    if (firedEventsRef.current.has(eventName)) return;
    firedEventsRef.current.add(eventName);

    const urls = trackingEventsRef.current[eventName.toLowerCase()] || [];
    urls.forEach(fireBeacon);
  };

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

  // ── Effect 1: Reset & Start Ad Phase when video changes ───────────────────
  useEffect(() => {
    setAdPhase('playing');
    setAdCountdown(5);
    setCanSkipAd(false);
    setVastMediaUrl(FALLBACK_AD_VIDEO_URL);
    setVastClickUrl(FALLBACK_AD_CLICK_URL);
    setIsAdVideoMuted(false);
    setIsPlayingDirect(false);
    setShowOnStreamBanner(false);
    setOnStreamBannerDismissed(false);
    impressionUrlsRef.current = [];
    clickTrackingUrlsRef.current = [];
    trackingEventsRef.current = {};
    firedEventsRef.current.clear();
    setVideoMountKey((k) => k + 1);

    // Resolve main player source
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

  // ── Effect 2: Parse VAST XML (Direct & Server Proxy) ─────────────────────
  useEffect(() => {
    let isMounted = true;

    const parseXmlForVast = (xmlText: string) => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'text/xml');

      // 1. Extract MediaFile
      const mediaFiles = xml.getElementsByTagName('MediaFile');
      let extractedMedia: string | null = null;
      for (let i = 0; i < mediaFiles.length; i++) {
        const text = mediaFiles[i].textContent?.trim();
        if (text && (text.includes('.mp4') || text.includes('.webm') || text.startsWith('http'))) {
          extractedMedia = text;
          break;
        }
      }

      // 2. Extract VASTAdTagURI (Wrapper)
      const wrappers = xml.getElementsByTagName('VASTAdTagURI');
      let wrapperUrl: string | null = null;
      if (wrappers.length > 0 && wrappers[0].textContent) {
        wrapperUrl = wrappers[0].textContent.trim();
      }

      // 3. Extract ClickThrough
      const clickThroughs = xml.getElementsByTagName('ClickThrough');
      let extractedClick: string | null = null;
      if (clickThroughs.length > 0 && clickThroughs[0].textContent) {
        extractedClick = clickThroughs[0].textContent.trim();
      }

      // 4. Extract ClickTracking
      const clickTrackings = xml.getElementsByTagName('ClickTracking');
      const clickTrackUrls: string[] = [];
      for (let i = 0; i < clickTrackings.length; i++) {
        const text = clickTrackings[i].textContent?.trim();
        if (text && text.startsWith('http')) clickTrackUrls.push(text);
      }

      // 5. Extract Impressions
      const impressions = xml.getElementsByTagName('Impression');
      const impUrls: string[] = [];
      for (let i = 0; i < impressions.length; i++) {
        const text = impressions[i].textContent?.trim();
        if (text && text.startsWith('http')) impUrls.push(text);
      }

      // 6. Extract Tracking Events
      const trackings = xml.getElementsByTagName('Tracking');
      const trackMap: Record<string, string[]> = {};
      for (let i = 0; i < trackings.length; i++) {
        const eventName = trackings[i].getAttribute('event')?.toLowerCase();
        const text = trackings[i].textContent?.trim();
        if (eventName && text) {
          if (!trackMap[eventName]) trackMap[eventName] = [];
          trackMap[eventName].push(text);
        }
      }

      return {
        mediaUrl: extractedMedia,
        wrapperUrl,
        clickUrl: extractedClick || wrapperUrl,
        clickTracking: clickTrackUrls,
        impressions: impUrls,
        tracking: trackMap,
      };
    };

    const fetchAndParseVast = async () => {
      try {
        let foundMedia: string | null = null;
        let foundClick: string | null = null;
        let foundImps: string[] = [];
        let foundClickTracking: string[] = [];
        let foundTracking: Record<string, string[]> = {};

        // Step A: Direct fetch attempt
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const response = await fetch(vastAdUrlToUse, {
            signal: controller.signal,
            headers: { Accept: 'application/xml, text/xml, */*' },
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const xmlText = await response.text();
            const parsed = parseXmlForVast(xmlText);
            if (parsed.mediaUrl) foundMedia = parsed.mediaUrl;
            if (parsed.clickUrl) foundClick = parsed.clickUrl;
            if (parsed.impressions.length > 0) foundImps = parsed.impressions;
            if (parsed.clickTracking.length > 0) foundClickTracking = parsed.clickTracking;
            foundTracking = parsed.tracking;
          }
        } catch {
          // Direct fetch failed
        }

        // Step B: Backend Proxy fallback
        if (!foundMedia || foundImps.length === 0) {
          try {
            const proxyRes = await fetch(`/api/v1/ads/vast-proxy?url=${encodeURIComponent(vastAdUrlToUse)}`);
            if (proxyRes.ok) {
              const resJson = await proxyRes.json();
              if (resJson?.data) {
                if (resJson.data.mediaUrl) foundMedia = resJson.data.mediaUrl;
                if (resJson.data.clickThrough) foundClick = resJson.data.clickThrough;
                if (resJson.data.impressions) foundImps = resJson.data.impressions;
                if (resJson.data.clickTracking) foundClickTracking = resJson.data.clickTracking;
                if (resJson.data.tracking) foundTracking = resJson.data.tracking;
              }
            }
          } catch {
            // Static dev fallback
          }
        }

        if (isMounted) {
          if (foundMedia) setVastMediaUrl(foundMedia);
          if (foundClick) setVastClickUrl(foundClick);
          impressionUrlsRef.current = foundImps;
          clickTrackingUrlsRef.current = foundClickTracking;
          trackingEventsRef.current = foundTracking;

          // Fire impression beacons to ExoClick immediately
          foundImps.forEach(fireBeacon);
          fireTrackingEvent('start');
        }
      } catch {
        // Fallback video already playing
      }
    };

    fetchAndParseVast();
    return () => {
      isMounted = false;
    };
  }, [video.id, vastAdUrlToUse]);

  // ── Effect 3: 5-Second Ad Countdown ───────────────────────────────────────
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

  // ── Effect 4: Autoplay Ad Video ───────────────────────────────────────────
  useEffect(() => {
    if (adPhase === 'playing' && adVideoRef.current) {
      adVideoRef.current.play().catch(() => {
        if (adVideoRef.current) {
          adVideoRef.current.muted = true;
          setIsAdVideoMuted(true);
          adVideoRef.current.play().catch(() => {});
        }
      });
    }
  }, [adPhase, vastMediaUrl]);

  // ── Effect 5: On-Stream Banner Timer (4s into Main Video) ──────────────────
  useEffect(() => {
    if (adPhase !== 'done' || onStreamBannerDismissed) return;

    const bannerTimer = setTimeout(() => {
      setShowOnStreamBanner(true);
    }, 4000);

    return () => clearTimeout(bannerTimer);
  }, [adPhase, onStreamBannerDismissed, video.id]);

  // ── Quartile Tracking on Ad Time Update ────────────────────────────────────
  const handleAdTimeUpdate = () => {
    if (!adVideoRef.current) return;
    const v = adVideoRef.current;
    if (v.duration && v.duration > 0) {
      const progress = v.currentTime / v.duration;
      if (progress >= 0.25) fireTrackingEvent('firstquartile');
      if (progress >= 0.50) fireTrackingEvent('midpoint');
      if (progress >= 0.75) fireTrackingEvent('thirdquartile');
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSkipAd = () => {
    fireTrackingEvent('skip');
    setAdPhase('done');
  };

  const handleAdClick = () => {
    fireTrackingEvent('click');
    clickTrackingUrlsRef.current.forEach(fireBeacon);
    if (vastClickUrl) {
      window.open(vastClickUrl, '_blank', 'noopener,noreferrer');
    }
  };

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
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center group/player select-none ${className}`}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          STAGE 1: PRE-ROLL VAST AD PLAYER (Plays FIRST on card click)
          ═══════════════════════════════════════════════════════════════════════ */}
      {adPhase === 'playing' && (
        <div className="absolute inset-0 z-40 bg-black flex items-center justify-center overflow-hidden">
          {/* Ad Header Badge */}
          <div className="absolute top-3 left-3 z-50 flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-wider rounded shadow-md flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">campaign</span>
              <span>Advertisement</span>
            </span>
            <span className="text-white/80 text-xs font-semibold bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm hidden sm:inline">
              Video will play after ad
            </span>
          </div>

          {/* Skip / Countdown Button */}
          <div className="absolute top-3 right-3 z-50">
            {canSkipAd ? (
              <button
                type="button"
                onClick={handleSkipAd}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-1 cursor-pointer active:scale-95 border border-white/20"
              >
                <span>Skip Ad</span>
                <span className="material-symbols-outlined text-sm">skip_next</span>
              </button>
            ) : (
              <div className="px-3 py-1 bg-black/80 text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Skip in {adCountdown}s</span>
              </div>
            )}
          </div>

          {/* Ad Video Element */}
          <video
            ref={adVideoRef}
            src={vastMediaUrl}
            autoPlay
            playsInline
            controls={false}
            onTimeUpdate={handleAdTimeUpdate}
            onEnded={() => {
              fireTrackingEvent('complete');
              setAdPhase('done');
            }}
            onClick={handleAdClick}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Sound Toggle Overlay */}
          {isAdVideoMuted && (
            <button
              type="button"
              onClick={() => {
                if (adVideoRef.current) {
                  adVideoRef.current.muted = false;
                  setIsAdVideoMuted(false);
                }
              }}
              className="absolute bottom-4 left-4 z-50 px-3 py-1.5 bg-black/80 hover:bg-rose-600 text-white text-xs font-bold rounded-lg border border-white/20 flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-base">volume_off</span>
              <span>Tap for Sound</span>
            </button>
          )}

          {/* Click to Visit Sponsor CTA Button */}
          <button
            type="button"
            onClick={handleAdClick}
            className="absolute bottom-4 right-4 z-50 px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-extrabold rounded-lg shadow-lg flex items-center gap-1 cursor-pointer transition-all border border-white/20"
          >
            <span>Visit Sponsor</span>
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STAGE 2: MAIN VIDEO / IFRAME PLAYER (Mounts ONLY after Ad is done/skipped)
          ═══════════════════════════════════════════════════════════════════════ */}
      {adPhase === 'done' && (
        <>
          {playerMode === 'video' ? (
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
                onPause={() => {
                  setIsPlayingDirect(false);
                  if (!onStreamBannerDismissed) setShowOnStreamBanner(true);
                }}
                onError={() => console.warn('[FluidPlayer] Stream load warning.')}
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

              {/* Play overlay — only when paused */}
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
          ) : (
            // Embed / iframe player (e.g. SpankBang, RedPorn, XVideos, etc.)
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
                  const frame = e.currentTarget;
                  frame.style.opacity = '1';
                }}
              />
            </div>
          )}

          {/* ── On-Stream In-Video Overlay Banner ("on strem ad") ── */}
          <OnStreamVideoBanner
            isVisible={showOnStreamBanner && !onStreamBannerDismissed}
            onClose={() => {
              setShowOnStreamBanner(false);
              setOnStreamBannerDismissed(true);
            }}
            title="🔥 Private 4K Cam Shows & Uncut Video Access"
            targetUrl="https://fapnxx.com/vip-cams"
          />
        </>
      )}
    </div>
  );
};

export default FluidPlayerWrapper;
