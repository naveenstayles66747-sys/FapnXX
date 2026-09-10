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
   * 1. At least AD_CONFIG.INTERSTITIAL_MIN_TRANSITIONS (3) video card clicks since last interstitial.
   * 2. At least AD_CONFIG.INTERSTITIAL_COOLDOWN_MS (20s) elapsed since last interstitial.
   */
  public canShowInterstitial(): boolean {
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
   * Safe Popunder trigger: ONLY injects and triggers popunder when user has clicked 3 or more video cards
   */
  public triggerPopunderIfEligible(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    try {
      const isMobile =
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const targetZoneId = isMobile ? AD_ZONES.MOBILE_POPUNDER || '6010174' : AD_ZONES.DESKTOP_POPUNDER || '6010172';

      // Remove any existing loader tag so it fresh re-triggers for this session event
      const oldScript = document.getElementById('popmagicldr');
      if (oldScript && oldScript.parentNode) {
        oldScript.parentNode.removeChild(oldScript);
      }

      const adConfig: Record<string, any> = {
        ads_host: 'a.pemsrv.com',
        syndication_host: 's.pemsrv.com',
        idzone: targetZoneId,
        popup_fallback: true,
        popup_force: false,
        chrome_enabled: true,
        new_tab: true,
        frequency_period: 60,
        frequency_count: 1,
        trigger_method: 3,
        trigger_class: '',
        trigger_delay: 0,
        capping_enabled: true,
        tcf_enabled: true,
        agego_cross_site_enabled: true,
        only_inline: false,
      };

      const s = document.createElement('script');
      s.type = 'application/javascript';
      s.async = true;
      s.src = `https://${adConfig.ads_host}/popunder1000.js`;
      s.id = 'popmagicldr';
      for (const key in adConfig) {
        if (Object.prototype.hasOwnProperty.call(adConfig, key) && key !== 'ads_host' && key !== 'syndication_host') {
          s.setAttribute(`data-exo-${key}`, adConfig[key]);
        }
      }
      document.body.appendChild(s);
    } catch (e) {
      console.warn('[ExoClick] Popunder trigger notice:', e);
    }
  }

  /**
   * Request an interstitial display.
   * Decision & control only — does NOT touch DOM.
   * Returns true if eligible (>= 3 card clicks) and event dispatched to AdSpaces component.
   * Returns false if ineligible (< 3 card clicks), allowing user to browse uninterrupted.
   */
  public requestInterstitial(action: string = 'video_click'): boolean {
    if (typeof window === 'undefined') return false;

    if (!this.canShowInterstitial()) {
      return false;
    }

    // Reset transition count & record timestamp
    this.commitInterstitialSuccess();

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

    // Trigger popunder for this 3+ card threshold event
    this.triggerPopunderIfEligible();

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
let refreshDebounceTimer: any = null;

export const refreshExoClickAds = (context: string = 'navigation'): void => {
  if (typeof window === 'undefined') return;

  try {
    if (refreshDebounceTimer) {
      clearTimeout(refreshDebounceTimer);
    }

    refreshDebounceTimer = setTimeout(() => {
      // 1. Dispatch custom refresh event for active React ad components
      window.dispatchEvent(
        new CustomEvent('exoclick-refresh-ads', {
          detail: { context, timestamp: Date.now() },
        })
      );

      // 2. Trigger ExoClick global AdProvider
      const trigger = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      trigger();
      setTimeout(trigger, 150);
    }, 60);
  } catch (e) {
    console.warn('[ExoClick] Ad refresh notice:', e);
  }
};
