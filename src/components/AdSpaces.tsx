import React, { useEffect, useRef, useState } from 'react';

// ExoClick Zone IDs Reference
export const EXOCLICK_ZONES = {
  STICKY_LEADERBOARD: '6003172',   // 728x90 Desktop / 300x50 Mobile
  DESKTOP_INTERSTITIAL: '6003174', // Fullpage Desktop Interstitial
  MOBILE_INTERSTITIAL: '6003180',  // Fullpage Mobile Interstitial
  MOBILE_INSTANT_MSG: '6003178',   // Mobile Instant Chat Message
  IN_STREAM_VAST: '6003184',       // VAST 2.0/3.0 In-Stream Video
  OUTSTREAM_VIDEO: '6003190',      // Outstream Feed Video Card
  SITE_HASH: '6a97888e',
};

// Global Interstitial Trigger Helper - non-blocking to protect INP performance
export const triggerInterstitial = () => {
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        window.dispatchEvent(new CustomEvent('exoclick-trigger-interstitial'));
      }, { timeout: 300 });
    } else {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('exoclick-trigger-interstitial'));
      }, 0);
    }
  }
};

interface AdBannerProps {
  position?: 'banner_top' | 'banner_bottom' | 'card_inline' | 'sidebar';
  zoneId?: string;
  className?: string;
}

/**
 * 100% Pure Zero-Wrapper Native ExoClick Banner Ad
 * Zero artificial badges, zero fake placeholders, zero border wrappers.
 */
export const AdBanner: React.FC<AdBannerProps> = ({
  position = 'banner_top',
  zoneId = EXOCLICK_ZONES.STICKY_LEADERBOARD,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adMounted = useRef(false);

  useEffect(() => {
    if (!containerRef.current || adMounted.current) return;

    try {
      containerRef.current.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}17`;
      ins.setAttribute('data-zoneid', zoneId || EXOCLICK_ZONES.STICKY_LEADERBOARD);
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      containerRef.current.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      adMounted.current = true;
    } catch (e) {
      console.warn('[ExoClick] AdBanner mount error:', e);
    }
  }, [zoneId]);

  return (
    <div
      ref={containerRef}
      className={`w-full flex items-center justify-center overflow-hidden my-2 ${className}`}
    />
  );
};

export const StickyBottomLeaderboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    // Strictly Desktop only (>= 1024px) to prevent duplicate triggers on mobile
    if (typeof window === 'undefined' || window.innerWidth < 1024 || adInjected.current) return;

    const inject = () => {
      try {
        if (containerRef.current && !adInjected.current) {
          containerRef.current.innerHTML = '';
          const ins = document.createElement('ins');
          ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}17`;
          ins.setAttribute('data-zoneid', EXOCLICK_ZONES.STICKY_LEADERBOARD);
          ins.style.display = 'block';
          ins.style.margin = '0 auto';
          containerRef.current.appendChild(ins);

          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });

          adInjected.current = true;
        }
      } catch (e) {
        console.warn('[ExoClick] Sticky leaderboard error:', e);
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(inject, { timeout: 1000 });
    } else {
      setTimeout(inject, 200);
    }
  }, []);

  return (
    <aside
      ref={containerRef}
      id="exoclick-sticky-leaderboard"
      aria-label="Sponsored Advertisement"
      className="hidden lg:flex fixed bottom-0 left-64 right-0 z-[120] justify-center items-center pointer-events-auto pb-1"
    />
  );
};

/**
 * Desktop Fullpage Interstitial (Zone ID: 6003174)
 * Tag:
 * <ins class="eas6a97888e35" data-zoneid="6003174"></ins>
 * <script>(AdProvider = window.AdProvider || []).push({"serve": {}});</script>
 */
export const DesktopFullpageInterstitial: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const serveInterstitial = () => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    setTimeout(() => {
      try {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          const ins = document.createElement('ins');
          ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}35`;
          ins.setAttribute('data-zoneid', EXOCLICK_ZONES.DESKTOP_INTERSTITIAL);
          ins.style.display = 'block';
          containerRef.current.appendChild(ins);

          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        }
      } catch (e) {
        console.warn('[ExoClick] Desktop Interstitial serve error:', e);
      }
    }, 100);
  };

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(serveInterstitial, { timeout: 2000 });
    } else {
      setTimeout(serveInterstitial, 500);
    }
  }, []);

  // Listen for video card or category clicks to trigger the fullpage interstitial on desktop
  useEffect(() => {
    const handleTrigger = () => {
      serveInterstitial();
    };

    window.addEventListener('exoclick-trigger-interstitial', handleTrigger);
    return () => window.removeEventListener('exoclick-trigger-interstitial', handleTrigger);
  }, []);

  return (
    <div
      ref={containerRef}
      id="exoclick-desktop-interstitial"
      className="hidden lg:block z-[99999]"
      aria-label="Sponsored Interstitial"
    />
  );
};

export const MobileFullpageInterstitial: React.FC = () => null;

/**
 * Mobile Instant Message Ad (Zone ID: 6003178)
 */
export const MobileInstantMessage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024 || adInjected.current) return;

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}14`;
        ins.setAttribute('data-zoneid', EXOCLICK_ZONES.MOBILE_INSTANT_MSG);
        containerRef.current.appendChild(ins);

        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });

        adInjected.current = true;
      }
    } catch (e) {
      console.warn('[ExoClick] Mobile instant message error:', e);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      id="exoclick-mobile-instant-message"
      className="block lg:hidden fixed bottom-16 right-3 z-[110] pointer-events-auto"
    />
  );
};

/**
 * Outstream In-Feed Video Card Ad (Zone ID: 6003190)
 * Exact dimensions and layout matching regular VideoCard (16:9 aspect ratio, non-floating, in-grid placement)
 * Exact Tag:
 * <ins class="eas6a97888e37" data-zoneid="6003190"></ins>
 * <script>(AdProvider = window.AdProvider || []).push({"serve": {}});</script>
 */
export const OutstreamVideoCardAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || adInjected.current || !containerRef.current) return;

    try {
      if (containerRef.current && !adInjected.current) {
        containerRef.current.innerHTML = '';

        // 1. Create exact ExoClick <ins> element
        const ins = document.createElement('ins');
        ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}37`;
        ins.setAttribute('data-zoneid', EXOCLICK_ZONES.OUTSTREAM_VIDEO);
        ins.style.display = 'block';
        ins.style.width = '100%';
        ins.style.height = '100%';
        ins.style.minHeight = '180px';
        ins.style.margin = '0 auto';
        containerRef.current.appendChild(ins);

        // 2. Inject script execution tag directly into container
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.text = '(AdProvider = window.AdProvider || []).push({"serve": {}});';
        containerRef.current.appendChild(script);

        // 3. Also push to window.AdProvider queue
        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });

        adInjected.current = true;
      }
    } catch (e) {
      console.warn('[ExoClick] Error serving outstream video ad:', e);
    }
  }, []);

  return (
    <article
      className={`group flex flex-col w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* 16:9 Full-Width Container matching regular VideoCard */}
      <div className="video-card-container relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/10 hover:border-rose-500/80 transition-colors duration-200 bg-[#09090b] flex items-center justify-center min-h-[180px] sm:min-h-[220px]">
        {/* Top-Left: Sponsored Badge */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 pointer-events-none">
          <span className="bg-[#ec4899] text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
            <span className="material-symbols-outlined text-[11px]">campaign</span>
            <span>Sponsored</span>
          </span>
        </div>

        {/* Top-Right: HD Badge */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 pointer-events-none">
          <span className="thumb-hd-badge bg-black/85 text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md tracking-wide">
            HD
          </span>
        </div>

        {/* Outstream Video Ad Container (Zone 6003190) */}
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center relative overflow-hidden min-h-[180px]"
        />
      </div>

      {/* Card Info Below matching regular VideoCard */}
      <div className="video-card-meta-box pt-2 px-0.5 space-y-1">
        <h3 className="video-card-meta-title font-bold text-sm md:text-[15px] text-zinc-900 dark:text-white transition-colors line-clamp-1 leading-snug tracking-tight">
          Featured Stream & Partner Discovery
        </h3>

        <div className="video-card-stats-row flex items-center gap-3 sm:gap-3.5 text-[11px] sm:text-xs font-semibold text-[#334155] dark:text-zinc-300">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] sm:text-sm text-[#e0358d]">play_circle</span>
            <span className="video-card-stat-value text-[#0f172a] dark:text-zinc-100 font-bold">Outstream Video</span>
          </span>
          <span>•</span>
          <span className="text-[10px] text-zinc-500 font-mono">ExoClick Partner</span>
        </div>
      </div>
    </article>
  );
};

// InFeedAdCard alias for clean modular usage
export const InFeedAdCard = OutstreamVideoCardAd;

/**
 * On-Stream In-Video Overlay Banner Ad - Disabled to keep video player 100% unobstructed
 */
export const OnStreamVideoBanner: React.FC<{
  isVisible?: boolean;
  onClose?: () => void;
  mountKey?: number;
}> = () => null;

export default AdBanner;
