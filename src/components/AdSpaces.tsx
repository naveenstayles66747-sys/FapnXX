import React, { useEffect, useRef, useState } from 'react';
import { AD_ZONES } from '../config/adConfig';
import { adManager, triggerInterstitial } from '../utils/adManager';

export { triggerInterstitial };

/**
 * Standard Native ExoClick Banner Slot
 */
export const AdBanner: React.FC<{ zoneId?: string; className?: string }> = ({
  zoneId = AD_ZONES.IN_PAGE_BANNER,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || el.dataset.adInitialized === 'true') return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}17`;
      ins.setAttribute('data-zoneid', zoneId || AD_ZONES.IN_PAGE_BANNER);
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      el.dataset.adInitialized = 'true';
    } catch (e) {
      console.warn('[ExoClick] AdBanner mount error:', e);
    }
  }, [zoneId]);

  return (
    <div
      ref={containerRef}
      className={`w-full flex items-center justify-center overflow-hidden my-2 min-h-[50px] ${className}`}
    />
  );
};

/**
 * Sticky Bottom Banner Ad (Desktop 728x90)
 * Note: Only active on desktop (hidden lg:flex) to prevent mobile layout breakage and bottom navigation overlap.
 */
export const StickyBottomLeaderboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (isDismissed || typeof window === 'undefined' || window.innerWidth < 1024) return;
    const el = containerRef.current;
    if (!el || el.dataset.adInitialized === 'true') return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}17`;
      ins.setAttribute('data-zoneid', AD_ZONES.DESKTOP_STICKY_LEADERBOARD);
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      el.dataset.adInitialized = 'true';
    } catch (e) {
      console.warn('[ExoClick] Sticky leaderboard error:', e);
    }
  }, [isDismissed]);

  if (isDismissed) return null;

  return (
    <aside
      id="exoclick-sticky-leaderboard"
      aria-label="Sponsored Advertisement"
      className="hidden lg:flex fixed bottom-0 left-64 right-0 z-[120] flex-col items-center justify-center pointer-events-auto bg-[#09090b]/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="relative w-full max-w-4xl flex items-center justify-center py-1">
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="absolute -top-3 right-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded-full w-5 h-5 flex items-center justify-center cursor-pointer border border-white/10 shadow z-10"
          title="Close advertisement"
        >
          ✕
        </button>
        <div
          ref={containerRef}
          className="w-full flex items-center justify-center overflow-hidden min-h-[50px]"
        />
      </div>
    </aside>
  );
};

/**
 * Desktop Fullpage Interstitial Ad (Zone ID: 6003174)
 * Official Native ExoClick Interstitial (Controlled by adManager)
 */
export const DesktopFullpageInterstitial: React.FC<{ onDismiss?: () => void }> = ({ onDismiss }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    const handleRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.target === 'desktop' && window.innerWidth >= 1024) {
        setIsActive(true);
      }
    };

    window.addEventListener('exoclick-interstitial-request', handleRequest);
    return () => window.removeEventListener('exoclick-interstitial-request', handleRequest);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}35`;
      ins.setAttribute('data-zoneid', AD_ZONES.DESKTOP_INTERSTITIAL);
      ins.style.display = 'block';
      el.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      // Acknowledge successful initialization to adManager
      adManager.commitInterstitialSuccess();
    } catch (e) {
      console.warn('[ExoClick] Desktop Interstitial mount error:', e);
      setIsActive(false);
      if (onDismiss) onDismiss();
    }
  }, [isActive, onDismiss]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      id="exoclick-desktop-interstitial"
      className="hidden lg:block z-[99999]"
      aria-label="Sponsored Interstitial"
    />
  );
};

/**
 * Mobile Fullpage Interstitial Ad (Zone ID: 6003180)
 * Official Native ExoClick Interstitial (Controlled by adManager)
 */
export const MobileFullpageInterstitial: React.FC<{ onDismiss?: () => void }> = ({ onDismiss }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState<boolean>(false);

  useEffect(() => {
    const handleRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.target === 'mobile' && window.innerWidth < 1024) {
        setIsActive(true);
      }
    };

    window.addEventListener('exoclick-interstitial-request', handleRequest);
    return () => window.removeEventListener('exoclick-interstitial-request', handleRequest);
  }, []);

  // Lock body scroll cleanly and restore exact previous overflow on cleanup
  useEffect(() => {
    if (!isActive) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const el = containerRef.current;
    if (el) {
      try {
        el.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = `eas${AD_ZONES.SITE_HASH}35`;
        ins.setAttribute('data-zoneid', AD_ZONES.MOBILE_INTERSTITIAL);
        ins.style.display = 'block';
        el.appendChild(ins);

        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });

        // Acknowledge successful initialization
        adManager.commitInterstitialSuccess();
      } catch (e) {
        console.warn('[ExoClick] Mobile Interstitial mount error:', e);
        setIsActive(false);
        if (onDismiss) onDismiss();
      }
    }

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isActive, onDismiss]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      id="exoclick-mobile-interstitial"
      className="block lg:hidden fixed inset-0 z-[99999] pointer-events-auto"
      aria-label="Sponsored Mobile Interstitial"
    />
  );
};

/**
 * Mobile Instant Message Ad (Zone ID: 6003178)
 */
export const MobileInstantMessage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
    const el = containerRef.current;
    if (!el || el.dataset.adInitialized === 'true') return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}14`;
      ins.setAttribute('data-zoneid', AD_ZONES.MOBILE_INSTANT_MESSAGE);
      el.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      el.dataset.adInitialized = 'true';
    } catch (e) {
      console.warn('[ExoClick] Mobile instant message error:', e);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      id="exoclick-mobile-instant-message"
      className="block lg:hidden fixed bottom-[72px] right-3 z-[60] pointer-events-auto pb-[env(safe-area-inset-bottom,0px)]"
    />
  );
};

/**
 * In-Feed Outstream Video Card Ad (Zone ID: 6003190)
 * Formatted identically to a standard VideoCard in the grid
 */
export const OutstreamVideoCardAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin: '300px' }
      );
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const el = containerRef.current;
    if (!el || el.dataset.adInitialized === 'true') return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}37`;
      ins.setAttribute('data-zoneid', AD_ZONES.OUTSTREAM_VIDEO);
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.height = '100%';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      el.dataset.adInitialized = 'true';
    } catch (e) {
      console.warn('[ExoClick] Outstream ad mount error:', e);
    }
  }, [isVisible]);

  return (
    <article
      className={`group flex flex-col w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300 ${className}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '240px' }}
      aria-label="Sponsored Video Advertisement"
    >
      {/* 16:9 Full-Width Thumbnail / Player Container matching VideoCard */}
      <div className="video-card-container relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/10 hover:border-rose-500/80 transition-colors duration-200 bg-[#09090b] flex items-center justify-center">
        {/* Outstream / Native In-Feed Ad Mount Container */}
        <div
          ref={containerRef}
          id="exoclick-outstream-zone-6003190"
          className="w-full h-full flex items-center justify-center overflow-hidden"
        />

        {/* Top-Right Badge: SPONSORED / AD */}
        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1 pointer-events-none">
          <span className="thumb-hd-badge bg-[#ec4899] text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md tracking-wide">
            AD
          </span>
        </div>

        {/* Bottom-Left Badge: SPONSORED */}
        <div className="thumb-duration-badge absolute bottom-2 left-2 bg-black/90 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-rose-400 z-20 shadow-md pointer-events-none">
          SPONSORED
        </div>
      </div>

      {/* Card Info Below Thumbnail matching VideoCard meta box */}
      <div className="video-card-meta-box pt-2 px-0.5 space-y-1">
        <h3 className="video-card-meta-title font-bold text-sm md:text-[15px] text-zinc-900 dark:text-white transition-colors line-clamp-2 leading-snug tracking-tight">
          Featured Partner Video
        </h3>

        {/* Stats Row */}
        <div className="video-card-stats-row flex items-center gap-3 sm:gap-3.5 text-[11px] sm:text-xs font-semibold text-[#334155] dark:text-zinc-300">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] sm:text-sm text-rose-500">verified</span>
            <span className="video-card-stat-value text-rose-500 font-bold">Promoted</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] sm:text-sm text-[#64748b] dark:text-zinc-400">hd</span>
            <span className="video-card-stat-value text-[#0f172a] dark:text-zinc-100 font-bold">1080p HD</span>
          </span>
        </div>
      </div>
    </article>
  );
};

export const InFeedAdCard = OutstreamVideoCardAd;

/**
 * On-Stream In-Video Player Overlay Banner (Zone ID: 6003172)
 * Positioned cleanly at bottom of player container, dismissible, non-intrusive.
 */
export const OnStreamVideoBanner: React.FC<{
  isVisible?: boolean;
  onClose?: () => void;
}> = ({ isVisible = false, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (!isVisible || dismissed) return;
    const el = containerRef.current;
    if (!el || el.dataset.adInitialized === 'true') return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}17`;
      ins.setAttribute('data-zoneid', AD_ZONES.ON_STREAM_VIDEO_BANNER);
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      el.dataset.adInitialized = 'true';
    } catch (e) {
      console.warn('[ExoClick] On-stream banner mount error:', e);
    }
  }, [isVisible, dismissed]);

  if (!isVisible || dismissed) return null;

  return (
    <div className="absolute bottom-12 left-0 right-0 z-20 flex items-center justify-center pointer-events-auto px-2">
      <div className="relative bg-black/80 backdrop-blur-sm p-1 rounded-lg border border-white/10 shadow-lg max-w-full overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            if (onClose) onClose();
          }}
          className="absolute -top-2 -right-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] border border-white/20 shadow cursor-pointer"
          title="Close overlay"
        >
          ✕
        </button>
        <div ref={containerRef} className="min-w-[300px] min-h-[50px] flex items-center justify-center" />
      </div>
    </div>
  );
};

export default AdBanner;
