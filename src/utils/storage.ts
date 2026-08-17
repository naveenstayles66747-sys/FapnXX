import { CategoryInfo, LandingBanner, Video } from '../types';
import { CATEGORIES, INITIAL_LANDING_BANNERS, VIDEOS } from '../data';
import { db } from '../services/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

const KEYS = {
  AGE_VERIFIED: 'indianfullxx_age_verified',
  SAVED_VIDEOS: 'indianfullxx_saved_videos',
  LIKED_VIDEOS: 'indianfullxx_liked_videos',
  WATCH_HISTORY: 'indianfullxx_watch_history',
  CUSTOM_VIDEOS: 'indianfullxx_custom_videos',
  CUSTOM_CATEGORIES: 'indianfullxx_custom_categories',
  CUSTOM_BANNERS: 'indianfullxx_custom_banners',
  REPORTS: 'indianfullxx_dmca_reports',
  DEVICE_UID: 'fapnxx_device_uid',
};

/**
 * Single canonical Device UID generator & persistent reader
 */
export const getOrCreateDeviceId = (): string => {
  try {
    let id = localStorage.getItem(KEYS.DEVICE_UID);
    if (!id || id.trim() === '') {
      id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(KEYS.DEVICE_UID, id);
    }
    return id;
  } catch (err) {
    console.warn('[Storage] LocalStorage unavailable for device UID, using ephemeral fallback:', err);
    return 'dev_ephemeral_client';
  }
};

// Content Preference Persistence (Straight / Gay / Lesbian)
export const getStoredContentPreference = (): import('../types').ContentPreference => {
  try {
    const saved = localStorage.getItem('indianfullxx_content_preference');
    if (saved === 'straight' || saved === 'gay' || saved === 'lesbian') {
      return saved;
    }
  } catch (err) {
    console.warn('[Storage] Failed to read content preference:', err);
  }
  return 'straight';
};

export const setStoredContentPreference = (pref: import('../types').ContentPreference): void => {
  try {
    localStorage.setItem('indianfullxx_content_preference', pref);
  } catch (e) {
    console.warn('[Storage] Failed to persist content preference:', e);
  }
};

// Theme Persistence & Time-Based Auto Detection (6 AM - 6 PM Light, 6 PM - 6 AM Dark)
export type ThemeMode = 'light' | 'dark';

export const getInitialThemeMode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem('indianfullxx_theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch (err) {
    console.warn('[Storage] Failed to read theme preference:', err);
  }

  // Auto Time-based Default: 6:00 AM to 6:00 PM -> light, else dark
  const currentHour = new Date().getHours();
  return currentHour >= 6 && currentHour < 18 ? 'light' : 'dark';
};

export const setStoredThemeMode = (theme: ThemeMode): void => {
  try {
    localStorage.setItem('indianfullxx_theme', theme);
  } catch (e) {
    console.warn('[Storage] Failed to persist theme mode:', e);
  }
};

// Age Verification UI Gate Disclaimer
const AGE_VERIFICATION_EXPIRY_MS = 18 * 60 * 60 * 1000; // 18 Hours

export const getStoredAgeVerified = (): boolean => {
  try {
    const verified = localStorage.getItem(KEYS.AGE_VERIFIED) === 'true';
    if (!verified) return false;
    const timestampStr = localStorage.getItem('indianfullxx_age_verified_timestamp');
    if (!timestampStr) return false;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;
    const isStillValid = Date.now() - timestamp < AGE_VERIFICATION_EXPIRY_MS;
    if (!isStillValid) {
      localStorage.removeItem(KEYS.AGE_VERIFIED);
      localStorage.removeItem('indianfullxx_age_verified_timestamp');
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const setStoredAgeVerified = (verified: boolean): void => {
  try {
    if (verified) {
      localStorage.setItem(KEYS.AGE_VERIFIED, 'true');
      localStorage.setItem('indianfullxx_age_verified_timestamp', Date.now().toString());
    } else {
      localStorage.removeItem(KEYS.AGE_VERIFIED);
      localStorage.removeItem('indianfullxx_age_verified_timestamp');
    }
  } catch (e) {
    console.warn('[Storage] Failed to set age gate status:', e);
  }
};

// Watch History
export interface HistoryItem {
  videoId: string;
  watchedAt: number;
}

// User Interaction Sync Dispatcher
type UserInteractionSyncData = {
  savedVideos?: string[];
  likedVideos?: string[];
  watchHistory?: HistoryItem[];
  contentPreference?: string;
};

type SyncListener = (data: UserInteractionSyncData) => void;
const syncListeners: SyncListener[] = [];

export const registerUserInteractionSync = (listener: SyncListener): (() => void) => {
  syncListeners.push(listener);
  return () => {
    const idx = syncListeners.indexOf(listener);
    if (idx !== -1) syncListeners.splice(idx, 1);
  };
};

const notifyInteractionSync = (data: UserInteractionSyncData): void => {
  // 1. Direct Cloud Firestore synchronization to 'user_interactions' collection using persistent device ID
  try {
    const devId = getOrCreateDeviceId();
    setDoc(
      doc(db, 'user_interactions', devId),
      {
        ...data,
        deviceId: devId,
        lastActiveAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch((err) => {
      console.warn('[Firestore] Sync user interactions notice:', err?.message);
    });
  } catch (err) {
    console.warn('[Firestore] Sync user interactions error:', err);
  }

  // 2. Dispatch to local subscribers
  syncListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.warn('[Storage] Sync listener error:', e);
    }
  });
};

/**
 * Merges Cloud Interactions with Local Interactions (Conflict Resolution & Union)
 */
export const mergeUserInteractions = (cloudData: {
  savedVideos?: string[];
  likedVideos?: string[];
  watchHistory?: HistoryItem[];
  contentPreference?: string;
}): {
  savedVideos: string[];
  likedVideos: string[];
  watchHistory: HistoryItem[];
  contentPreference: string;
} => {
  const localSaved = getStoredSavedVideos();
  const localLiked = getStoredLikedVideos();
  const localHistory = getStoredWatchHistory();
  const localPref = getStoredContentPreference();

  // 1. Union of Bookmarks
  const mergedSaved = Array.from(new Set([...(cloudData.savedVideos || []), ...localSaved]));
  try {
    localStorage.setItem(KEYS.SAVED_VIDEOS, JSON.stringify(mergedSaved));
  } catch {}

  // 2. Union of Liked Videos
  const mergedLiked = Array.from(new Set([...(cloudData.likedVideos || []), ...localLiked]));
  try {
    localStorage.setItem(KEYS.LIKED_VIDEOS, JSON.stringify(mergedLiked));
  } catch {}

  // 3. Merge Watch History by videoId keeping most recent timestamp
  const historyMap = new Map<string, number>();
  (cloudData.watchHistory || []).forEach((item) => {
    if (item && item.videoId) {
      historyMap.set(item.videoId, item.watchedAt || 0);
    }
  });
  localHistory.forEach((item) => {
    if (item && item.videoId) {
      const existing = historyMap.get(item.videoId) || 0;
      if ((item.watchedAt || 0) >= existing) {
        historyMap.set(item.videoId, item.watchedAt || 0);
      }
    }
  });
  const mergedHistory: HistoryItem[] = Array.from(historyMap.entries())
    .map(([videoId, watchedAt]) => ({ videoId, watchedAt }))
    .sort((a, b) => b.watchedAt - a.watchedAt)
    .slice(0, 100);

  try {
    localStorage.setItem(KEYS.WATCH_HISTORY, JSON.stringify(mergedHistory));
  } catch {}

  const finalPref = cloudData.contentPreference || localPref || 'straight';

  return {
    savedVideos: mergedSaved,
    likedVideos: mergedLiked,
    watchHistory: mergedHistory,
    contentPreference: finalPref,
  };
};

// Saved Videos (Bookmarks)
export const getStoredSavedVideos = (): string[] => {
  try {
    const data = localStorage.getItem(KEYS.SAVED_VIDEOS);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn('[Storage] Failed to read saved videos cache:', err);
    return [];
  }
};

export const setStoredSavedVideos = (saved: string[]): void => {
  try {
    localStorage.setItem(KEYS.SAVED_VIDEOS, JSON.stringify(saved));
    notifyInteractionSync({ savedVideos: saved });
  } catch (e) {
    console.warn('[Storage] Failed to persist saved videos:', e);
  }
};

export const toggleStoredSavedVideo = (videoId: string): string[] => {
  try {
    const current = getStoredSavedVideos();
    const updated = current.includes(videoId)
      ? current.filter((id) => id !== videoId)
      : [...current, videoId];
    localStorage.setItem(KEYS.SAVED_VIDEOS, JSON.stringify(updated));
    notifyInteractionSync({ savedVideos: updated });
    return updated;
  } catch (err) {
    console.warn('[Storage] Failed to toggle saved video:', err);
    return [];
  }
};

// Liked Videos
export const getStoredLikedVideos = (): string[] => {
  try {
    const data = localStorage.getItem(KEYS.LIKED_VIDEOS);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn('[Storage] Failed to read liked videos cache:', err);
    return [];
  }
};

export const setStoredLikedVideos = (liked: string[]): void => {
  try {
    localStorage.setItem(KEYS.LIKED_VIDEOS, JSON.stringify(liked));
    notifyInteractionSync({ likedVideos: liked });
  } catch (e) {
    console.warn('[Storage] Failed to persist liked videos:', e);
  }
};

export const toggleStoredLikedVideo = (videoId: string): string[] => {
  try {
    const current = getStoredLikedVideos();
    const updated = current.includes(videoId)
      ? current.filter((id) => id !== videoId)
      : [...current, videoId];
    localStorage.setItem(KEYS.LIKED_VIDEOS, JSON.stringify(updated));
    notifyInteractionSync({ likedVideos: updated });
    return updated;
  } catch (err) {
    console.warn('[Storage] Failed to toggle liked video:', err);
    return [];
  }
};

// Watch History
export const getStoredWatchHistory = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(KEYS.WATCH_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.warn('[Storage] Failed to read watch history cache:', err);
    return [];
  }
};

export const addToStoredWatchHistory = (videoId: string): HistoryItem[] => {
  try {
    const current = getStoredWatchHistory().filter((item) => item.videoId !== videoId);
    const updated: HistoryItem[] = [{ videoId, watchedAt: Date.now() }, ...current].slice(0, 100);
    localStorage.setItem(KEYS.WATCH_HISTORY, JSON.stringify(updated));
    notifyInteractionSync({ watchHistory: updated });
    return updated;
  } catch (err) {
    console.warn('[Storage] Failed to add to watch history:', err);
    return [];
  }
};

export const addStoredWatchHistory = addToStoredWatchHistory;

export const clearStoredWatchHistory = (): void => {
  try {
    localStorage.removeItem(KEYS.WATCH_HISTORY);
    notifyInteractionSync({ watchHistory: [] });
  } catch (e) {
    console.warn('[Storage] Failed to clear watch history:', e);
  }
};

// Videos Cache (Client-side offline cache only)
export const getStoredVideos = (): Video[] => {
  try {
    const data = localStorage.getItem(KEYS.CUSTOM_VIDEOS);
    if (!data) return VIDEOS;
    const parsed: Video[] = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : VIDEOS;
  } catch (err) {
    console.warn('[Storage] Failed to parse cached videos, fallback to defaults:', err);
    return VIDEOS;
  }
};

export const setStoredVideos = (videos: Video[]): void => {
  try {
    localStorage.setItem(KEYS.CUSTOM_VIDEOS, JSON.stringify(videos));
  } catch (e) {
    console.warn('[Storage] LocalStorage video cache write notice:', e);
  }
};

// Categories Cache
export const getStoredCategories = (): CategoryInfo[] => {
  try {
    const data = localStorage.getItem(KEYS.CUSTOM_CATEGORIES);
    if (!data) return CATEGORIES;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CATEGORIES;
  } catch (err) {
    console.warn('[Storage] Failed to parse cached categories:', err);
    return CATEGORIES;
  }
};

export const setStoredCategories = (categories: CategoryInfo[]): void => {
  try {
    localStorage.setItem(KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.warn('[Storage] LocalStorage categories cache write notice:', e);
  }
};

// Banners Cache
export const getStoredBanners = (): LandingBanner[] => {
  try {
    const data = localStorage.getItem(KEYS.CUSTOM_BANNERS);
    if (!data) return INITIAL_LANDING_BANNERS;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_LANDING_BANNERS;
  } catch (err) {
    console.warn('[Storage] Failed to parse cached banners:', err);
    return INITIAL_LANDING_BANNERS;
  }
};

export const setStoredBanners = (banners: LandingBanner[]): void => {
  try {
    localStorage.setItem(KEYS.CUSTOM_BANNERS, JSON.stringify(banners));
  } catch (e) {
    console.warn('[Storage] LocalStorage banners cache write notice:', e);
  }
};

// DMCA Reports Cache
export const getStoredReports = (): any[] => {
  try {
    const data = localStorage.getItem(KEYS.REPORTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const setStoredReports = (reports: any[]): void => {
  try {
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
  } catch (e) {
    console.warn('[Storage] LocalStorage reports cache write notice:', e);
  }
};

export const addStoredReport = (report: any): any[] => {
  try {
    const current = getStoredReports();
    const updated = [report, ...current];
    setStoredReports(updated);
    return updated;
  } catch {
    return [];
  }
};
