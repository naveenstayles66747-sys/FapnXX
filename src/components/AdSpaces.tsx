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

// Global Interstitial Trigger Helper - non-blocking to protect INP performance
export const triggerInterstitial = () => {
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        window.dispatchEvent(new CustomEvent('exoclick-trigger-interstitial'));
      }, { timeout: 300 });
    } else {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('exoclick-trigger-interstitial'));
      }, 0);
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

export const StickyBottomLeaderboard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adInjected = useRef(false);

  useEffect(() => {
    // Strictly Desktop only (>= 1024px) to prevent duplicate triggers on mobile
    if (typeof window === 'undefined' || window.innerWidth < 1024 || adInjected.current) return;

    const inject = () => {
      try {
        if (containerRef.current && !adInjected.current) {
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
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(inject, { timeout: 1000 });
    } else {
      setTimeout(inject, 200);
    }
  }, []);

  return (
    <aside
      ref={containerRef}
      id="exoclick-sticky-leaderboard"
      aria-label="Sponsored Advertisement"
      className="hidden lg:flex fixed bottom-0 left-64 right-0 z-[120] justify-center items-center pointer-events-auto pb-1"
    />
  );
};

/**
 * Desktop Fullpage Interstitial (Zone ID: 6003174)
 * Tag:
 * <ins class="eas6a97888e35" data-zoneid="6003174"></ins>
 * <script>(AdProvider = window.AdProvider || []).push({"serve": {}});</script>
 */
export const DesktopFullpageInterstitial: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const serveInterstitial = () => {
    if (typeof window === 'undefined' || window.innerWidth < 1024) return;
    setTimeout(() => {
      try {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          const ins = document.createElement('ins');
          ins.className = `eas${EXOCLICK_ZONES.SITE_HASH}35`;
          ins.setAttribute('data-zoneid', EXOCLICK_ZONES.DESKTOP_INTERSTITIAL);
          ins.style.display = 'block';
          containerRef.current.appendChild(ins);

          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        }
      } catch (e) {
        console.warn('[ExoClick] Desktop Interstitial serve error:', e);
      }
    }, 100);
  };

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(serveInterstitial, { timeout: 2000 });
    } else {
      setTimeout(serveInterstitial, 500);
    }
  }, []);

  // Listen for video card or category clicks to trigger the fullpage interstitial on desktop
  useEffect(() => {
    const handleTrigger = () => {
      serveInterstitial();
    };

    window.addEventListener('exoclick-trigger-interstitial', handleTrigger);
    return () => window.removeEventListener('exoclick-trigger-interstitial', handleTrigger);
  }, []);

  return (
    <div
      ref={containerRef}
      id="exoclick-desktop-interstitial"
      className="hidden lg:block z-[99999]"
      aria-label="Sponsored Interstitial"
    />
  );
};

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
 * Outstream In-Feed Video Card Ad (Zone ID: 6003190)
 * Exact dimensions and layout matching regular VideoCard (16:9 aspect ratio, non-floating, in-grid placement)
 * Exact Tag:
 * <ins class="eas6a97888e37" data-zoneid="6003190"></ins>
 * <script>(AdProvider = window.AdProvider || []).push({"serve": {}});</script>
 */
export const OutstreamVideoCardAd: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`w-full flex items-center justify-center overflow-hidden my-1 rounded-xl bg-black border border-white/5 ${className}`}
      style={{ aspectRatio: '16/9', minHeight: '180px' }}
    >
      <iframe
        srcDoc={`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    ins { display: block !important; width: 100% !important; height: 100% !important; margin: 0 auto !important; }
    video, iframe { width: 100% !important; height: 100% !important; object-fit: cover !important; }
  </style>
  <script async type="application/javascript" src="https://a.magsrv.com/ad-provider.js"></script>
</head>
<body>
  <ins class="eas6a97888e37" data-zoneid="6003190"></ins>
  <script>(AdProvider = window.AdProvider || []).push({"serve": {}});</script>
</body>
</html>`}
        title="Advertisement"
        scrolling="no"
        frameBorder={0}
        className="w-full h-full border-none block bg-black"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </div>
  );
};

// InFeedAdCard alias for clean modular usage
export const InFeedAdCard = OutstreamVideoCardAd;

/**
 * On-Stream In-Video Overlay Banner Ad - Disabled to keep video player 100% unobstructed
 */
export const OnStreamVideoBanner: React.FC<{
  isVisible?: boolean;
  onClose?: () => void;
  mountKey?: number;
}> = () => null;

export default AdBanner;
