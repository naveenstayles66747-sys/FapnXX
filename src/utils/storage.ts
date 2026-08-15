import { CategoryInfo, LandingBanner, Video } from '../types';
import { CATEGORIES, INITIAL_LANDING_BANNERS, VIDEOS } from '../data';

const KEYS = {
  AGE_VERIFIED: 'indianfullxx_age_verified',
  SAVED_VIDEOS: 'indianfullxx_saved_videos',
  LIKED_VIDEOS: 'indianfullxx_liked_videos',
  WATCH_HISTORY: 'indianfullxx_watch_history',
  CUSTOM_VIDEOS: 'indianfullxx_custom_videos',
  CUSTOM_CATEGORIES: 'indianfullxx_custom_categories',
  CUSTOM_BANNERS: 'indianfullxx_custom_banners',
  REPORTS: 'indianfullxx_dmca_reports',
};

// Content Preference Persistence (Straight / Gay / Lesbian)
export const getStoredContentPreference = (): import('../types').ContentPreference => {
  try {
    const saved = localStorage.getItem('indianfullxx_content_preference');
    if (saved === 'straight' || saved === 'gay' || saved === 'lesbian') {
      return saved;
    }
  } catch {}
  return 'straight'; // Default state is 'straight'
};

export const setStoredContentPreference = (pref: import('../types').ContentPreference): void => {
  try {
    localStorage.setItem('indianfullxx_content_preference', pref);
  } catch (e) {
    console.error('LocalStorage write failed:', e);
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
  } catch {}

  // Auto Time-based Default: 6:00 AM to 6:00 PM -> light, else dark
  const currentHour = new Date().getHours();
  return currentHour >= 6 && currentHour < 18 ? 'light' : 'dark';
};

export const setStoredThemeMode = (theme: ThemeMode): void => {
  try {
    localStorage.setItem('indianfullxx_theme', theme);
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
};

// Age Verification
export const getStoredAgeVerified = (): boolean => {
  try {
    return localStorage.getItem(KEYS.AGE_VERIFIED) === 'true';
  } catch {
    return false;
  }
};

export const setStoredAgeVerified = (verified: boolean): void => {
  try {
    localStorage.setItem(KEYS.AGE_VERIFIED, verified ? 'true' : 'false');
  } catch (e) {
    console.error('LocalStorage write failed:', e);
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
  syncListeners.forEach((fn) => {
    try {
      fn(data);
    } catch (e) {
      console.warn('Sync listener error:', e);
    }
  });
};

// Saved Videos (Bookmarks)
export const getStoredSavedVideos = (): string[] => {
  try {
    const data = localStorage.getItem(KEYS.SAVED_VIDEOS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const setStoredSavedVideos = (saved: string[]): void => {
  try {
    localStorage.setItem(KEYS.SAVED_VIDEOS, JSON.stringify(saved));
    notifyInteractionSync({ savedVideos: saved });
  } catch (e) {
    console.error('LocalStorage write failed:', e);
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
  } catch {
    return [];
  }
};

// Liked Videos
export const getStoredLikedVideos = (): string[] => {
  try {
    const data = localStorage.getItem(KEYS.LIKED_VIDEOS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const setStoredLikedVideos = (liked: string[]): void => {
  try {
    localStorage.setItem(KEYS.LIKED_VIDEOS, JSON.stringify(liked));
    notifyInteractionSync({ likedVideos: liked });
  } catch (e) {
    console.error('LocalStorage write failed:', e);
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
  } catch {
    return [];
  }
};

export const getStoredWatchHistory = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(KEYS.WATCH_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const setStoredWatchHistory = (history: HistoryItem[]): void => {
  try {
    localStorage.setItem(KEYS.WATCH_HISTORY, JSON.stringify(history));
    notifyInteractionSync({ watchHistory: history });
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
};

export const addStoredWatchHistory = (videoId: string): HistoryItem[] => {
  try {
    const current = getStoredWatchHistory().filter((item) => item.videoId !== videoId);
    const updated = [{ videoId, watchedAt: Date.now() }, ...current].slice(0, 50); // Keep last 50
    localStorage.setItem(KEYS.WATCH_HISTORY, JSON.stringify(updated));
    notifyInteractionSync({ watchHistory: updated });
    return updated;
  } catch {
    return [];
  }
};

const DEMO_VIDEO_IDS = new Set([
  'vid-init-1',
  'vid-init-2',
  'vid-init-3',
  'vid-init-4',
  'after-hours',
  'midnight-rendezvous',
  'eclipse-heart',
  'neon-underground',
  'midnight-confessions',
  'vip-room-encounters',
  'city-lights-pov',
  'asian-elegance',
  'post-workout-passion',
  'velvet-dusk',
  'vr-paradise-experience',
  'midnight-penthouse-encounter',
  'night-drive-confessions',
  'underground-neon-nights',
  'late-night-penthouse',
  'vip-room-secrets',
]);

// Videos Persistence (Initial + Custom uploads)
export const getStoredVideos = (): Video[] => {
  try {
    const data = localStorage.getItem(KEYS.CUSTOM_VIDEOS);
    if (!data) return VIDEOS;
    const parsed: Video[] = JSON.parse(data);
    const sanitized = parsed.map((v) => {
      if (!v) return v;
      let embed = v.embedUrl || '';
      let preview = v.previewMp4Url || '';
      let webp = v.previewWebpUrl || '';
      if (v.id === 'vid-test-user-1' || embed.includes('youtube.com') || embed.includes('youtu.be')) {
        embed = 'https://hornhub.embedseek.com/#9sq8g';
      }
      if (preview.includes('zencdn.net') || preview.includes('oceans.mp4') || preview.includes('gtv-videos-bucket') || preview.includes('commondatastorage.googleapis.com')) {
        preview = '';
      }
      if (embed.includes('gtv-videos-bucket') || embed.includes('commondatastorage.googleapis.com')) {
        embed = '';
      }
      return { ...v, embedUrl: embed, previewMp4Url: preview, previewWebpUrl: webp };
    });
    const filtered = sanitized.filter((v) => v && v.id && !DEMO_VIDEO_IDS.has(v.id));
    if (filtered.length === 0) return VIDEOS;
    return filtered;
  } catch {
    return VIDEOS;
  }
};

export const setStoredVideos = (videos: Video[]): void => {
  try {
    localStorage.setItem(KEYS.CUSTOM_VIDEOS, JSON.stringify(videos));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
};

// Categories Persistence
export const getStoredCategories = (): CategoryInfo[] => {
  try {
    const data = localStorage.getItem(KEYS.CUSTOM_CATEGORIES);
    if (!data) return CATEGORIES;
    return JSON.parse(data);
  } catch {
    return CATEGORIES;
  }
};

export const setStoredCategories = (categories: CategoryInfo[]): void => {
  try {
    localStorage.setItem(KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
};

// Banners Persistence
export const getStoredBanners = (): LandingBanner[] => {
  try {
    const data = localStorage.getItem(KEYS.CUSTOM_BANNERS);
    if (!data) return INITIAL_LANDING_BANNERS;
    const parsed = JSON.parse(data);
    return parsed.length > 0 ? parsed : INITIAL_LANDING_BANNERS;
  } catch {
    return INITIAL_LANDING_BANNERS;
  }
};

export const setStoredBanners = (banners: LandingBanner[]): void => {
  try {
    localStorage.setItem(KEYS.CUSTOM_BANNERS, JSON.stringify(banners));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
};

// DMCA Reports Persistence
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
    console.error('LocalStorage write failed:', e);
  }
};

export const addStoredReport = (report: any): any[] => {
  try {
    const current = getStoredReports();
    const updated = [report, ...current];
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};

export const updateStoredReportStatus = (reportId: string, status: string): any[] => {
  try {
    const current = getStoredReports();
    const updated = current.map((r) => (r.id === reportId ? { ...r, status } : r));
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};
