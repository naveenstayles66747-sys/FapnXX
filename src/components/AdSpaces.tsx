import React, { useEffect, useRef, useState } from 'react';

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

    // Non-blocking asynchronous third-party ad script injection
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

        {bannerImage ? (
          <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="block aspect-[16/9] w-full rounded-xl overflow-hidden">
            <img src={bannerImage} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </a>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-amber-500/10 to-rose-500/10 rounded-xl flex items-center justify-center border border-white/5">
            <span className="text-xs text-white/70 font-semibold">{title}</span>
          </div>
        )}
      </div>
    );
  }

  // If no banner image or script URL is configured, hide placeholder completely
  if (!bannerImage && !scriptUrl) {
    return null;
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
 * Smart Sticky Bottom Leaderboard (728x90) for Web View:
 * - Listens for clicks on the ad iframe/content OR on ExoClick's native close button
 * - Instantly collapses the sticky bar AND the reserved bottom padding cleanly
 * - Re-opens cleanly after 30 seconds refresh cycle
 */
export const StickyBottomLeaderboard: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    if (!isVisible || !containerRef.current || adInjected.current) return;

    try {
      if (!document.getElementById('exoclick-ad-provider')) {
        const script = document.createElement('script');
        script.id = 'exoclick-ad-provider';
        script.type = 'application/javascript';
        script.async = true;
        script.src = 'https://a.magsrv.com/ad-provider.js';
        document.head.appendChild(script);
      }

      containerRef.current.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = 'eas6a97888e17';
      ins.setAttribute('data-zoneid', '6003172');
      ins.style.display = 'inline-block';
      ins.style.width = '728px';
      ins.style.height = '90px';
      containerRef.current.appendChild(ins);

      const serveScript = document.createElement('script');
      serveScript.innerHTML = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      containerRef.current.appendChild(serveScript);

      adInjected.current = true;
    } catch (e) {
      console.warn('[ExoClick] Error serving sticky bottom ad:', e);
    }
  }, [isVisible]);

  // Handle Close & Click-away dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    adInjected.current = false;
    // Re-surface cleanly after 30 seconds
    setTimeout(() => {
      setIsVisible(true);
    }, 30000);
  };

  // Detect when user clicks inside the ad or on native close elements
  useEffect(() => {
    if (!isVisible) return;

    // Window blur listener (fires when user clicks iframe ad or opens advertiser tab)
    const onWindowBlur = () => {
      if (document.activeElement && containerRef.current?.contains(document.activeElement)) {
        handleDismiss();
      }
    };

    // MutationObserver to watch if ExoClick script self-hides or closes
    const observer = new MutationObserver(() => {
      if (containerRef.current) {
        const ins = containerRef.current.querySelector('ins');
        if (ins && (ins.style.display === 'none' || ins.getAttribute('data-status') === 'closed')) {
          handleDismiss();
        }
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, { attributes: true, subtree: true });
    }

    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('blur', onWindowBlur);
      observer.disconnect();
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Dynamic Placeholder Gap: Expands page bottom so video feed naturally scrolls above ad */}
      <div className="hidden lg:block w-full h-[96px] shrink-0 pointer-events-none transition-all duration-300" />

      {/* Floating Sticky Bottom Banner Container (Desktop only: left-64 avoids sidebar collision) */}
      <aside
        ref={asideRef}
        aria-label="Sponsored Advertisement"
        className="hidden lg:flex fixed bottom-0 left-64 right-0 z-[120] items-center justify-center p-0 bg-transparent pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-6"
      >
        <div className="relative pointer-events-auto flex items-center justify-center shadow-[0_-8px_24px_rgba(0,0,0,0.6)] rounded-t-lg overflow-hidden bg-black">
          {/* ExoClick Mounting Point (ExoClick provides its own built-in clean close button & badge) */}
          <div
            ref={containerRef}
            onClick={handleDismiss}
            className="flex items-center justify-center"
          />
        </div>
      </aside>
    </>
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
    // Only load on desktop / laptop viewports
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;

    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const ins = document.createElement('ins');
        ins.className = 'eas6a97888e35';
        ins.setAttribute('data-zoneid', '6003174');
        containerRef.current.appendChild(ins);

        // Queue serve command to ExoClick AdProvider
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
      className="hidden lg:block"
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 999999, pointerEvents: 'none' }}
    />
  );
};

export default AdBanner;
