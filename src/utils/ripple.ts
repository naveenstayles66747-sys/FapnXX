/**
 * Material-style Glowing Ripple Click Effect
 * Automatically attaches to buttons with .btn-ripple or role="button"
 */
export function initRippleEffect(): () => void {
  if (typeof document === 'undefined') return () => {};

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    const target = (e.target as HTMLElement)?.closest('.btn-ripple, .btn-interactive, button, .category-pill') as HTMLElement | null;
    if (!target) return;

    // Create ripple span element
    const rect = target.getBoundingClientRect();
    const clientX = 'touches' in e && e.touches && e.touches.length > 0
      ? e.touches[0].clientX
      : (e as MouseEvent).clientX;
    const clientY = 'touches' in e && e.touches && e.touches.length > 0
      ? e.touches[0].clientY
      : (e as MouseEvent).clientY;

    if (clientX === undefined || clientY === undefined) return;

    const size = Math.max(rect.width, rect.height) * 2;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-wave';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    // Ensure relative positioning on target
    const currentPos = window.getComputedStyle(target).position;
    if (currentPos === 'static') {
      target.style.position = 'relative';
    }
    target.style.overflow = 'hidden';

    target.appendChild(ripple);

    // Auto cleanup after animation completes
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown);
  };
}
