import { useEffect, useRef } from "react";
import Lenis from "lenis";

interface UseLenisScrollOptions {
  enabled?: boolean;
  isPaused?: boolean;
}

export function useLenisScroll({ enabled = true, isPaused = false }: UseLenisScrollOptions = {}) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const isTouchDevice =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
        window.innerWidth <= 1024);

    // On mobile devices, native hardware scrolling is 120Hz smooth and zero-latency;
    // running JS virtual smooth scroll on mobile causes severe touch stutter & hanging.
    if (isTouchDevice) {
      return;
    }

    // Initialize Lenis for desktop mousewheel only
    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      infinite: false,
    });

    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  // Pause / resume scroll when modals, drawers, or fullscreen overlays are open
  useEffect(() => {
    if (!lenisRef.current) return;
    if (isPaused) {
      lenisRef.current.stop();
    } else {
      lenisRef.current.start();
    }
  }, [isPaused]);

  return lenisRef;
}
