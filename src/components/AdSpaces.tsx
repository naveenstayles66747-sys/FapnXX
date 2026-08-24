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
        ins.className = `eas${AD_ZONES.SITE_HASH}33`;
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
 * Clean native ExoClick Instant Message mount without artificial CSS interference
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
      className="block lg:hidden pointer-events-auto"
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

/**
 * Under-Player Banner Ad (Responsive: Desktop Zone 6010076 & Mobile Zone 6010078)
 * Positioned cleanly under the video player & action buttons.
 */
export const UnderPlayerBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile = window.innerWidth < 1024;
    const targetRef = isMobile ? mobileContainerRef : desktopContainerRef;
    const el = targetRef.current;
    if (!el || el.dataset.adInitialized === 'true') return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      if (isMobile) {
        ins.className = `eas${AD_ZONES.SITE_HASH}10`;
        ins.setAttribute('data-zoneid', AD_ZONES.MOBILE_UNDER_PLAYER);
      } else {
        ins.className = `eas${AD_ZONES.SITE_HASH}2`;
        ins.setAttribute('data-zoneid', AD_ZONES.DESKTOP_UNDER_PLAYER);
      }
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      el.dataset.adInitialized = 'true';
    } catch (e) {
      console.warn('[ExoClick] Under-Player banner error:', e);
    }
  }, []);

  return (
    <div className={`w-full my-4 flex flex-col items-center justify-center ${className}`}>
      {/* Desktop Under-Player Banner (Zone 6010076) */}
      <div
        ref={desktopContainerRef}
        id="exoclick-desktop-under-player"
        className="hidden lg:flex w-full items-center justify-center overflow-hidden min-h-[90px] rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30 p-2 shadow-sm"
      />

      {/* Mobile Under-Player Banner (Zone 6010078) */}
      <div
        ref={mobileContainerRef}
        id="exoclick-mobile-under-player"
        className="flex lg:hidden w-full items-center justify-center overflow-hidden min-h-[250px] rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30 p-2 shadow-sm"
      />
    </div>
  );
};

/**
 * Native Recommendation Ad Widget (Multi-device: Desktop, Tablet, Mobile — Zone ID: 6010176)
 * Class: eas6a97888e20
 * Formats responsive native thumbnail cards.
 */
export const NativeRecommendationAd: React.FC<{ className?: string; title?: string }> = ({
  className = '',
  title = 'Sponsored Recommendations',
}) => {
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
      ins.className = `eas${AD_ZONES.SITE_HASH}20`;
      ins.setAttribute('data-zoneid', AD_ZONES.NATIVE_RECOMMENDED);
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      el.dataset.adInitialized = 'true';
    } catch (e) {
      console.warn('[ExoClick] Native recommendation ad error:', e);
    }
  }, [isVisible]);

  return (
    <div className={`w-full my-6 p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-[#0f1523]/80 backdrop-blur-md shadow-sm ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-500 text-base">recommend</span>
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
            {title}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
          SPONSORED
        </span>
      </div>

      {/* Native Ad Mount Target */}
      <div
        ref={containerRef}
        id="exoclick-native-recommended-zone-6010176"
        className="w-full overflow-hidden min-h-[160px] flex items-center justify-center"
      />
    </div>
  );
};

/**
 * Global Popunder Ad Loader (Desktop Zone: 6010172 | Mobile Zone: 6010174)
 * Loads ExoClick popunder script with official capping & user-experience safety.
 */
export const PopunderAd: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scriptId = 'popmagicldr';
    if (document.getElementById(scriptId)) return;

    try {
      const isMobile = window.innerWidth < 1024;
      const zoneId = isMobile ? AD_ZONES.MOBILE_POPUNDER : AD_ZONES.DESKTOP_POPUNDER;

      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/javascript';
      script.async = true;
      script.src = 'https://a.pemsrv.com/popunder1000.js';
      script.setAttribute('data-exo-idzone', zoneId);
      script.setAttribute('data-exo-frequency_period', '180');
      script.setAttribute('data-exo-frequency_count', '1');
      script.setAttribute('data-exo-trigger_method', '3');
      script.setAttribute('data-exo-capping_enabled', 'true');
      script.setAttribute('data-exo-chrome_enabled', 'true');
      script.setAttribute('data-exo-syndication_host', 's.pemsrv.com');
      script.setAttribute('data-exo-ads_host', 'a.pemsrv.com');

      document.body.appendChild(script);
    } catch (e) {
      console.warn('[ExoClick] Popunder load error:', e);
    }
  }, []);

  return null;
};

export default AdBanner;
