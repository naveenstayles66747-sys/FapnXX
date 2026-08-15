import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  position: 'banner_top' | 'banner_bottom' | 'card_inline' | 'sidebar';
  scriptUrl?: string;
  bannerImage?: string;
  targetUrl?: string;
  title?: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  position,
  scriptUrl,
  bannerImage,
  targetUrl = '#',
  title = 'Sponsored Advertisement',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scriptUrl || !containerRef.current) return;

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.setAttribute('data-ad-space', position);

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scriptUrl, position]);

  // If no banner image or script URL is configured, do not render any blank space
  if (!bannerImage && !scriptUrl) {
    return null;
  }

  if (position === 'card_inline') {
    return (
      <div
        ref={containerRef}
        className={`group relative bg-[#18181c] border border-amber-500/30 rounded-2xl overflow-hidden shadow-lg p-3 flex flex-col justify-between ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/30">
            Ad
          </span>
          <span className="text-[10px] text-white/50">{title}</span>
        </div>

        {bannerImage && (
          <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="block aspect-[16/9] w-full rounded-xl overflow-hidden">
            <img src={bannerImage} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full bg-[#121215] border border-white/10 rounded-xl p-2.5 flex items-center justify-center my-3 overflow-hidden ${className}`}
    >
      <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="block w-full max-w-4xl text-center">
        <img src={bannerImage} alt={title} className="max-h-24 w-full object-contain mx-auto rounded-lg" />
      </a>
    </div>
  );
};

/**
 * Pure 100% Zero-Wrapper Native Sticky Bottom Leaderboard (728x90):
 * - ZERO artificial black container bar
 * - ZERO artificial manual close button
 * - ZERO artificial blank placeholder space
 * - ExoClick renders its own raw ad and its own single native close button directly.
 */
export const StickyBottomLeaderboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 1024 || adInjected.current) return;

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = 'eas6a97888e17';
        ins.setAttribute('data-zoneid', '6003172');
        containerRef.current.appendChild(ins);

        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });

        adInjected.current = true;
      }
    } catch (e) {
      console.warn('[ExoClick] Error mounting sticky leaderboard:', e);
    }
  }, []);

  return (
    <aside
      ref={containerRef}
      id="exoclick-sticky-leaderboard"
      aria-label="Sponsored Advertisement"
      className="hidden lg:flex fixed bottom-0 left-64 right-0 z-[120] justify-center items-center pointer-events-none pb-1"
    />
  );
};

export const PopunderTrigger: React.FC<{ popunderUrl?: string }> = ({ popunderUrl }) => {
  useEffect(() => {
    if (!popunderUrl) return;

    let triggered = false;
    const handleFirstClick = () => {
      if (triggered) return;
      triggered = true;
      try {
        window.open(popunderUrl, '_blank');
      } catch (e) {
        console.warn('[AdSpaces] Pop-under blocked or prevented:', e);
      }
      window.removeEventListener('click', handleFirstClick);
    };

    window.addEventListener('click', handleFirstClick, { once: true });
    return () => window.removeEventListener('click', handleFirstClick);
  }, [popunderUrl]);

  return null;
};

/**
 * Desktop Fullpage Interstitial Ad (Zone ID: 6003174)
 */
export const DesktopFullpageInterstitial: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 1024 || adInjected.current) return;

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = 'eas6a97888e35';
        ins.setAttribute('data-zoneid', '6003174');
        containerRef.current.appendChild(ins);

        const script = document.createElement('script');
        script.type = 'application/javascript';
        script.innerHTML = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
        containerRef.current.appendChild(script);

        adInjected.current = true;
      }
    } catch (e) {
      console.warn('[ExoClick] Error serving interstitial ad:', e);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      id="exoclick-interstitial-container"
      className="hidden lg:block fixed top-0 left-0 z-[999999] pointer-events-none"
    />
  );
};

/**
 * Mobile Instant Message Ad (Zone ID: 6003178)
 * Renders an attractive floating chat/message style ad prompt on mobile devices (screens < 1024px)
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
        ins.className = 'eas6a97888e14';
        ins.setAttribute('data-zoneid', '6003178');
        containerRef.current.appendChild(ins);

        const script = document.createElement('script');
        script.type = 'application/javascript';
        script.innerHTML = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
        containerRef.current.appendChild(script);

        adInjected.current = true;
      }
    } catch (e) {
      console.warn('[ExoClick] Error serving mobile instant message ad:', e);
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
 * Mobile Fullpage Interstitial Ad (Zone ID: 6003180)
 * Serves a full-screen interstitial ad overlay when mobile users click video links/navigate
 */
export const MobileFullpageInterstitial: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 1024 || adInjected.current) return;

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = 'eas6a97888e33';
        ins.setAttribute('data-zoneid', '6003180');
        containerRef.current.appendChild(ins);

        const script = document.createElement('script');
        script.type = 'application/javascript';
        script.innerHTML = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
        containerRef.current.appendChild(script);

        adInjected.current = true;
      }
    } catch (e) {
      console.warn('[ExoClick] Error serving mobile interstitial ad:', e);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      id="exoclick-mobile-interstitial-container"
      className="block lg:hidden fixed top-0 left-0 z-[999999] pointer-events-none"
    />
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
      ins.className = 'eas6a97888e37';
      ins.setAttribute('data-zoneid', '6003190');
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
      className={`group relative flex flex-col bg-[#141416] dark:bg-[#141416] rounded-2xl border border-white/10 overflow-hidden shadow-lg p-2.5 transition-all duration-300 hover:border-[#e0358d]/50 hover:shadow-xl ${className}`}
    >
      {/* Video Card Header Badge */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-1.5">
        <span className="bg-[#e0358d]/20 text-[#e0358d] dark:text-[#ec4899] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#e0358d]/30">
          Sponsored
        </span>
        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs text-[#e0358d]">play_circle</span>
          Featured Video
        </span>
      </div>

      {/* 16:9 Video Canvas Slot */}
      <div
        ref={containerRef}
        className="w-full aspect-[16/9] bg-black/60 rounded-xl overflow-hidden flex items-center justify-center relative min-h-[180px]"
      />

      {/* Card Info Footer */}
      <div className="mt-2.5 px-1 flex items-center justify-between text-xs text-zinc-400">
        <span className="font-semibold text-zinc-200 truncate">Exclusive Partner Spotlight</span>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">HD 1080p</span>
      </div>
    </div>
  );
};

export default AdBanner;
