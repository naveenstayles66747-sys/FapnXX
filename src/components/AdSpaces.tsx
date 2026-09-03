import React, { useEffect, useRef, useState, useCallback } from "react";
import { AD_ZONES } from "../config/adConfig";
import { adManager, triggerInterstitial } from "../utils/adManager";
import { fetchVastAd, fireTrackingPixel, VastAd } from "../utils/vastEngine";

export { triggerInterstitial };

/**
 * Standard Native ExoClick Banner Slot
 */
export const AdBanner: React.FC<{ zoneId?: string; className?: string; reloadKey?: string | number }> = ({
  zoneId = AD_ZONES.IN_PAGE_BANNER,
  className = "",
  reloadKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderAd = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = "";
      const ins = document.createElement("ins");
      ins.className = `eas${AD_ZONES.SITE_HASH}17`;
      ins.setAttribute("data-zoneid", zoneId || AD_ZONES.IN_PAGE_BANNER);
      ins.style.display = "block";
      ins.style.margin = "0 auto";
      el.appendChild(ins);

      // Trigger script adjacent
      const triggerScript = document.createElement("script");
      triggerScript.type = "application/javascript";
      triggerScript.text = "(window.AdProvider = window.AdProvider || []).push({\"serve\": {}});";
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
      console.warn("[ExoClick] AdBanner mount error:", e);
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
    window.addEventListener("exoclick-refresh-ads", handleTrigger);
    return () => window.removeEventListener("exoclick-refresh-ads", handleTrigger);
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
 */
export const StickyBottomLeaderboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [canRenderDesktop, setCanRenderDesktop] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      const isMobile =
        typeof window === "undefined" ||
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setCanRenderDesktop(!isMobile);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  const renderAd = useCallback(() => {
    if (isDismissed || !canRenderDesktop) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = "";
      const ins = document.createElement("ins");
      ins.className = `eas${AD_ZONES.SITE_HASH}17`;
      ins.setAttribute("data-zoneid", AD_ZONES.DESKTOP_STICKY_LEADERBOARD);
      ins.style.display = "block";
      ins.style.margin = "0 auto";
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
      console.warn("[ExoClick] Sticky leaderboard error:", e);
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
    window.addEventListener("exoclick-refresh-ads", handleTrigger);
    return () => window.removeEventListener("exoclick-refresh-ads", handleTrigger);
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
          title="Dismiss ad"
        >
          ✕
        </button>
        <div ref={containerRef} className="w-full flex items-center justify-center min-h-[90px] overflow-hidden" />
      </div>
    </aside>
  );
};

/**
 * Desktop Fullpage Interstitial Ad (Zone ID: 6003174)
 */
export const DesktopFullpageInterstitial: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canRenderDesktop, setCanRenderDesktop] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      const isMobile =
        typeof window === "undefined" ||
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setCanRenderDesktop(!isMobile);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  const renderAd = useCallback(() => {
    if (!canRenderDesktop) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = "";

      if (!document.getElementById("exoclick-global-ad-provider")) {
        const sdk = document.createElement("script");
        sdk.id = "exoclick-global-ad-provider";
        sdk.type = "application/javascript";
        sdk.async = true;
        sdk.src = "https://a.magsrv.com/ad-provider.js";
        document.head.appendChild(sdk);
      }

      const ins = document.createElement("ins");
      ins.className = `eas${AD_ZONES.SITE_HASH}33`;
      ins.setAttribute("data-zoneid", AD_ZONES.DESKTOP_INTERSTITIAL || "6003174");
      ins.style.display = "block";
      ins.style.width = "100%";
      el.appendChild(ins);

      const triggerScript = document.createElement("script");
      triggerScript.type = "application/javascript";
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
    } catch (err) {
      console.warn("[ExoClick] Desktop interstitial error:", err);
    }
  }, [canRenderDesktop]);

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
    window.addEventListener("exoclick-refresh-ads", handleTrigger);
    window.addEventListener("popstate", handleTrigger);
    window.addEventListener("pageshow", handleTrigger);
    return () => {
      window.removeEventListener("exoclick-refresh-ads", handleTrigger);
      window.removeEventListener("popstate", handleTrigger);
      window.removeEventListener("pageshow", handleTrigger);
    };
  }, [renderAd, canRenderDesktop]);

  if (!canRenderDesktop) return null;

  return (
    <div id="exoclick-desktop-interstitial-container" className="hidden lg:block pointer-events-auto select-none">
      <div ref={containerRef} className="w-full" />
    </div>
  );
};

/**
 * Mobile Fullpage Interstitial Ad (Zone ID: 6003180)
 */
export const MobileFullpageInterstitial: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      const mobile =
        typeof window !== "undefined" &&
        (window.innerWidth < 1024 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      setIsMobile(mobile);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  const renderAd = useCallback(() => {
    if (!isMobile) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = "";

      if (!document.getElementById("exoclick-global-ad-provider")) {
        const sdk = document.createElement("script");
        sdk.id = "exoclick-global-ad-provider";
        sdk.type = "application/javascript";
        sdk.async = true;
        sdk.src = "https://a.pemsrv.com/ad-provider.js";
        document.head.appendChild(sdk);
      }

      const ins = document.createElement("ins");
      ins.className = `eas${AD_ZONES.SITE_HASH}33`;
      ins.setAttribute("data-zoneid", AD_ZONES.MOBILE_INTERSTITIAL || "6003180");
      ins.style.display = "block";
      ins.style.width = "100%";
      el.appendChild(ins);

      const triggerScript = document.createElement("script");
      triggerScript.type = "application/javascript";
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
    } catch (err) {
      console.warn("[ExoClick] Mobile native interstitial error:", err);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    renderAd();
    const handleTrigger = () => {
      try {
        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });
      } catch {}
    };
    window.addEventListener("exoclick-refresh-ads", handleTrigger);
    window.addEventListener("popstate", handleTrigger);
    window.addEventListener("pageshow", handleTrigger);
    return () => {
      window.removeEventListener("exoclick-refresh-ads", handleTrigger);
      window.removeEventListener("popstate", handleTrigger);
      window.removeEventListener("pageshow", handleTrigger);
    };
  }, [renderAd, isMobile]);

  if (!isMobile) return null;

  return (
    <div id="exoclick-mobile-interstitial-container" className="block lg:hidden pointer-events-auto select-none">
      <div ref={containerRef} className="w-full" />
    </div>
  );
};

/**
 * Mobile Instant Message Ad (Zone ID: 6003178)
 */
export const MobileInstantMessage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkDevice = () => {
      const mobile =
        typeof window !== "undefined" &&
        (window.innerWidth < 1024 ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      setIsMobile(mobile);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  const renderAd = useCallback(() => {
    if (!isMobile) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = "";

      if (!document.getElementById("exoclick-global-ad-provider")) {
        const sdk = document.createElement("script");
        sdk.id = "exoclick-global-ad-provider";
        sdk.type = "application/javascript";
        sdk.async = true;
        sdk.src = "https://a.magsrv.com/ad-provider.js";
        document.head.appendChild(sdk);
      }

      const ins = document.createElement("ins");
      ins.className = `eas${AD_ZONES.SITE_HASH}14`;
      ins.setAttribute("data-zoneid", AD_ZONES.MOBILE_INSTANT_MESSAGE || "6003178");
      ins.style.display = "block";
      ins.style.width = "100%";
      el.appendChild(ins);

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
    } catch (e) {
      console.warn("[ExoClick] Mobile instant message error:", e);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const t = setTimeout(() => renderAd(), 200);
    const handleRefresh = () => renderAd();
    window.addEventListener("exoclick-refresh-ads", handleRefresh);
    window.addEventListener("popstate", handleRefresh);
    return () => {
      clearTimeout(t);
      window.removeEventListener("exoclick-refresh-ads", handleRefresh);
      window.removeEventListener("popstate", handleRefresh);
    };
  }, [renderAd, isMobile]);

  if (!isMobile) return null;

  return (
    <div id="exoclick-mobile-instant-message" className="block lg:hidden pointer-events-auto select-none">
      <div ref={containerRef} className="w-full" />
    </div>
  );
};

/**
 * In-Feed Outstream Video Card Ad (Zone ID: 6003190)
 * Plays real In-Feed Video Ads with Auto-Refresh and Sound Controls
 */
export const OutstreamVideoCardAd: React.FC<{ className?: string; reloadKey?: string | number }> = ({
  className = "",
  reloadKey,
}) => {
  const [directVast, setDirectVast] = useState<VastAd | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchAndPlayAd = useCallback(() => {
    const cb = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const vastUrl = `https://syndication.realsrv.com/splash.php?idzone=6003190&type=37&cb=${cb}`;

    fetchVastAd(vastUrl, 3000)
      .then((parsed) => {
        if (parsed && parsed.mediaUrl) {
          setDirectVast(parsed);
          fireTrackingPixel(parsed.impressionUrls);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAndPlayAd();
    const handleRefresh = () => fetchAndPlayAd();
    window.addEventListener("exoclick-refresh-ads", handleRefresh);
    return () => window.removeEventListener("exoclick-refresh-ads", handleRefresh);
  }, [fetchAndPlayAd, reloadKey]);

  const handleAdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (directVast) {
      fireTrackingPixel(directVast.clickTrackingUrls);
      const dest = directVast.clickThroughUrl || "https://go.marzaent.com/smartpop/165aea9bcdd7aabac45f72d02f58fd24b8416bc57cfc540b1b4409ac823564af";
      window.open(dest, "_blank", "noopener,noreferrer");
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const next = !videoRef.current.muted;
      videoRef.current.muted = next;
      setIsMuted(next);
    }
  };

  return (
    <article
      className={`video-card group flex flex-col w-full max-w-full rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${className}`}
      onClick={handleAdClick}
    >
      <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 hover:border-[#ec4899] transition-colors duration-200 bg-black flex items-center justify-center">
        {directVast?.mediaUrl ? (
          <video
            ref={videoRef}
            src={directVast.mediaUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 skeleton-shimmer">
            <span className="material-symbols-outlined text-3xl text-rose-500 animate-pulse">play_circle</span>
          </div>
        )}

        {/* Sound Toggle Button */}
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-2 right-2 z-20 p-1.5 bg-black/75 hover:bg-black/95 text-white rounded-full border border-white/20 shadow-lg backdrop-blur-md cursor-pointer active:scale-95"
          title={isMuted ? "Unmute" : "Mute"}
        >
          <span className="material-symbols-outlined text-sm">
            {isMuted ? "volume_off" : "volume_up"}
          </span>
        </button>

        <div className="absolute top-2 right-2 z-20">
          <span className="bg-[#ec4899] text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md tracking-wide">
            AD
          </span>
        </div>

        <div className="absolute bottom-2 left-2 z-20 bg-black/90 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-rose-400">
          SPONSORED VIDEO
        </div>
      </div>

      <div className="video-info pt-2 px-0.5 space-y-1">
        <h4 className="font-bold text-sm md:text-[15px] text-zinc-900 dark:text-white group-hover:text-[#ec4899] transition-colors line-clamp-2 leading-snug">
          Recommended Partner Video
        </h4>
        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
          <span className="flex items-center gap-1 text-rose-500 font-bold">
            <span className="material-symbols-outlined text-[13px]">verified</span>
            <span>Promoted Stream</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-bold">HD 1080p</span>
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
      el.innerHTML = "";
      const ins = document.createElement("ins");
      ins.className = `eas${AD_ZONES.SITE_HASH}17`;
      ins.setAttribute("data-zoneid", AD_ZONES.ON_STREAM_VIDEO_BANNER);
      ins.style.display = "block";
      ins.style.margin = "0 auto";
      el.appendChild(ins);

      const triggerScript = document.createElement("script");
      triggerScript.type = "application/javascript";
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
      console.warn("[ExoClick] On-stream banner mount error:", e);
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
          ?
        </button>
        <div ref={containerRef} className="w-full max-w-[468px] max-h-[60px] flex items-center justify-center overflow-hidden" />
      </div>
    </div>
  );
};

/**
 * Under-Player Banner Ad
 */
export const UnderPlayerBanner: React.FC<{ className?: string; reloadKey?: string | number }> = ({
  className = "",
  reloadKey,
}) => {
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  const renderAd = useCallback(() => {
    if (typeof window === "undefined") return;

    const isMobile = window.innerWidth < 1024;
    const targetRef = isMobile ? mobileContainerRef : desktopContainerRef;
    const el = targetRef.current;
    if (!el) return;

    try {
      el.innerHTML = "";
      const ins = document.createElement("ins");
      if (isMobile) {
        ins.className = `eas${AD_ZONES.SITE_HASH}10`;
        ins.setAttribute("data-zoneid", AD_ZONES.MOBILE_UNDER_PLAYER);
      } else {
        ins.className = `eas${AD_ZONES.SITE_HASH}2`;
        ins.setAttribute("data-zoneid", AD_ZONES.DESKTOP_UNDER_PLAYER);
      }
      ins.style.display = "block";
      ins.style.margin = "0 auto";
      el.appendChild(ins);

      const triggerScript = document.createElement("script");
      triggerScript.type = "application/javascript";
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
      console.warn("[ExoClick] Under-Player banner error:", e);
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
    window.addEventListener("exoclick-refresh-ads", handleTrigger);
    return () => window.removeEventListener("exoclick-refresh-ads", handleTrigger);
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
 * Native Recommendation Ad Widget (Multi-device: Desktop, Tablet, Mobile - Zone ID: 6010176)
 * Official ExoClick HTML5 Native Video Widget with Auto-Hover Preview & Touch Scrub
 */
/**
 * Native Recommendation Ad Widget (Multi-device: Desktop, Tablet, Mobile - Zone ID: 6010176)
 * Official ExoClick Recommendation Widget with Auto-Animated Live Previews on Hover/Touch
 */
export const NativeRecommendationAd: React.FC<{
  className?: string;
  title?: string;
  reloadKey?: string | number;
}> = ({ className = "", title = "Sponsored Recommendations", reloadKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoneId = AD_ZONES.NATIVE_RECOMMENDED || "6010176";

  const triggerAdServe = useCallback(() => {
    try {
      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });
    } catch {}
  }, []);

  const mountAd = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = "";

      // Ensure global ad-provider script exists
      if (!document.getElementById("exoclick-global-ad-provider")) {
        const sdk = document.createElement("script");
        sdk.id = "exoclick-global-ad-provider";
        sdk.type = "application/javascript";
        sdk.async = true;
        sdk.src = "https://a.magsrv.com/ad-provider.js";
        document.head.appendChild(sdk);
      }

      // Official ExoClick Recommendation ins element
      const ins = document.createElement("ins");
      ins.className = `eas${AD_ZONES.SITE_HASH}20`; // eas6a97888e20
      ins.setAttribute("data-zoneid", zoneId);
      ins.style.display = "block";
      ins.style.width = "100%";
      ins.style.margin = "0 auto";
      el.appendChild(ins);

      // Trigger script
      const triggerScript = document.createElement("script");
      triggerScript.type = "application/javascript";
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      triggerAdServe();
      setTimeout(triggerAdServe, 60);
      setTimeout(triggerAdServe, 200);
      setTimeout(triggerAdServe, 600);
    } catch (e) {
      console.warn("[ExoClick] Native recommendation widget mount error:", e);
    }
  }, [zoneId, triggerAdServe]);

  useEffect(() => {
    mountAd();
    const handleRefresh = () => {
      triggerAdServe();
    };
    window.addEventListener("exoclick-refresh-ads", handleRefresh);
    window.addEventListener("popstate", handleRefresh);
    window.addEventListener("pageshow", handleRefresh);
    return () => {
      window.removeEventListener("exoclick-refresh-ads", handleRefresh);
      window.removeEventListener("popstate", handleRefresh);
      window.removeEventListener("pageshow", handleRefresh);
    };
  }, [mountAd, triggerAdServe, reloadKey]);

  return (
    <section className={`native-recommendation-wrapper w-full my-4 ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-rose-500 text-lg">recommend</span>
          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white tracking-wide">{title}</h3>
        </div>
      )}
      <div ref={containerRef} className="w-full min-h-[160px] overflow-hidden" />
    </section>
  );
};

export const PopunderAd: React.FC = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const scriptId = "popmagicldr";
    if (document.getElementById(scriptId)) return;

    try {
      const isMobile = window.innerWidth < 1024;
      const zoneId = isMobile ? AD_ZONES.MOBILE_POPUNDER : AD_ZONES.DESKTOP_POPUNDER;

      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/javascript";
      script.async = true;
      script.src = "https://a.pemsrv.com/popunder1000.js";
      script.setAttribute("data-exo-idzone", zoneId);
      script.setAttribute("data-exo-frequency_period", "180");
      script.setAttribute("data-exo-frequency_count", "1");
      script.setAttribute("data-exo-trigger_method", "3");
      script.setAttribute("data-exo-capping_enabled", "true");
      script.setAttribute("data-exo-chrome_enabled", "true");
      script.setAttribute("data-exo-syndication_host", "s.pemsrv.com");
      script.setAttribute("data-exo-ads_host", "a.pemsrv.com");

      document.body.appendChild(script);
    } catch (e) {
      console.warn("[ExoClick] Popunder load error:", e);
    }
  }, []);

  return null;
};

export default AdBanner;
