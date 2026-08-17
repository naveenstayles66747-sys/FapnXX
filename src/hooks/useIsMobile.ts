import { useState, useEffect } from 'react';

// Single shared state across all components to avoid duplicate window resize listeners
let globalIsMobile: boolean = typeof window !== 'undefined'
  ? (window.innerWidth <= 768 || (Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) && window.innerWidth <= 1024))
  : false;

const listeners = new Set<(isMobile: boolean) => void>();

if (typeof window !== 'undefined') {
  let timeoutId: any = null;
  const update = () => {
    const isSmallScreen = window.innerWidth <= 768;
    const isCoarseTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 1024;
    const nextVal = Boolean(isSmallScreen || isCoarseTouch);
    if (nextVal !== globalIsMobile) {
      globalIsMobile = nextVal;
      listeners.forEach((fn) => fn(nextVal));
    }
  };

  window.addEventListener('resize', () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(update, 150);
  }, { passive: true });
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(globalIsMobile);

  useEffect(() => {
    const handler = (val: boolean) => setIsMobile(val);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return isMobile;
}
