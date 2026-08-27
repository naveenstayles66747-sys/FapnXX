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
      setTimeout(triggerAdServe, 50);
      setTimeout(triggerAdServe, 200);
      setTimeout(triggerAdServe, 600);
      setTimeout(triggerAdServe, 1200);
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

  const renderAd = useCallback(() => {
    if (isDismissed || typeof window === 'undefined' || window.innerWidth < 1024) return;
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
      setTimeout(triggerAdServe, 50);
      setTimeout(triggerAdServe, 200);
      setTimeout(triggerAdServe, 600);
      setTimeout(triggerAdServe, 1200);
    } catch (e) {
      console.warn('[ExoClick] Sticky leaderboard error:', e);
    }
  }, [isDismissed]);

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
  }, [renderAd]);

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
 * Pure Native ExoClick Fullpage Interstitial — No artificial modal wrapper or blocking box
 */
export const DesktopFullpageInterstitial: React.FC<{ onDismiss?: () => void }> = ({ onDismiss }) => {
  useEffect(() => {
    const handleRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.target === 'desktop' && window.innerWidth >= 1024) {
        try {
          const zoneId = AD_ZONES.DESKTOP_INTERSTITIAL || '6003174';
          const siteHash = AD_ZONES.SITE_HASH || '6a97888e';

          // Clean any previous interstitial tag
          const prevIns = document.getElementById('exoclick-native-desktop-interstitial');
          if (prevIns) prevIns.remove();

          // 1. Ensure Global Provider SDK is present
          if (!document.getElementById('exoclick-global-ad-provider')) {
            const sdk = document.createElement('script');
            sdk.id = 'exoclick-global-ad-provider';
            sdk.type = 'application/javascript';
            sdk.async = true;
            sdk.src = 'https://a.magsrv.com/ad-provider.js';
            document.head.appendChild(sdk);
          }

          // 2. Mount native ExoClick Fullpage Interstitial tag directly to body
          const ins = document.createElement('ins');
          ins.id = 'exoclick-native-desktop-interstitial';
          ins.className = `eas${siteHash}35`;
          ins.setAttribute('data-zoneid', zoneId);

          const triggerScript = document.createElement('script');
          triggerScript.type = 'application/javascript';
          triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
          ins.appendChild(triggerScript);

          document.body.appendChild(ins);

          // 3. Multi-burst trigger AdProvider
          const triggerAdServe = () => {
            try {
              const win = window as any;
              win.AdProvider = win.AdProvider || [];
              win.AdProvider.push({ serve: {} });
            } catch {}
          };

          triggerAdServe();
          setTimeout(triggerAdServe, 50);
          setTimeout(triggerAdServe, 200);
          setTimeout(triggerAdServe, 500);

          adManager.commitInterstitialSuccess();
          if (onDismiss) onDismiss();
        } catch (err) {
          console.warn('[ExoClick] Desktop native interstitial trigger notice:', err);
        }
      }
    };

    window.addEventListener('exoclick-interstitial-request', handleRequest);
    return () => window.removeEventListener('exoclick-interstitial-request', handleRequest);
  }, [onDismiss]);

  return null;
};

/**
 * Mobile Fullpage Interstitial Ad (Zone ID: 6003180)
 * Pure Native ExoClick Fullpage Interstitial — No artificial modal wrapper or blocking box
 */
export const MobileFullpageInterstitial: React.FC<{ onDismiss?: () => void }> = ({ onDismiss }) => {
  useEffect(() => {
    const handleRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.target === 'mobile' && window.innerWidth < 1024) {
        try {
          const zoneId = AD_ZONES.MOBILE_INTERSTITIAL || '6003180';
          const siteHash = AD_ZONES.SITE_HASH || '6a97888e';

          // Clean any previous interstitial tag
          const prevIns = document.getElementById('exoclick-native-mobile-interstitial');
          if (prevIns) prevIns.remove();

          // 1. Ensure Global Provider SDK is present
          if (!document.getElementById('exoclick-global-ad-provider')) {
            const sdk = document.createElement('script');
            sdk.id = 'exoclick-global-ad-provider';
            sdk.type = 'application/javascript';
            sdk.async = true;
            sdk.src = 'https://a.magsrv.com/ad-provider.js';
            document.head.appendChild(sdk);
          }

          // 2. Mount native ExoClick Fullpage Interstitial tag directly to body
          const ins = document.createElement('ins');
          ins.id = 'exoclick-native-mobile-interstitial';
          ins.className = `eas${siteHash}33`;
          ins.setAttribute('data-zoneid', zoneId);

          const triggerScript = document.createElement('script');
          triggerScript.type = 'application/javascript';
          triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
          ins.appendChild(triggerScript);

          document.body.appendChild(ins);

          // 3. Multi-burst trigger AdProvider
          const triggerAdServe = () => {
            try {
              const win = window as any;
              win.AdProvider = win.AdProvider || [];
              win.AdProvider.push({ serve: {} });
            } catch {}
          };

          triggerAdServe();
          setTimeout(triggerAdServe, 50);
          setTimeout(triggerAdServe, 200);
          setTimeout(triggerAdServe, 500);

          adManager.commitInterstitialSuccess();
          if (onDismiss) onDismiss();
        } catch (err) {
          console.warn('[ExoClick] Mobile native interstitial trigger notice:', err);
        }
      }
    };

    window.addEventListener('exoclick-interstitial-request', handleRequest);
    return () => window.removeEventListener('exoclick-interstitial-request', handleRequest);
  }, [onDismiss]);

  return null;
};

/**
 * Mobile Instant Message Ad (Zone ID: 6003178)
 */
export const MobileInstantMessage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderAd = useCallback(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}14`;
      ins.setAttribute('data-zoneid', AD_ZONES.MOBILE_INSTANT_MESSAGE);
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
      setTimeout(triggerAdServe, 50);
      setTimeout(triggerAdServe, 200);
      setTimeout(triggerAdServe, 600);
      setTimeout(triggerAdServe, 1200);
    } catch (e) {
      console.warn('[ExoClick] Mobile instant message error:', e);
    }
  }, []);

  useEffect(() => {
    renderAd();
    const handleRefresh = () => renderAd();
    window.addEventListener('exoclick-refresh-ads', handleRefresh);
    return () => window.removeEventListener('exoclick-refresh-ads', handleRefresh);
  }, [renderAd]);

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
      ins.style.minHeight = '180px';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      // 3. Inject inline script trigger adjacent to ins tag
      const triggerScript = document.createElement('script');
      triggerScript.type = 'application/javascript';
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      // 4. Trigger AdProvider bursts to ensure ExoClick receives request
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
      timers.push(setTimeout(triggerAdServe, 1200));

      return () => {
        isMounted = false;
        timers.forEach((t) => clearTimeout(t));
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
      className={`group flex flex-col w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300 ${className}`}
      aria-label="Sponsored Video Advertisement"
    >
      <div className="video-card-container relative w-full aspect-[16/9] min-h-[180px] rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 hover:border-rose-500/80 transition-colors duration-200 bg-zinc-950 flex items-center justify-center">
        {/* Native ExoClick Outstream Tag Container */}
        <div
          ref={containerRef}
          id="exoclick-outstream-zone-6003190"
          className="w-full h-full min-h-[180px] flex items-center justify-center overflow-visible z-10 pointer-events-auto relative"
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

      <div className="video-card-meta-box pt-2 px-0.5 space-y-1">
        <h3 className="video-card-meta-title font-bold text-sm md:text-[15px] text-zinc-900 dark:text-white transition-colors line-clamp-2 leading-snug tracking-tight">
          Sponsored Outstream Video
        </h3>
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
      setTimeout(triggerAdServe, 50);
      setTimeout(triggerAdServe, 200);
      setTimeout(triggerAdServe, 600);
    } catch (e) {
      console.warn('[ExoClick] On-stream banner mount error:', e);
    }
  }, [isVisible, dismissed]);

  useEffect(() => {
    renderAd();
  }, [renderAd]);

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
      setTimeout(triggerAdServe, 50);
      setTimeout(triggerAdServe, 200);
      setTimeout(triggerAdServe, 600);
      setTimeout(triggerAdServe, 1200);
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

/**
 * Native Recommendation Ad Widget (Multi-device: Desktop, Tablet, Mobile — Zone ID: 6010176)
 * Pure ExoClick Native Recommendation Widget Tag with seamless SPA navigation support
 */
export const NativeRecommendationAd: React.FC<{ className?: string; title?: string; reloadKey?: string | number }> = ({
  className = '',
  title = 'Sponsor Picks & Recommendations',
  reloadKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(`exo_native_${Math.random().toString(36).substring(2, 9)}`);

  const renderAd = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    let isMounted = true;
    const timers: NodeJS.Timeout[] = [];

    try {
      el.innerHTML = '';

      // 1. Create Native Tag
      const ins = document.createElement('ins');
      ins.className = `eas${AD_ZONES.SITE_HASH}20`;
      ins.setAttribute('data-zoneid', AD_ZONES.NATIVE_RECOMMENDED || '6010176');
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.style.minHeight = '140px';
      ins.style.margin = '0 auto';
      el.appendChild(ins);

      // 2. Inject inline script trigger
      const triggerScript = document.createElement('script');
      triggerScript.type = 'application/javascript';
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      // 3. Ensure global provider SDK is present
      if (!document.getElementById('exoclick-global-ad-provider')) {
        const sdk = document.createElement('script');
        sdk.id = 'exoclick-global-ad-provider';
        sdk.type = 'application/javascript';
        sdk.async = true;
        sdk.src = 'https://a.magsrv.com/ad-provider.js';
        document.head.appendChild(sdk);
      }

      // 4. Repeated trigger bursts to guarantee ExoClick serves on SPA transitions
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
      timers.push(setTimeout(triggerAdServe, 1200));
      timers.push(setTimeout(triggerAdServe, 2500));
    } catch (e) {
      console.warn('[ExoClick] Native recommendation ad mount error:', e);
    }

    return () => {
      isMounted = false;
      timers.forEach((t) => clearTimeout(t));
    };
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
    <section className={`native-ad-section w-full my-2.5 sm:my-3 p-2.5 sm:p-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#121115] shadow-sm transition-colors ${className}`}>
      {/* Minimal Header with AD Badge */}
      <div className="flex items-center justify-start pb-1.5 mb-1.5 border-b border-zinc-200 dark:border-white/10">
        <span className="px-2 py-0.5 rounded bg-[#ec4899] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
          AD
        </span>
      </div>

      {/* Pure ExoClick Native Recommendation Ad Container */}
      <div
        ref={containerRef}
        id={instanceId.current}
        className="w-full overflow-visible block min-h-[140px]"
      />
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
