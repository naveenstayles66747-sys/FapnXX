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

// Global Interstitial Trigger Helper with Smart Frequency Capping (Every 60 seconds or on video click)
let lastInterstitialTime = 0;
export const triggerInterstitial = (force = false) => {
  const now = Date.now();
  if (force || now - lastInterstitialTime > 60000) {
    lastInterstitialTime = now;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('exoclick-trigger-interstitial'));
    }
  }
};

interface AdBannerProps {
  position: 'banner_top' | 'banner_bottom' | 'card_inline' | 'sidebar';
  zoneId?: string;
  scriptUrl?: string;
  bannerImage?: string;
  targetUrl?: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

// Curated high-converting fallback sponsor creatives when ad networks experience geo no-fill
const FALLBACK_SPONSORS = [
  {
    title: 'FapnXX VIP Live Cams',
    subtitle: '10,000+ Verified Private Performers Online Now',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    targetUrl: 'https://fapnxx.com/vip-cams',
    tag: 'SPONSORED 4K',
  },
  {
    title: 'Unlimited Ultra HD Pass',
    subtitle: 'Zero Buffering • 60 FPS VR & Full Uncut Scenes',
    bannerImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80',
    targetUrl: 'https://fapnxx.com/premium',
    tag: 'VIP ACCESS',
  },
];

/**
 * Modern Responsive Ad Banner for Header, In-Feed, and View Page
 */
export const AdBanner: React.FC<AdBannerProps> = ({
  position,
  zoneId = EXOCLICK_ZONES.STICKY_LEADERBOARD,
  scriptUrl,
  bannerImage,
  targetUrl = 'https://fapnxx.com/premium',
  title = 'Exclusive Partner Sponsor',
  subtitle = 'Discover unlimited 4K Ultra-HD streaming & private live shows',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adMounted, setAdMounted] = useState(false);

  // Pick fallback sponsor
  const fallback = FALLBACK_SPONSORS[position === 'banner_top' ? 0 : 1];
  const activeImage = bannerImage || fallback.bannerImage;
  const activeTitle = title !== 'Sponsored Advertisement' && title !== 'Featured Sponsor' && title !== 'Featured Partner Sponsor' ? title : fallback.title;
  const activeSubtitle = subtitle || fallback.subtitle;

  useEffect(() => {
    if (!containerRef.current || adMounted) return;

    try {
      // Mount ExoClick <ins> tag
      const ins = document.createElement('ins');
      ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}17`;
      ins.setAttribute('data-zoneid', zoneId || EXOCLICK_ZONES.STICKY_LEADERBOARD);
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      containerRef.current.appendChild(ins);

      // Trigger ExoClick AdProvider SDK
      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      setAdMounted(true);
    } catch (e) {
      console.warn('[ExoClick] AdBanner mount error:', e);
    }
  }, [zoneId, adMounted]);

  if (position === 'card_inline') {
    return (
      <div
        className={`group relative bg-[#18181c] border border-amber-500/30 rounded-2xl overflow-hidden shadow-lg p-3 flex flex-col justify-between hover:border-amber-500/60 transition-all ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">campaign</span>
            <span>Sponsored</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[150px]">{activeTitle}</span>
        </div>

        <div ref={containerRef} className="w-full flex justify-center items-center min-h-[140px] relative rounded-xl overflow-hidden">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-[16/9] w-full rounded-xl overflow-hidden relative group/img"
          >
            <img
              src={activeImage}
              alt={activeTitle}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
              <span className="text-xs font-bold text-white leading-tight drop-shadow">{activeTitle}</span>
              <span className="text-[10px] text-amber-300 font-medium flex items-center gap-1 mt-0.5">
                <span>Explore Sponsor</span>
                <span className="material-symbols-outlined text-[10px]">open_in_new</span>
              </span>
            </div>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full bg-[#121215] border border-white/10 rounded-2xl p-2 sm:p-3 my-2 sm:my-3 overflow-hidden transition-all shadow-md hover:border-rose-500/30 ${className}`}
    >
      <div className="flex items-center justify-between px-1 mb-1.5 text-[10px] text-zinc-400">
        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="material-symbols-outlined text-[10px]">ads_click</span>
          <span>Sponsored Recommendation</span>
        </span>
        <span className="text-zinc-500 hidden sm:inline">ExoClick Verified Ad Zone</span>
      </div>

      <div ref={containerRef} className="w-full flex justify-center items-center min-h-[70px] sm:min-h-[90px] relative">
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between gap-3 p-2 bg-gradient-to-r from-[#1f1d24] via-[#16161a] to-[#1f1d24] hover:from-[#2a2632] hover:to-[#2a2632] rounded-xl border border-white/5 transition-all group cursor-pointer"
        >
          <div className="w-16 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden shrink-0 border border-white/10 relative">
            <img src={activeImage} alt={activeTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                {activeTitle}
              </h4>
              <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                HD
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 line-clamp-1 mt-0.5">{activeSubtitle}</p>
          </div>
          <div className="shrink-0 hidden xs:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-md">
            <span>Visit</span>
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </div>
        </a>
      </div>
    </div>
  );
};

/**
 * Sticky Bottom Leaderboard (Zone 6003172 - 728x90 Desktop / Responsive Mobile)
 */
export const StickyBottomLeaderboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const adInjected = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || adInjected.current || isDismissed) return;

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
  }, [isDismissed]);

  if (isDismissed) return null;

  return (
    <aside
      id="exoclick-sticky-leaderboard"
      aria-label="Sponsored Advertisement"
      className="fixed bottom-0 left-0 lg:left-64 right-0 z-[120] bg-black/90 backdrop-blur-md border-t border-white/10 flex flex-col items-center justify-center pointer-events-auto shadow-2xl py-1 px-2"
    >
      <div className="w-full max-w-4xl flex items-center justify-between px-2 text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Sponsored Banner</span>
        </span>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer hover:underline"
          title="Close Ad"
        >
          <span>Hide</span>
          <span className="material-symbols-outlined text-xs">close</span>
        </button>
      </div>

      <div ref={containerRef} className="w-full min-h-[50px] sm:min-h-[90px] flex items-center justify-center overflow-hidden">
        {/* Dynamic Fallback if Adblocker / No-fill occurs */}
        <a
          href="https://fapnxx.com/live"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-2xl py-1 px-3 bg-gradient-to-r from-rose-900/40 via-purple-900/40 to-rose-900/40 border border-rose-500/30 rounded-lg flex items-center justify-between text-xs text-white hover:border-rose-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-rose-600 text-white font-extrabold text-[9px] rounded">LIVE</span>
            <span className="font-bold truncate text-[11px] sm:text-xs">🔥 Watch Private 4K Webcams — Free VIP Pass</span>
          </div>
          <span className="px-2.5 py-0.5 bg-white text-black font-extrabold text-[10px] rounded uppercase shrink-0">
            Join Now
          </span>
        </a>
      </div>
    </aside>
  );
};

/**
 * Fullscreen Interactive Interstitial Modal (Zones 6003174 Desktop & 6003180 Mobile)
 */
export const FullscreenInterstitialModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTrigger = () => {
      setIsOpen(true);
      setCountdown(5);
      setCanSkip(false);
    };

    window.addEventListener('exoclick-trigger-interstitial', handleTrigger);
    return () => window.removeEventListener('exoclick-trigger-interstitial', handleTrigger);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Mount ExoClick Interstitial tag inside modal
    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const isMobile = window.innerWidth < 1024;
        const ins = document.createElement('ins');
        ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}${isMobile ? '33' : '35'}`;
        ins.setAttribute('data-zoneid', isMobile ? EXOCLICK_ZONES.MOBILE_INTERSTITIAL : EXOCLICK_ZONES.DESKTOP_INTERSTITIAL);
        ins.style.display = 'block';
        ins.style.margin = '0 auto';
        containerRef.current.appendChild(ins);

        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });
      }
    } catch (e) {
      console.warn('[ExoClick] Interstitial error:', e);
    }

    // 5s Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="w-full max-w-3xl flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-amber-500 text-black font-extrabold text-[10px] uppercase rounded">
            Advertisement
          </span>
          <span className="text-xs text-zinc-400 font-medium">Sponsored Showcase</span>
        </div>

        {canSkip ? (
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <span>Skip Ad & Continue</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        ) : (
          <div className="px-3 py-1 bg-white/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Skip in {countdown}s</span>
          </div>
        )}
      </div>

      {/* Main Interstitial Ad Body */}
      <div className="w-full max-w-3xl bg-[#131217] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        <div ref={containerRef} className="w-full min-h-[250px] sm:min-h-[350px] flex items-center justify-center relative my-2">
          {/* Fallback Interactive Sponsor Showcase */}
          <div className="w-full flex flex-col items-center space-y-4">
            <div className="relative w-full max-w-lg aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20 group">
              <img
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80"
                alt="Featured Partner"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-4 text-left">
                <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase rounded w-max mb-1">
                  PREMIUM 4K ACCESS
                </span>
                <h3 className="text-base sm:text-xl font-extrabold text-white">
                  FapnXX VIP Club & Live 1-on-1 Encounters
                </h3>
                <p className="text-xs text-zinc-300 line-clamp-2 mt-1">
                  Enjoy uncut streaming in 60FPS with ultra-fast CDN nodes and exclusive adult creator content.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md pt-2">
              <a
                href="https://fapnxx.com/vip-cams"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <span>Unlock VIP Access Now</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
              <button
                onClick={() => setIsOpen(false)}
                className="py-3 px-5 bg-white/10 hover:bg-white/20 text-zinc-300 font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Aliases for legacy compatibility
export const DesktopFullpageInterstitial: React.FC = () => <FullscreenInterstitialModal />;
export const MobileFullpageInterstitial: React.FC = () => null;

/**
 * Mobile Instant Message Ad (Zone ID: 6003178)
 * Renders an interactive floating chat prompt at the bottom-right on mobile devices (< 1024px)
 */
export const MobileInstantMessage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024 || isDismissed) return;

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
      }
    } catch (e) {
      console.warn('[ExoClick] Mobile instant message error:', e);
    }
  }, [isDismissed]);

  if (isDismissed) return null;

  return (
    <div
      id="exoclick-mobile-instant-message"
      className="block lg:hidden fixed bottom-20 right-3 z-[115] pointer-events-auto max-w-[280px] animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-[#18181c] border border-rose-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-xl relative">
        {/* Close Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-800 hover:bg-rose-600 rounded-full flex items-center justify-center text-white border border-white/20 text-xs shadow cursor-pointer"
          title="Dismiss message"
        >
          ✕
        </button>

        <a
          href="https://fapnxx.com/live"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2.5 cursor-pointer group"
        >
          {/* Avatar with online dot */}
          <div className="relative shrink-0">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
              alt="Live Performer"
              className="w-10 h-10 rounded-full object-cover border border-rose-500/50"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#18181c]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-rose-400 truncate">Priya (Live Now)</span>
              <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.2 rounded-full">1</span>
            </div>
            <p className="text-[10px] text-zinc-300 line-clamp-2 mt-0.5 group-hover:text-white transition-colors">
              Hey! I am streaming live in private. Want to chat with me? 🔥
            </p>
            <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider mt-1 block">
              Tap to Reply »
            </span>
          </div>
        </a>

        {/* Hidden Container for ExoClick Tag Injection */}
        <div ref={containerRef} className="hidden" />
      </div>
    </div>
  );
};

/**
 * Outstream Video Card Ad (Zone ID: 6003190)
 * Sits naturally inside the video feed grid. Autoplays when scrolled into view.
 */
export const OutstreamVideoCardAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    if (adInjected.current || !containerRef.current) return;

    try {
      containerRef.current.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}37`;
      ins.setAttribute('data-zoneid', EXOCLICK_ZONES.OUTSTREAM_VIDEO);
      ins.style.display = 'block';
      ins.style.width = '100%';
      containerRef.current.appendChild(ins);

      const script = document.createElement('script');
      script.type = 'application/javascript';
      script.innerHTML = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      containerRef.current.appendChild(script);

      adInjected.current = true;
    } catch (e) {
      console.warn('[ExoClick] Error serving outstream video ad:', e);
    }
  }, []);

  return (
    <div
      className={`group relative flex flex-col bg-[#141416] dark:bg-[#141416] rounded-2xl border border-white/10 overflow-hidden shadow-lg p-2.5 transition-all duration-300 hover:border-rose-500/50 hover:shadow-xl ${className}`}
    >
      {/* Video Card Header Badge */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-1.5">
        <span className="bg-rose-600/20 text-rose-400 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">verified</span>
          <span>Featured Partner</span>
        </span>
        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs text-rose-500">play_circle</span>
          <span>Outstream 4K</span>
        </span>
      </div>

      {/* 16:9 Video Canvas Slot */}
      <div
        ref={containerRef}
        className="w-full aspect-[16/9] bg-black/80 rounded-xl overflow-hidden flex items-center justify-center relative min-h-[180px]"
      >
        {/* Dynamic Fallback Teaser Video */}
        <a
          href="https://fapnxx.com/vip"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center group/card cursor-pointer"
        >
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"
            alt="Outstream Sponsor"
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover/card:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">play_arrow</span>
            </div>
          </div>
        </a>
      </div>

      {/* Card Info Footer */}
      <div className="mt-2.5 px-1 flex items-center justify-between text-xs text-zinc-400">
        <span className="font-semibold text-zinc-200 truncate">Exclusive VIP Partner Stream</span>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">HD 1080p</span>
      </div>
    </div>
  );
};

/**
 * On-Stream In-Video Overlay Banner Ad ("on strem ad")
 * Sits at the bottom 15% of the video player while the video is playing or paused
 */
export const OnStreamVideoBanner: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  targetUrl?: string;
  title?: string;
}> = ({
  isVisible,
  onClose,
  targetUrl = 'https://fapnxx.com/live',
  title = '🔥 Chat Live with Indian Performers Tonight',
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-12 left-2 right-2 sm:left-6 sm:right-6 z-35 animate-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
      <div className="w-full max-w-xl mx-auto bg-black/85 backdrop-blur-md border border-rose-500/50 rounded-xl p-2 sm:p-2.5 shadow-2xl flex items-center justify-between gap-2 sm:gap-3 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 bg-rose-600 text-white font-black text-[9px] uppercase rounded shrink-0">
            AD
          </span>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] sm:text-xs font-bold text-zinc-100 hover:text-rose-400 transition-colors truncate"
          >
            {title}
          </a>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-[10px] sm:text-xs rounded-lg uppercase tracking-wide flex items-center gap-1 transition-all"
          >
            <span>Visit</span>
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 hover:bg-white/20 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Close banner"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
