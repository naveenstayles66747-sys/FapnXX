import { AD_CONFIG, AD_ZONES } from '../config/adConfig';

const SESSION_KEYS = {
  TRANSITION_COUNT: 'fapn_exo_trans_count',
  LAST_INTERSTITIAL: 'fapn_exo_last_interstitial',
  SESSION_COUNT: 'fapn_exo_session_count',
};

class AdManager {
  private getSessionStorage(key: string): string | null {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setSessionStorage(key: string, value: string): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      window.sessionStorage.setItem(key, value);
    } catch {}
  }

  /**
   * Get current count of eligible navigation/video transitions in this session.
   */
  public getEligibleTransitions(): number {
    const val = this.getSessionStorage(SESSION_KEYS.TRANSITION_COUNT);
    return val ? parseInt(val, 10) || 0 : 0;
  }

  /**
   * Record a valid navigation/video transition.
   * Only increments if targetVideoId is distinct from currentVideoId.
   */
  public recordEligibleTransition(targetId?: string, currentId?: string): boolean {
    if (!targetId || targetId === currentId) {
      return false;
    }
    const current = this.getEligibleTransitions();
    const next = current + 1;
    this.setSessionStorage(SESSION_KEYS.TRANSITION_COUNT, next.toString());
    return true;
  }

  /**
   * Timestamp of the last successfully initialized interstitial.
   */
  public getLastInterstitialTimestamp(): number {
    const val = this.getSessionStorage(SESSION_KEYS.LAST_INTERSTITIAL);
    return val ? parseInt(val, 10) || 0 : 0;
  }

  /**
   * Check if user is currently eligible for an interstitial.
   * Requires:
   * 1. At least AD_CONFIG.INTERSTITIAL_MIN_TRANSITIONS (2) transitions since last interstitial.
   * 2. At least AD_CONFIG.INTERSTITIAL_COOLDOWN_MS (3 mins) elapsed since last interstitial.
   */
  public canShowInterstitial(): boolean {
    if (AD_CONFIG.INTERSTITIAL_MIN_TRANSITIONS <= 1 && AD_CONFIG.INTERSTITIAL_COOLDOWN_MS <= 0) {
      return true;
    }

    const transitions = this.getEligibleTransitions();
    if (transitions < AD_CONFIG.INTERSTITIAL_MIN_TRANSITIONS) {
      return false;
    }

    const lastTime = this.getLastInterstitialTimestamp();
    const elapsed = Date.now() - lastTime;
    if (lastTime > 0 && elapsed < AD_CONFIG.INTERSTITIAL_COOLDOWN_MS) {
      return false;
    }

    return true;
  }

  /**
   * Request an interstitial display.
   * Decision & control only — does NOT touch DOM.
   * Returns true if eligible and event dispatched to AdSpaces component.
   * Returns false if ineligible (caller immediately continues video playback).
   */
  public requestInterstitial(action: string = 'video_click'): boolean {
    if (typeof window === 'undefined') return false;

    if (!this.canShowInterstitial()) {
      return false;
    }

    const isMobile = window.innerWidth < 1024;
    const zoneId = isMobile ? AD_ZONES.MOBILE_INTERSTITIAL : AD_ZONES.DESKTOP_INTERSTITIAL;

    window.dispatchEvent(
      new CustomEvent('exoclick-interstitial-request', {
        detail: {
          target: isMobile ? 'mobile' : 'desktop',
          zoneId,
          action,
          timestamp: Date.now(),
        },
      })
    );

    return true;
  }

  /**
   * Acknowledged by AdSpaces component when <ins> is mounted and AdProvider.push() completes without throwing.
   * Resets transition count to 0 and records cooldown timestamp.
   */
  public commitInterstitialSuccess(): void {
    const now = Date.now();
    this.setSessionStorage(SESSION_KEYS.LAST_INTERSTITIAL, now.toString());
    this.setSessionStorage(SESSION_KEYS.TRANSITION_COUNT, '0');

    const sessionCount = parseInt(this.getSessionStorage(SESSION_KEYS.SESSION_COUNT) || '0', 10) || 0;
    this.setSessionStorage(SESSION_KEYS.SESSION_COUNT, (sessionCount + 1).toString());
  }
}

export const adManager = new AdManager();

// Backwards-compatible global trigger wrapper
export const triggerInterstitial = (action?: string) => {
  return adManager.requestInterstitial(action);
};

/**
 * Global ExoClick Ad Refresh Trigger across all SPA navigation events:
 * - Back button (popstate)
 * - Logo click (Home navigation)
 * - Internal link clicks & Category/Video changes
 */
export const refreshExoClickAds = (context: string = 'navigation'): void => {
  if (typeof window === 'undefined') return;

  try {
    // 1. Dispatch custom refresh event for active React ad components
    window.dispatchEvent(
      new CustomEvent('exoclick-refresh-ads', {
        detail: { context, timestamp: Date.now() },
      })
    );

    // 2. Multi-burst trigger for ExoClick global AdProvider
    const trigger = () => {
      try {
        const win = window as any;
        win.AdProvider = win.AdProvider || [];
        win.AdProvider.push({ serve: {} });
      } catch {}
    };

    trigger();
    setTimeout(trigger, 80);
    setTimeout(trigger, 300);
    setTimeout(trigger, 800);
    setTimeout(trigger, 1600);
  } catch (e) {
    console.warn('[ExoClick] Ad refresh notice:', e);
  }
};
