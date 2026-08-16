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

// Global Interstitial Trigger Helper
let lastInterstitialTime = 0;
export const triggerInterstitial = (force = false) => {
  const now = Date.now();
  if (force || now - lastInterstitialTime > 45000) {
    lastInterstitialTime = now;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('exoclick-trigger-interstitial'));
    }
  }
};

interface AdBannerProps {
  position?: 'banner_top' | 'banner_bottom' | 'card_inline' | 'sidebar';
  zoneId?: string;
  className?: string;
}

/**
 * 100% Pure Zero-Wrapper Native ExoClick Banner Ad
 * Zero artificial badges, zero fake placeholders, zero border wrappers.
 */
export const AdBanner: React.FC<AdBannerProps> = ({
  position = 'banner_top',
  zoneId = EXOCLICK_ZONES.STICKY_LEADERBOARD,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adMounted = useRef(false);

  useEffect(() => {
    if (!containerRef.current || adMounted.current) return;

    try {
      containerRef.current.innerHTML = '';
      const ins = document.createElement('ins');
      ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}17`;
      ins.setAttribute('data-zoneid', zoneId || EXOCLICK_ZONES.STICKY_LEADERBOARD);
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      containerRef.current.appendChild(ins);

      const win = window as any;
      win.AdProvider = win.AdProvider || [];
      win.AdProvider.push({ serve: {} });

      adMounted.current = true;
    } catch (e) {
      console.warn('[ExoClick] AdBanner mount error:', e);
    }
  }, [zoneId]);

  return (
    <div
      ref={containerRef}
      className={`w-full flex items-center justify-center overflow-hidden my-2 ${className}`}
    />
  );
};

/**
 * Pure 100% Zero-Wrapper Native Sticky Bottom Leaderboard (728x90)
 */
export const StickyBottomLeaderboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || adInjected.current) return;

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
  }, []);

  return (
    <aside
      ref={containerRef}
      id="exoclick-sticky-leaderboard"
      aria-label="Sponsored Advertisement"
      className="fixed bottom-0 left-0 lg:left-64 right-0 z-[120] flex justify-center items-center pointer-events-auto pb-1"
    />
  );
};

/**
 * Fullscreen Interactive Interstitial Modal (Zones 6003174 Desktop & 6003180 Mobile)
 */
export const FullscreenInterstitialModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTrigger = () => {
      setIsOpen(true);
    };

    window.addEventListener('exoclick-trigger-interstitial', handleTrigger);
    return () => window.removeEventListener('exoclick-trigger-interstitial', handleTrigger);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      id="exoclick-interstitial-container"
      className="fixed inset-0 z-[99999] pointer-events-auto flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    />
  );
};

export const DesktopFullpageInterstitial: React.FC = () => <FullscreenInterstitialModal />;
export const MobileFullpageInterstitial: React.FC = () => null;

/**
 * Mobile Instant Message Ad (Zone ID: 6003178)
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
        ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}14`;
        ins.setAttribute('data-zoneid', EXOCLICK_ZONES.MOBILE_INSTANT_MSG);
        containerRef.current.appendChild(ins);

        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });

        adInjected.current = true;
      }
    } catch (e) {
      console.warn('[ExoClick] Mobile instant message error:', e);
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
 * Outstream Video Card Ad (Zone ID: 6003190)
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
      className={`group relative flex flex-col bg-[#141416] rounded-2xl border border-white/10 overflow-hidden shadow-lg p-2.5 ${className}`}
    >
      <div className="flex items-center justify-between px-1.5 py-1 mb-1.5">
        <span className="bg-[#e0358d]/20 text-[#e0358d] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#e0358d]/30">
          Sponsored
        </span>
        <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs text-[#e0358d]">play_circle</span>
          Featured Video
        </span>
      </div>

      <div
        ref={containerRef}
        className="w-full aspect-[16/9] bg-black/60 rounded-xl overflow-hidden flex items-center justify-center relative min-h-[180px]"
      />
    </div>
  );
};

/**
 * On-Stream In-Video Overlay Banner Ad ("on strem ad")
 */
export const OnStreamVideoBanner: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  targetUrl?: string;
  title?: string;
}> = ({
  isVisible,
  onClose,
  targetUrl = 'https://s.magsrv.com/v1/vast.php?idz=6003184',
  title = 'Featured Sponsor Ad',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    if (!isVisible || adInjected.current || !containerRef.current) return;

    try {
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
    } catch (e) {
      console.warn('[ExoClick] On-stream banner error:', e);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-35 flex justify-center pointer-events-auto">
      <div className="relative bg-black/80 backdrop-blur-md rounded-xl p-1 border border-white/10 flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-zinc-800 hover:bg-rose-600 rounded-full flex items-center justify-center text-white text-xs border border-white/20 shadow z-50 cursor-pointer"
        >
          ✕
        </button>
        <div ref={containerRef} className="min-h-[50px] min-w-[300px]" />
      </div>
    </div>
  );
};

export default AdBanner;
