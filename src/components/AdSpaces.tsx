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

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = 'eas6a97888e35';
        ins.setAttribute('data-zoneid', '6003174');
        containerRef.current.appendChild(ins);

        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });
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
    // Only load on mobile viewports (< 1024px)
    if (typeof window === 'undefined' || window.innerWidth >= 1024 || adInjected.current) return;

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = 'eas6a97888e14';
        ins.setAttribute('data-zoneid', '6003178');
        containerRef.current.appendChild(ins);

        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });

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
    // Only load on mobile viewports (< 1024px)
    if (typeof window === 'undefined' || window.innerWidth >= 1024 || adInjected.current) return;

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = 'eas6a97888e33';
        ins.setAttribute('data-zoneid', '6003180');
        containerRef.current.appendChild(ins);

        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });

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

export default AdBanner;
