import React, { useState, useEffect, useRef } from 'react';
import { Video } from '../types';
import { videoService } from '../services/videoService';
import { AD_CONFIG } from '../config/adConfig';
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
  const [playerMode, setPlayerMode] = useState<'embed' | 'video'>('embed');
  const [currentVideoSrc, setCurrentVideoSrc] = useState<string>('');
  const [videoMountKey, setVideoMountKey] = useState<number>(0);

  // VAST In-Stream Video Ad State
  const [activeVastAd, setActiveVastAd] = useState<VastAd | null>(null);
  const [isVastPlaying, setIsVastPlaying] = useState<boolean>(false);
  const [adCurrentTime, setAdCurrentTime] = useState<number>(0);
  const [adDuration, setAdDuration] = useState<number>(15);
  const [isAdMuted, setIsAdMuted] = useState<boolean>(true);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const quartilesRef = useRef<{ q1: boolean; q2: boolean; q3: boolean; imp: boolean }>({
    q1: false,
    q2: false,
    q3: false,
    imp: false,
  });

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

  // ── Effect: Resolve video stream source and fetch genuine VAST Ad ─────────
  useEffect(() => {
    setVideoMountKey((k) => k + 1);
    setIsVastPlaying(false);
    setActiveVastAd(null);
    setAdCurrentTime(0);
    quartilesRef.current = { q1: false, q2: false, q3: false, imp: false };

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

    // Check VAST tag in background (Zero blocking: if empty/null, main video plays immediately)
    let isCancelled = false;
    if (AD_CONFIG.VAST_TAG_URL) {
      fetchVastAd(AD_CONFIG.VAST_TAG_URL, 1800).then((ad) => {
        if (!isCancelled && ad && ad.mediaUrl) {
          setActiveVastAd(ad);
          setAdDuration(ad.durationSeconds || 15);
          setIsVastPlaying(true);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [video.id, video.embedUrl, video.previewMp4Url]);

  // ── Ad Lifecycle Helpers ────────────────────────────────────────────────
  const handleAdPlay = () => {
    if (!activeVastAd) return;
    if (!quartilesRef.current.imp) {
      quartilesRef.current.imp = true;
      fireTrackingPixel(activeVastAd.impressionUrls);
      if (activeVastAd.trackingEvents.start) {
        fireTrackingPixel(activeVastAd.trackingEvents.start);
      }
    }
  };

  const handleAdTimeUpdate = () => {
    const el = adVideoRef.current;
    if (!el || !activeVastAd) return;

    const current = el.currentTime;
    const dur = el.duration || adDuration || 15;
    setAdCurrentTime(current);

    // Track Quartiles
    if (!quartilesRef.current.q1 && current >= dur * 0.25) {
      quartilesRef.current.q1 = true;
      if (activeVastAd.trackingEvents.firstQuartile) {
        fireTrackingPixel(activeVastAd.trackingEvents.firstQuartile);
      }
    }
    if (!quartilesRef.current.q2 && current >= dur * 0.5) {
      quartilesRef.current.q2 = true;
      if (activeVastAd.trackingEvents.midpoint) {
        fireTrackingPixel(activeVastAd.trackingEvents.midpoint);
      }
    }
    if (!quartilesRef.current.q3 && current >= dur * 0.75) {
      quartilesRef.current.q3 = true;
      if (activeVastAd.trackingEvents.thirdQuartile) {
        fireTrackingPixel(activeVastAd.trackingEvents.thirdQuartile);
      }
    }
  };

  const handleFinishAd = (reason: 'completed' | 'skipped') => {
    if (activeVastAd) {
      if (reason === 'completed' && activeVastAd.trackingEvents.complete) {
        fireTrackingPixel(activeVastAd.trackingEvents.complete);
      } else if (reason === 'skipped' && activeVastAd.trackingEvents.skip) {
        fireTrackingPixel(activeVastAd.trackingEvents.skip);
      }
    }
    setIsVastPlaying(false);
    setActiveVastAd(null);
  };

  const handleSponsorClick = () => {
    if (!activeVastAd || !activeVastAd.clickThroughUrl) return;
    fireTrackingPixel(activeVastAd.clickTrackingUrls);
    window.open(activeVastAd.clickThroughUrl, '_blank', 'noopener,noreferrer');
  };

  const canSkipAd = activeVastAd ? adCurrentTime >= (activeVastAd.skipOffsetSeconds || 5) : false;
  const skipCountdown = activeVastAd ? Math.max(0, Math.ceil((activeVastAd.skipOffsetSeconds || 5) - adCurrentTime)) : 0;

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none ${className}`}>
      {/* ── STAGE 1: Genuine VAST In-Stream Video Ad Layer (Active ONLY when real ad MP4 is present) ── */}
      {isVastPlaying && activeVastAd && (
        <div className="absolute inset-0 z-30 w-full h-full bg-black flex items-center justify-center">
          <video
            ref={adVideoRef}
            key={`vast-ad-${videoMountKey}`}
            src={activeVastAd.mediaUrl}
            autoPlay
            playsInline
            muted={isAdMuted}
            onPlay={handleAdPlay}
            onTimeUpdate={handleAdTimeUpdate}
            onEnded={() => handleFinishAd('completed')}
            onError={() => handleFinishAd('completed')}
            className="w-full h-full object-contain block bg-black cursor-pointer"
            onClick={handleSponsorClick}
          />

          {/* Ad Top Bar (Sponsor Info & Sound Toggle) */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-40 pointer-events-auto">
            {/* Left Sponsor Badge + Direct Clickable CTA Button */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-amber-500 text-black font-black text-[11px] uppercase tracking-wider shadow-md">
                Ad
              </span>
              {activeVastAd.clickThroughUrl && (
                <button
                  type="button"
                  onClick={handleSponsorClick}
                  className="px-3 py-1 rounded-lg bg-black/80 hover:bg-[#ec4899] text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md border border-white/20 shadow-lg cursor-pointer active:scale-95"
                >
                  <span>{activeVastAd.ctaText || 'Visit Sponsor'}</span>
                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                </button>
              )}
            </div>

            {/* Right Mute/Unmute Audio Toggle */}
            <button
              type="button"
              onClick={() => setIsAdMuted(!isAdMuted)}
              className="w-8 h-8 rounded-full bg-black/80 hover:bg-white/20 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/20 shadow-lg cursor-pointer"
              title={isAdMuted ? 'Unmute ad audio' : 'Mute ad audio'}
            >
              <span className="material-symbols-outlined text-sm">
                {isAdMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>
          </div>

          {/* Bottom Right Realtime Skip Controller */}
          <div className="absolute bottom-4 right-4 z-40 pointer-events-auto">
            {canSkipAd ? (
              <button
                type="button"
                onClick={() => handleFinishAd('skipped')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-2xl active:scale-95 transition-all cursor-pointer border border-white/30"
              >
                <span>Skip Ad</span>
                <span className="material-symbols-outlined text-sm">skip_next</span>
              </button>
            ) : (
              <div className="px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white/90 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Skip in {skipCountdown}s</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STAGE 2: Main Video Player (Streamtape / Embed or Direct MP4) ── */}
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
            id={`direct-player-${video.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`}
            src={currentVideoSrc}
            controls
            autoPlay={autoPlay && !isVastPlaying}
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
