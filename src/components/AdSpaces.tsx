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

    try {
      if (containerRef.current) {
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
  };

  useEffect(() => {
    serveInterstitial();
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
 * Outstream Video Card Ad (Zone ID: 6003190)
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
      containerRef.current.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}37`;
      ins.setAttribute('data-zoneid', EXOCLICK_ZONES.OUTSTREAM_VIDEO);
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.margin = '0 auto';
      containerRef.current.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      adInjected.current = true;
    } catch (e) {
      console.warn('[ExoClick] Error serving outstream video ad:', e);
    }
  }, []);

  return (
    <div
      className={`group relative flex flex-col bg-[#141416] rounded-2xl border border-white/10 overflow-hidden shadow-lg p-2 transition-all hover:border-[#e0358d]/50 ${className}`}
    >
      {/* Top Card Header */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-1.5">
        <span className="bg-[#e0358d]/20 text-[#e0358d] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#e0358d]/30 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">campaign</span>
          <span>Sponsored</span>
        </span>
        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs text-[#e0358d]">play_circle</span>
          <span>Outstream Video</span>
        </span>
      </div>

      {/* Outstream Video Ad Container (Zone 6003190) */}
      <div
        ref={containerRef}
        className="w-full aspect-video bg-black/80 rounded-xl overflow-hidden flex items-center justify-center relative min-h-[170px]"
      />

      {/* Bottom info bar */}
      <div className="pt-2 px-1 flex items-center justify-between text-zinc-400">
        <span className="text-xs font-bold text-white truncate">Featured Sponsor Stream</span>
        <span className="text-[10px] text-zinc-500 font-mono">ExoClick Ad</span>
      </div>
    </div>
  );
};

/**
 * On-Stream In-Video Overlay Banner Ad (Zone ID: 6003184 / 6003172 with 5-Minute Auto-Reset Cycle)
 */
export const OnStreamVideoBanner: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  mountKey?: number;
}> = ({ isVisible, onClose, mountKey = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    try {
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
    } catch (e) {
      console.warn('[ExoClick] On-stream banner error:', e);
    }
  }, [isVisible, mountKey]);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-30 flex justify-center pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative bg-black/85 backdrop-blur-md rounded-xl p-1.5 border border-white/20 shadow-2xl flex items-center max-w-full overflow-hidden">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-1 -right-1 w-6 h-6 bg-zinc-800 hover:bg-rose-600 rounded-full flex items-center justify-center text-white text-xs border border-white/30 shadow-lg z-50 cursor-pointer transition-colors"
          title="Close Ad"
        >
          ✕
        </button>
        <div ref={containerRef} className="min-h-[50px] min-w-[280px] sm:min-w-[320px] overflow-hidden flex items-center justify-center" />
      </div>
    </div>
  );
};

export default AdBanner;
