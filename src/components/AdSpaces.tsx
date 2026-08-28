import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AD_ZONES } from '../config/adConfig';
import { adManager, triggerInterstitial } from '../utils/adManager';

export { triggerInterstitial };

/**
 * Standard Native ExoClick Banner Slot
 */
export const AdBanner: React.FC<{ zoneId?: string; className?: string; reloadKey?: string | number }> = ({
  zoneId = AD_ZONES.IN_PAGE_BANNER,
  className = '',
  reloadKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderAd = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}17`;
      ins.setAttribute('data-zoneid', zoneId || AD_ZONES.IN_PAGE_BANNER);
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      // Trigger script adjacent
      const triggerScript = document.createElement('script');
      triggerScript.type = 'application/javascript';
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      const triggerAdServe = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      setTimeout(triggerAdServe, 100);
    } catch (e) {
      console.warn('[ExoClick] AdBanner mount error:', e);
    }
  }, [zoneId]);

  useEffect(() => {
    renderAd();
    const handleTrigger = () => {
      try {
        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });
      } catch {}
    };
    window.addEventListener('exoclick-refresh-ads', handleTrigger);
    return () => window.removeEventListener('exoclick-refresh-ads', handleTrigger);
  }, [renderAd, reloadKey]);

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
  const [canRenderDesktop, setCanRenderDesktop] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      const isMobile =
        typeof window === 'undefined' ||
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setCanRenderDesktop(!isMobile);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const renderAd = useCallback(() => {
    if (isDismissed || !canRenderDesktop) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}17`;
      ins.setAttribute('data-zoneid', AD_ZONES.DESKTOP_STICKY_LEADERBOARD);
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      const triggerAdServe = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      setTimeout(triggerAdServe, 100);
    } catch (e) {
      console.warn('[ExoClick] Sticky leaderboard error:', e);
    }
  }, [isDismissed, canRenderDesktop]);

  useEffect(() => {
    if (!canRenderDesktop) return;
    renderAd();
    const handleTrigger = () => {
      try {
        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });
      } catch {}
    };
    window.addEventListener('exoclick-refresh-ads', handleTrigger);
    return () => window.removeEventListener('exoclick-refresh-ads', handleTrigger);
  }, [renderAd, canRenderDesktop]);

  if (!canRenderDesktop || isDismissed) return null;

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
 * Sticky Bottom Banner Ad for Mobile (Zone ID: 6003172 / MOBILE_STICKY_BANNER)
 * Directly glued to the bottom of the mobile screen with flush layout and clean close bar.
 */
export const MobileStickyBanner: React.FC = () => null;

/**
 * Desktop Fullpage Interstitial Ad (Zone ID: 6003174)
 * Pure Native ExoClick Fullpage Interstitial Tag (eas6a97888e35)
 */
export const DesktopFullpageInterstitial: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsDesktop(typeof window !== 'undefined' && window.innerWidth >= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const renderAd = useCallback(() => {
    if (!isDesktop) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = '';

      if (!document.getElementById('exoclick-global-ad-provider')) {
        const sdk = document.createElement('script');
        sdk.id = 'exoclick-global-ad-provider';
        sdk.type = 'application/javascript';
        sdk.async = true;
        sdk.src = 'https://a.pemsrv.com/ad-provider.js';
        document.head.appendChild(sdk);
      }

      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}35`;
      ins.setAttribute('data-zoneid', AD_ZONES.DESKTOP_INTERSTITIAL || '6003174');
      ins.style.display = 'block';
      ins.style.width = '100%';
      el.appendChild(ins);

      const triggerScript = document.createElement('script');
      triggerScript.type = 'application/javascript';
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      const triggerAdServe = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      setTimeout(triggerAdServe, 80);
      setTimeout(triggerAdServe, 300);
      setTimeout(triggerAdServe, 700);
      setTimeout(triggerAdServe, 1500);
    } catch (err) {
      console.warn('[ExoClick] Desktop native interstitial trigger error:', err);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;
    const t = setTimeout(() => renderAd(), 250);
    const handleRefresh = () => renderAd();
    window.addEventListener('exoclick-refresh-ads', handleRefresh);
    window.addEventListener('popstate', handleRefresh);
    window.addEventListener('pageshow', handleRefresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener('exoclick-refresh-ads', handleRefresh);
      window.removeEventListener('popstate', handleRefresh);
      window.removeEventListener('pageshow', handleRefresh);
    };
  }, [renderAd, isDesktop]);

  if (!isDesktop) return null;

  return (
    <div
      id="exoclick-desktop-interstitial-container"
      className="hidden lg:block pointer-events-auto select-none"
    >
      <div ref={containerRef} className="w-full" />
    </div>
  );
};

/**
 * Mobile Fullpage Interstitial Ad (Zone ID: 6003180)
 * Pure Native ExoClick Fullpage Interstitial Tag (eas6a97888e33)
 */
export const MobileFullpageInterstitial: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      const mobile =
        typeof window !== 'undefined' &&
        (window.innerWidth < 1024 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      setIsMobile(mobile);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const renderAd = useCallback(() => {
    if (!isMobile) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = '';

      // 1. Ensure Global Provider SDK is present
      if (!document.getElementById('exoclick-global-ad-provider')) {
        const sdk = document.createElement('script');
        sdk.id = 'exoclick-global-ad-provider';
        sdk.type = 'application/javascript';
        sdk.async = true;
        sdk.src = 'https://a.pemsrv.com/ad-provider.js';
        document.head.appendChild(sdk);
      }

      // 2. Mount native ExoClick Fullpage Interstitial tag: <ins class="eas6a97888e33" data-zoneid="6003180"></ins>
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}33`;
      ins.setAttribute('data-zoneid', AD_ZONES.MOBILE_INTERSTITIAL || '6003180');
      ins.style.display = 'block';
      ins.style.width = '100%';
      el.appendChild(ins);

      // 3. Adjacent trigger script
      const triggerScript = document.createElement('script');
      triggerScript.type = 'application/javascript';
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      // 4. Multi-burst AdProvider trigger
      const triggerAdServe = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      setTimeout(triggerAdServe, 80);
      setTimeout(triggerAdServe, 300);
      setTimeout(triggerAdServe, 700);
      setTimeout(triggerAdServe, 1500);
      setTimeout(triggerAdServe, 3000);
    } catch (err) {
      console.warn('[ExoClick] Mobile native interstitial trigger error:', err);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const t = setTimeout(() => renderAd(), 250);
    const handleRefresh = () => renderAd();
    window.addEventListener('exoclick-refresh-ads', handleRefresh);
    window.addEventListener('popstate', handleRefresh);
    window.addEventListener('pageshow', handleRefresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener('exoclick-refresh-ads', handleRefresh);
      window.removeEventListener('popstate', handleRefresh);
      window.removeEventListener('pageshow', handleRefresh);
    };
  }, [renderAd, isMobile]);

  if (!isMobile) return null;

  return (
    <div
      id="exoclick-mobile-interstitial-container"
      className="block lg:hidden pointer-events-auto select-none"
    >
      <div ref={containerRef} className="w-full" />
    </div>
  );
};

/**
 * Mobile Instant Message Ad (Zone ID: 6003178)
 * Pure Native ExoClick Tag — active on Mobile (< 1024px)
 */
export const MobileInstantMessage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      const mobile =
        typeof window !== 'undefined' &&
        (window.innerWidth < 1024 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      setIsMobile(mobile);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const renderAd = useCallback(() => {
    if (!isMobile) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = '';

      // Inject SDK if missing
      if (!document.getElementById('exoclick-global-ad-provider')) {
        const sdk = document.createElement('script');
        sdk.id = 'exoclick-global-ad-provider';
        sdk.type = 'application/javascript';
        sdk.async = true;
        sdk.src = 'https://a.magsrv.com/ad-provider.js';
        document.head.appendChild(sdk);
      }

      // <ins class="eas6a97888e14" data-zoneid="6003178"></ins>
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}14`;
      ins.setAttribute('data-zoneid', AD_ZONES.MOBILE_INSTANT_MESSAGE || '6003178');
      ins.style.display = 'block';
      ins.style.width = '100%';
      el.appendChild(ins);

      // Multi-burst AdProvider trigger
      const triggerAdServe = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      setTimeout(triggerAdServe, 80);
      setTimeout(triggerAdServe, 300);
      setTimeout(triggerAdServe, 700);
      setTimeout(triggerAdServe, 1500);
      setTimeout(triggerAdServe, 3000);
    } catch (e) {
      console.warn('[ExoClick] Mobile instant message error:', e);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const t = setTimeout(() => renderAd(), 200);
    const handleRefresh = () => renderAd();
    window.addEventListener('exoclick-refresh-ads', handleRefresh);
    window.addEventListener('popstate', handleRefresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener('exoclick-refresh-ads', handleRefresh);
      window.removeEventListener('popstate', handleRefresh);
    };
  }, [renderAd, isMobile]);

  if (!isMobile) return null;

  return (
    <div
      id="exoclick-mobile-instant-message"
      className="block lg:hidden pointer-events-auto select-none"
    >
      <div ref={containerRef} className="w-full" />
    </div>
  );
};

/**
 * In-Feed Outstream Video Card Ad (Zone ID: 6003190)
 * Pure Native ExoClick Outstream Video Tag
 */
export const OutstreamVideoCardAd: React.FC<{ className?: string; reloadKey?: string | number }> = ({
  className = '',
  reloadKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderAd = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    let isMounted = true;
    const timers: NodeJS.Timeout[] = [];

    try {
      el.innerHTML = '';

      // 1. Ensure Global Provider SDK is loaded
      if (!document.getElementById('exoclick-global-ad-provider')) {
        const sdk = document.createElement('script');
        sdk.id = 'exoclick-global-ad-provider';
        sdk.type = 'application/javascript';
        sdk.async = true;
        sdk.src = 'https://a.magsrv.com/ad-provider.js';
        document.head.appendChild(sdk);
      }

      // 2. Create Native ExoClick Outstream <ins> element
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}37`;
      ins.setAttribute('data-zoneid', AD_ZONES.OUTSTREAM_VIDEO || '6003190');
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.minHeight = '220px';
      ins.style.margin = '0 auto';
      ins.style.textAlign = 'center';
      el.appendChild(ins);

      // 3. Automatic Multi-burst AdProvider trigger (No raw script tag in visible DOM)
      const triggerAdServe = () => {
        if (!isMounted) return;
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      timers.push(setTimeout(triggerAdServe, 50));
      timers.push(setTimeout(triggerAdServe, 200));
      timers.push(setTimeout(triggerAdServe, 600));
      timers.push(setTimeout(triggerAdServe, 1500));

      // 5. Viewport Intersection Observer to auto-serve when scrolled into view
      let intersectionObserver: IntersectionObserver | null = null;
      if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
        intersectionObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && isMounted) {
              triggerAdServe();
            }
          });
        }, { threshold: 0.1 });
        intersectionObserver.observe(el);
      }

      return () => {
        isMounted = false;
        timers.forEach((t) => clearTimeout(t));
        if (intersectionObserver) intersectionObserver.disconnect();
      };
    } catch (e) {
      console.warn('[ExoClick] Outstream ad mount error:', e);
    }
  }, []);

  useEffect(() => {
    const cleanup = renderAd();
    const handleTrigger = () => {
      try {
        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });
      } catch {}
    };
    window.addEventListener('exoclick-refresh-ads', handleTrigger);
    return () => {
      window.removeEventListener('exoclick-refresh-ads', handleTrigger);
      if (cleanup) cleanup();
    };
  }, [renderAd, reloadKey]);

  return (
    <article
      className={`video-card group flex flex-col w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300 ${className}`}
      aria-label="Sponsored Video Advertisement"
    >
      <div className="relative w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 hover:border-rose-500/80 transition-colors duration-200 bg-transparent flex items-center justify-center min-h-[220px] sm:min-h-[240px]">
        {/* Ad Wrapper (Expanded size for seamless video stream playback) */}
        <div
          ref={containerRef}
          id="exoclick-outstream-zone-6003190"
          className="outstream-ad-wrapper w-full min-h-[220px] sm:min-h-[240px] z-10 pointer-events-auto flex items-center justify-center"
        />

        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1 pointer-events-none">
          <span className="thumb-hd-badge bg-[#ec4899] text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md tracking-wide">
            AD
          </span>
        </div>

        <div className="thumb-duration-badge absolute bottom-2 left-2 bg-black/90 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-rose-400 z-20 shadow-md pointer-events-none">
          SPONSORED
        </div>
      </div>

      {/* Video card details (Title, Views, etc.) */}
      <div className="video-info pt-2 px-0.5 space-y-1">
        <h4 className="video-card-meta-title font-bold text-sm md:text-[15px] text-zinc-900 dark:text-white transition-colors line-clamp-2 leading-snug tracking-tight">
          Sponsored Outstream Video
        </h4>
        <div className="video-card-stats-row flex items-center justify-between gap-3 text-[11px] sm:text-xs font-semibold text-[#334155] dark:text-zinc-300">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] sm:text-sm text-rose-500">verified</span>
            <span className="video-card-stat-value text-rose-500 font-bold">Partner Ad</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] sm:text-sm text-[#64748b] dark:text-zinc-400">hd</span>
            <span className="video-card-stat-value text-[#0f172a] dark:text-zinc-100 font-bold">HD Stream</span>
          </div>
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

  const renderAd = useCallback(() => {
    if (!isVisible || dismissed) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}17`;
      ins.setAttribute('data-zoneid', AD_ZONES.ON_STREAM_VIDEO_BANNER);
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      // Inject inline trigger script
      const triggerScript = document.createElement('script');
      triggerScript.type = 'application/javascript';
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      const triggerAdServe = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      setTimeout(triggerAdServe, 100);
    } catch (e) {
      console.warn('[ExoClick] On-stream banner mount error:', e);
    }
  }, [isVisible, dismissed]);

  useEffect(() => {
    renderAd();
  }, [renderAd]);

  if (!isVisible || dismissed) return null;

  return (
    <div className="hidden lg:flex absolute bottom-6 left-0 right-0 z-20 items-center justify-center pointer-events-auto px-2">
      <div className="onstream-ad-container relative bg-black/90 backdrop-blur-md px-3 py-1 rounded-xl border border-white/15 shadow-2xl max-w-full overflow-hidden flex items-center justify-center">
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            if (onClose) onClose();
          }}
          className="absolute -top-1.5 -right-1.5 bg-zinc-800 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] border border-white/20 shadow-md cursor-pointer transition-colors z-10"
          title="Close overlay"
        >
          ✕
        </button>
        <div ref={containerRef} className="w-full max-w-[468px] max-h-[60px] flex items-center justify-center overflow-hidden" />
      </div>
    </div>
  );
};

/**
 * Under-Player Banner Ad (Responsive: Desktop Zone 6010076 & Mobile Zone 6010078)
 */
export const UnderPlayerBanner: React.FC<{ className?: string; reloadKey?: string | number }> = ({
  className = '',
  reloadKey,
}) => {
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  const renderAd = useCallback(() => {
    if (typeof window === 'undefined') return;

    const isMobile = window.innerWidth < 1024;
    const targetRef = isMobile ? mobileContainerRef : desktopContainerRef;
    const el = targetRef.current;
    if (!el) return;

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

      // Inline trigger script
      const triggerScript = document.createElement('script');
      triggerScript.type = 'application/javascript';
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      const triggerAdServe = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      setTimeout(triggerAdServe, 100);
    } catch (e) {
      console.warn('[ExoClick] Under-Player banner error:', e);
    }
  }, []);

  useEffect(() => {
    renderAd();
    const handleTrigger = () => {
      try {
        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });
      } catch {}
    };
    window.addEventListener('exoclick-refresh-ads', handleTrigger);
    return () => window.removeEventListener('exoclick-refresh-ads', handleTrigger);
  }, [renderAd, reloadKey]);

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

interface NativeAdItem {
  image: string;
  optimum_image?: string;
  url: string;
  title: string;
  description?: string;
  brand?: string;
  size?: string;
}

/**
 * Native Recommendation Ad Widget (Multi-device: Desktop, Tablet, Mobile — Zone ID: 6010176)
 * Dual-Mode Engine: Native ExoClick Tag + Direct Syndication Fallback for 100% Guaranteed Display
 */
export const NativeRecommendationAd: React.FC<{ className?: string; title?: string; reloadKey?: string | number }> = ({
  className = '',
  title = 'Sponsored Recommendations',
  reloadKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(`exo_native_${Math.random().toString(36).substring(2, 9)}`);
  const [fallbackItems, setFallbackItems] = useState<NativeAdItem[]>([]);
  const [hasRenderedIns, setHasRenderedIns] = useState<boolean>(false);

  const zoneId = AD_ZONES.NATIVE_RECOMMENDED || '6010176';

  const renderAd = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    let isMounted = true;
    const timers: NodeJS.Timeout[] = [];

    try {
      el.innerHTML = '';
      setHasRenderedIns(false);

      // 1. Mount Native ExoClick Tag: <ins class="eas6a97888e20" data-zoneid="6010176"></ins>
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}20`;
      ins.setAttribute('data-zoneid', zoneId);
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.margin = '0 auto';
      ins.style.background = 'transparent';
      el.appendChild(ins);

      // 2. Adjacent trigger script
      const triggerScript = document.createElement('script');
      triggerScript.type = 'application/javascript';
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      const triggerAdServe = () => {
        if (!isMounted) return;
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      timers.push(setTimeout(triggerAdServe, 80));
      timers.push(setTimeout(triggerAdServe, 300));
      timers.push(setTimeout(triggerAdServe, 800));

      // 3. Check if ExoClick rendered inside <ins>
      timers.push(
        setTimeout(() => {
          if (!isMounted) return;
          if (ins && (ins.children.length > 0 || ins.offsetHeight > 40)) {
            setHasRenderedIns(true);
          } else {
            // Fetch direct syndication JSON
            fetch(`https://syndication.realsrv.com/splash.php?idzone=${zoneId}&type=20`)
              .then((res) => res.json())
              .then((data) => {
                if (isMounted && data && Array.isArray(data.data) && data.data.length > 0) {
                  setFallbackItems(data.data.slice(0, 4));
                }
              })
              .catch(() => {});
          }
        }, 1200)
      );

      return () => {
        isMounted = false;
        timers.forEach((t) => clearTimeout(t));
      };
    } catch (e) {
      console.warn('[ExoClick] Native recommendation ad mount error:', e);
    }
  }, [zoneId]);

  useEffect(() => {
    const cleanup = renderAd();

    const handleTrigger = () => {
      try {
        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });
      } catch {}
    };

    window.addEventListener('exoclick-refresh-ads', handleTrigger);
    window.addEventListener('popstate', handleTrigger);
    window.addEventListener('pageshow', handleTrigger);

    return () => {
      window.removeEventListener('exoclick-refresh-ads', handleTrigger);
      window.removeEventListener('popstate', handleTrigger);
      window.removeEventListener('pageshow', handleTrigger);
      if (cleanup) cleanup();
    };
  }, [renderAd, reloadKey]);

  return (
    <div className={`native-ad-section w-full my-3 overflow-visible ${className}`}>
      {/* ExoClick Ins Container */}
      <div
        ref={containerRef}
        id={instanceId.current}
        className={`w-full overflow-visible ${fallbackItems.length > 0 && !hasRenderedIns ? 'hidden' : 'block'}`}
      />

      {/* Direct Syndication Rendered Cards (Guaranteed 100% Fill) */}
      {!hasRenderedIns && fallbackItems.length > 0 && (
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-5 gap-x-4 sm:gap-5">
            {fallbackItems.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="video-card group flex flex-col w-full rounded-2xl overflow-hidden transition-all duration-300 active:scale-98 cursor-pointer"
              >
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 group-hover:border-[#ec4899] transition-all duration-200 bg-zinc-900 flex items-center justify-center">
                  <img
                    src={item.optimum_image || item.image}
                    alt={item.title || 'Sponsored Recommendation'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 z-10">
                    <span className="bg-[#ec4899] text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md tracking-wide">
                      AD
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 z-10 bg-black/80 border border-white/15 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-rose-400">
                    {item.brand || 'SPONSORED'}
                  </div>
                </div>

                <div className="video-info pt-2 px-0.5 space-y-1">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-[#ec4899] transition-colors line-clamp-2 leading-snug tracking-tight">
                    {item.title || 'Recommended Content'}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1 text-rose-500 font-bold">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      <span>{item.brand || 'Sponsored'}</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">Promoted</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
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
