import { useState, useEffect } from 'react';

export interface DeviceType {
  isMobile: boolean;  // < 768px
  isTablet: boolean;  // >= 768px && < 1024px
  isDesktop: boolean; // >= 1024px
  width: number;
  height: number;
}

export function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false, isDesktop: true, width: 1200, height: 800 };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      width: w,
      height: h,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: number | null = null;
    const handleResize = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        setDevice({
          isMobile: w < 768,
          isTablet: w >= 768 && w < 1024,
          isDesktop: w >= 1024,
          width: w,
          height: h,
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return device;
}
