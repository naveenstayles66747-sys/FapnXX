/**
 * Global Scroll Reveal & Fade-in Observer (Golden Rules Compliant)
 * 1. Animate transform + opacity only (GPU accelerated)
 * 2. Unobserve elements immediately to free GPU memory
 * 3. Batched rAF DOM scanning prevents layout thrashing
 * 4. Reduced-motion guard for accessibility & low-power modes
 */
export function initScrollReveal(): () => void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return () => {};

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    document.querySelectorAll('.fade-in-scroll').forEach((el) => el.classList.add('is-visible'));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Golden Rule: Free memory & GPU layers immediately after reveal
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -30px 0px',
      threshold: 0.02,
    }
  );

  let scanRafId: number | null = null;
  const observeElements = () => {
    if (scanRafId !== null) return;
    scanRafId = requestAnimationFrame(() => {
      scanRafId = null;
      const elements = document.querySelectorAll('.fade-in-scroll:not(.is-visible)');
      elements.forEach((el) => observer.observe(el));
    });
  };

  // Initial scan
  observeElements();

  // MutationObserver with rAF throttling for dynamic React feeds
  const mutationObserver = new MutationObserver(() => {
    observeElements();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    if (scanRafId !== null) cancelAnimationFrame(scanRafId);
    observer.disconnect();
    mutationObserver.disconnect();
  };
}
