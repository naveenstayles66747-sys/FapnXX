import React, { useEffect, useRef, useState, useCallback } from 'react';
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
 */
export const DesktopFullpageInterstitial: React.FC<{ onDismiss?: () => void }> = ({ onDismiss }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState<boolean>(false);

  const handleDismiss = useCallback(() => {
    setIsActive(false);
    if (onDismiss) onDismiss();
  }, [onDismiss]);

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

    let timeoutTimer: NodeJS.Timeout | null = null;

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

      adManager.commitInterstitialSuccess();

      timeoutTimer = setTimeout(() => {
        handleDismiss();
      }, 4000);
    } catch (e) {
      console.warn('[ExoClick] Desktop Interstitial mount error:', e);
      handleDismiss();
    }

    return () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
    };
  }, [isActive, handleDismiss]);

  if (!isActive) return null;

  return (
    <div className="hidden lg:flex fixed inset-0 z-[99999] items-center justify-center bg-black/80 backdrop-blur-sm">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 z-[100000] bg-zinc-800 hover:bg-zinc-700 text-white rounded-full w-9 h-9 flex items-center justify-center text-sm font-bold border border-white/20 shadow-xl cursor-pointer pointer-events-auto"
        title="Close Ad"
      >
        ✕
      </button>
      <div
        ref={containerRef}
        id="exoclick-desktop-interstitial"
        className="z-[99999] max-w-full max-h-full flex items-center justify-center"
        aria-label="Sponsored Interstitial"
      />
    </div>
  );
};

/**
 * Mobile Fullpage Interstitial Ad (Zone ID: 6003180)
 */
export const MobileFullpageInterstitial: React.FC<{ onDismiss?: () => void }> = ({ onDismiss }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState<boolean>(false);

  const handleDismiss = useCallback(() => {
    setIsActive(false);
    if (onDismiss) onDismiss();
  }, [onDismiss]);

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

  useEffect(() => {
    if (!isActive) return;
    const el = containerRef.current;
    if (!el) return;

    let timeoutTimer: NodeJS.Timeout | null = null;

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

      adManager.commitInterstitialSuccess();

      timeoutTimer = setTimeout(() => {
        handleDismiss();
      }, 4000);
    } catch (e) {
      console.warn('[ExoClick] Mobile Interstitial mount error:', e);
      handleDismiss();
    }

    return () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
    };
  }, [isActive, handleDismiss]);

  if (!isActive) return null;

  return (
    <div className="block lg:hidden fixed inset-0 z-[99999] pointer-events-auto bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-4 right-4 z-[100000] bg-zinc-800 hover:bg-zinc-700 text-white rounded-full w-9 h-9 flex items-center justify-center text-sm font-bold border border-white/20 shadow-xl cursor-pointer pointer-events-auto"
        title="Close Ad"
      >
        ✕
      </button>
      <div
        ref={containerRef}
        id="exoclick-mobile-interstitial"
        className="w-full h-full flex items-center justify-center"
        aria-label="Sponsored Mobile Interstitial"
      />
    </div>
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
      className="block lg:hidden pointer-events-auto"
    />
  );
};

/**
 * In-Feed Outstream Video Card Ad (Zone ID: 6003190)
 */
export const OutstreamVideoCardAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [hasAdLoaded, setHasAdLoaded] = useState<boolean>(false);

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
    if (!el) return;

    try {
      const scriptId = 'exoclick-ad-provider-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/javascript';
        script.async = true;
        script.src = 'https://a.magsrv.com/ad-provider.js';
        document.head.appendChild(script);
      }

      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}37`;
      ins.setAttribute('data-zoneid', AD_ZONES.OUTSTREAM_VIDEO);
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.height = '100%';
      ins.style.minHeight = '180px';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      const observer = new MutationObserver(() => {
        if (ins.children.length > 0 || ins.querySelector('iframe, video, a')) {
          setHasAdLoaded(true);
        }
      });
      observer.observe(ins, { childList: true, subtree: true });

      setTimeout(() => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      }, 80);

      return () => {
        observer.disconnect();
      };
    } catch (e) {
      console.warn('[ExoClick] Outstream ad mount error:', e);
    }
  }, [isVisible]);

  return (
    <article
      className={`group flex flex-col w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300 ${className}`}
      aria-label="Sponsored Video Advertisement"
    >
      <div className="video-card-container relative w-full aspect-[16/9] min-h-[180px] rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 hover:border-rose-500/80 transition-colors duration-200 bg-zinc-100 dark:bg-[#09090b] flex items-center justify-center">
        <div
          ref={containerRef}
          id="exoclick-outstream-zone-6003190"
          className="w-full h-full min-h-[180px] flex items-center justify-center overflow-hidden z-10"
        />

        {!hasAdLoaded && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-2 bg-zinc-100 dark:bg-[#09090b] pointer-events-none animate-pulse">
            <div className="w-10 h-10 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin flex items-center justify-center">
              <span className="material-symbols-outlined text-rose-500 text-sm">play_arrow</span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Sponsored Video
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1 pointer-events-none">
          <span className="thumb-hd-badge bg-[#ec4899] text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md tracking-wide">
            AD
          </span>
        </div>

        <div className="thumb-duration-badge absolute bottom-2 left-2 bg-black/90 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-rose-400 z-20 shadow-md pointer-events-none">
          AD
        </div>
      </div>

      <div className="video-card-meta-box pt-2 px-0.5 space-y-1">
        <h3 className="video-card-meta-title font-bold text-sm md:text-[15px] text-zinc-900 dark:text-white transition-colors line-clamp-2 leading-snug tracking-tight">
          Featured Partner Video
        </h3>
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
      <div
        ref={desktopContainerRef}
        id="exoclick-desktop-under-player"
        className="hidden lg:flex w-full items-center justify-center overflow-hidden min-h-[90px] rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30 p-2 shadow-sm"
      />
      <div
        ref={mobileContainerRef}
        id="exoclick-mobile-under-player"
        className="flex lg:hidden w-full items-center justify-center overflow-hidden min-h-[250px] rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30 p-2 shadow-sm"
      />
    </div>
  );
};

const SPONSORED_RECOMMENDATIONS = [
  {
    id: 'rec-1',
    title: 'Live HD Video Chat & Private Cam Shows',
    sponsor: 'LiveHD Cams',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    tag: 'Live 1080p',
    action: 'Watch Free',
  },
  {
    id: 'rec-2',
    title: 'Meet Local Verified Singles in Your Area',
    sponsor: 'Flirt Finder',
    thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    tag: 'Hookup',
    action: 'Chat Now',
  },
  {
    id: 'rec-3',
    title: 'Interactive 3D Virtual Adult Experiences',
    sponsor: 'VR World',
    thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    tag: 'VR 4K',
    action: 'Play Game',
  },
  {
    id: 'rec-4',
    title: 'Top Rated Premium Adult 4K Streams',
    sponsor: 'VIP Pass',
    thumbnail: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80',
    tag: 'Ultra HD',
    action: 'Join Free',
  },
];

/**
 * Native Recommendation Ad Widget (Multi-device: Desktop, Tablet, Mobile — Zone ID: 6010176)
 * In-Grid Multi-Row Expansion with High Contrast Day/Night Mode Text
 */
export const NativeRecommendationAd: React.FC<{ className?: string; title?: string }> = ({
  className = '',
  title = 'Sponsor Picks & Recommendations',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasExoAdLoaded, setHasExoAdLoaded] = useState<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      const scriptId = 'exoclick-ad-provider-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/javascript';
        script.async = true;
        script.src = 'https://a.magsrv.com/ad-provider.js';
        document.head.appendChild(script);
      }

      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}20`;
      ins.setAttribute('data-zoneid', AD_ZONES.NATIVE_RECOMMENDED || '6010176');
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.height = 'auto';
      ins.style.minHeight = '180px';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      const observer = new MutationObserver(() => {
        if (ins.children.length > 0 || ins.querySelector('iframe, a, img, div.exo-native-widget, .exo-card')) {
          setHasExoAdLoaded(true);
        }
      });
      observer.observe(ins, { childList: true, subtree: true });

      const triggerAdServe = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      const t1 = setTimeout(triggerAdServe, 100);
      const t2 = setTimeout(triggerAdServe, 500);
      const t3 = setTimeout(triggerAdServe, 1200);

      return () => {
        observer.disconnect();
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } catch (e) {
      console.warn('[ExoClick] Native recommendation ad error:', e);
    }
  }, []);

  const handlePartnerClick = () => {
    try {
      const isMobile = window.innerWidth < 1024;
      const zoneId = isMobile ? (AD_ZONES.MOBILE_POPUNDER || '6010174') : (AD_ZONES.DESKTOP_POPUNDER || '6010172');
      window.open(`https://s.pemsrv.com/splash.php?idzone=${zoneId}`, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  return (
    <section className={`native-ad-section w-full my-4 p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121115] shadow-sm transition-colors ${className}`}>
      {/* Sponsor Picks & Recommendations Header with AD Badge */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ec4899] text-base">recommend</span>
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
            {title}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-[#ec4899] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
          AD
        </span>
      </div>

      {/* ExoClick Native Ad Mount (Live dynamic feed when filled) */}
      <div
        ref={containerRef}
        id="exoclick-native-recommended-zone-6010176"
        className={`w-full overflow-visible ${hasExoAdLoaded ? 'block' : 'hidden'}`}
      />

      {/* 4 Native Recommendation Cards (2x2 on Mobile, 4x1 on Desktop with High-Contrast Day/Night Text) */}
      {!hasExoAdLoaded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {SPONSORED_RECOMMENDATIONS.map((rec) => (
            <article
              key={rec.id}
              onClick={handlePartnerClick}
              className="group cursor-pointer flex flex-col w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300"
            >
              {/* 16:9 Full-Width Thumbnail Container */}
              <div className="video-card-container relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 hover:border-rose-500/80 transition-colors duration-200 bg-zinc-100 dark:bg-[#09090b]">
                <img
                  src={rec.thumbnail}
                  alt={rec.title}
                  loading="lazy"
                  decoding="async"
                  className="static-thumb w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                />

                {/* Top-Right Badge: Tag */}
                <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1 pointer-events-none">
                  <span className="thumb-hd-badge bg-[#ec4899] text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md tracking-wide">
                    {rec.tag}
                  </span>
                </div>

                {/* Bottom-Left Badge: AD */}
                <div className="thumb-duration-badge absolute bottom-2 left-2 bg-black/90 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-rose-400 z-20 shadow-md">
                  AD
                </div>

                {/* Bottom-Right Action Button */}
                <div className="absolute bottom-2 right-2 z-20">
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[9px] sm:text-[11px] uppercase tracking-wider transition-transform active:scale-95 shadow-xl flex items-center gap-1">
                    <span>{rec.action}</span>
                    <span className="material-symbols-outlined text-[10px] sm:text-xs">open_in_new</span>
                  </span>
                </div>
              </div>

              {/* High Contrast Day & Night Mode Text Meta Box */}
              <div className="video-card-meta-box pt-2 px-0.5 space-y-1">
                <h3 className="video-card-meta-title font-bold text-xs sm:text-sm text-zinc-900 dark:text-white transition-colors line-clamp-2 leading-snug tracking-tight group-hover:text-[#ec4899]">
                  {rec.title}
                </h3>

                {/* Stats Row */}
                <div className="video-card-stats-row flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] sm:text-sm text-[#ec4899]">verified</span>
                    <span className="video-card-stat-value text-[#ec4899] font-bold">{rec.sponsor}</span>
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] sm:text-sm text-zinc-500 dark:text-zinc-400">hd</span>
                    <span className="video-card-stat-value text-zinc-800 dark:text-zinc-200 font-bold">1080p</span>
                  </span>

                  <span className="hidden sm:flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] sm:text-sm text-zinc-500 dark:text-zinc-400">thumb_up</span>
                    <span className="video-card-stat-value text-zinc-800 dark:text-zinc-200 font-bold">Free</span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

/**
 * Global Popunder Ad Loader (Desktop Zone: 6010172 | Mobile Zone: 6010174)
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
