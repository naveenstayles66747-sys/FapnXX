import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebaseConfig';
import { AdCampaign, CategoryInfo, CategoryRequest, DMCAReport, LandingBanner, ReportStatus, Video, VideoComment } from '../types';
import { CATEGORIES, INITIAL_LANDING_BANNERS, INITIAL_VIDEOS } from '../data';
import {
  getStoredBanners,
  getStoredCategories,
  getStoredReports,
  getStoredVideos,
  setStoredBanners,
  setStoredCategories,
  setStoredReports,
  setStoredVideos,
} from '../utils/storage';

const COLLECTIONS = {
  VIDEOS: 'videos',
  CATEGORIES: 'categories',
  BANNERS: 'banners',
  REPORTS: 'reports',
  ANONYMOUS_UPLOADERS: 'anonymous_uploaders',
  AD_CAMPAIGNS: 'ad_campaigns',
  CATEGORY_REQUESTS: 'category_requests',
  COMMENTS: 'comments',
};
// In-memory persistent map to lock video creation timestamps permanently
const createdTimeMemoryMap: Record<string, string> = {};

// Helper to sanitize broken sample URLs
function sanitizeVideoUrl(url?: string): string {
  if (!url || !url.trim()) return '';
  if (url.includes('gtv-videos-bucket') || url.includes('commondatastorage.googleapis.com')) {
    return '';
  }
  return url.trim();
}

function resolveVideoCreatedAt(videoId: string, docCreatedAt?: string): string {
  if (docCreatedAt && docCreatedAt.trim()) {
    createdTimeMemoryMap[videoId] = docCreatedAt;
    return docCreatedAt;
  }
  if (createdTimeMemoryMap[videoId]) {
    return createdTimeMemoryMap[videoId];
  }
  const stored = getStoredVideos();
  const found = stored.find((v) => v.id === videoId);
  if (found && found.createdAt) {
    createdTimeMemoryMap[videoId] = found.createdAt;
    return found.createdAt;
  }
  // Default to stable 4h ago timestamp for legacy seed videos if unassigned
  const stableTimestamp = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  createdTimeMemoryMap[videoId] = stableTimestamp;
  return stableTimestamp;
}

export class VideoService {
  /**
   * Upload a preview file (WebP / GIF / MP4) directly to Firebase Storage
   * and return the permanent, public download URL.
   */
  async uploadPreviewToStorage(file: File, customId?: string): Promise<string> {
    try {
      const id = customId || `preview_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileExt = file.name.split('.').pop() || 'webp';
      const storageRef = ref(storage, `previews/${id}.${fileExt}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('[VideoService] Preview asset uploaded to Firebase Storage:', downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error('[VideoService] Firebase Storage preview upload error:', error);
      throw error;
    }
  }
  /**
   * Upload video preview asset (image thumbnail or webm/mp4 snippet) directly to Firebase Storage
   */
  async uploadPreviewAsset(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('[VideoService] Preview asset uploaded to Firebase Storage:', downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error('[VideoService] Firebase Storage preview upload error:', error);
      throw error;
    }
  }

  /**
   * Fetch static video catalog JSON from Vercel Edge CDN (/data/videos_page1.json)
   */
  async fetchStaticCatalog(): Promise<Video[]> {
    try {
      const response = await fetch('/data/videos_page1.json', { cache: 'no-cache' });
      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json) && json.length > 0) {
          return json.map((item: any) => ({
            id: item.id || `vid_${Math.random().toString(36).substring(2, 7)}`,
            title: item.title || 'Untitled Video',
            embedUrl: item.embed_url || item.embedUrl || '',
            thumbnail: item.thumbnail || '',
            category: item.category || 'amateur',
            categoryLabel: item.categoryLabel || item.category || 'Amateur',
            tags: item.tags || ['HD'],
            duration: item.duration || '05:00',
            quality: item.quality || 'HD',
            viewsCount: typeof item.viewsCount === 'number' ? item.viewsCount : 1200,
            views: `${item.viewsCount || 1200} views`,
            likesCount: item.likesCount || 340,
            rating: item.rating || '98%',
            timeAgo: item.timeAgo || 'Just now',
            createdAt: item.createdAt || new Date().toISOString(),
            performerName: item.performerName || 'User Uploaded',
            description: item.description || '',
            isEmbed: true,
          }));
        }
      }
    } catch (err) {
      console.warn('[VideoService] Static catalog fetch error:', err);
    }
    return [];
  }

  /**
   * Lightning-Fast Hybrid Fetch: Static Vercel Edge CDN JSON + Cloud Firestore Realtime Sync
   */
  async fetchVideos(): Promise<Video[]> {
    // 1. Fetch static JSON catalog (Instant Vercel Edge CDN load)
    const staticCatalog = await this.fetchStaticCatalog();

    try {
      // 2. Fetch Firestore real-time videos doc Snapshot
      const q = query(collection(db, COLLECTIONS.VIDEOS));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const firestoreVideos: Video[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const parsedViews = typeof data.viewsCount === 'number'
            ? data.viewsCount
            : parseInt((data.views || '1').replace(/[^0-9]/g, ''), 10) || 1;

          const mp4Url = sanitizeVideoUrl(data.previewMp4Url);

          firestoreVideos.push({
            id: docSnap.id,
            ...data,
            title: data.title || 'Untitled Video',
            viewsCount: parsedViews,
            views: `${parsedViews} ${parsedViews === 1 ? 'view' : 'views'}`,
            createdAt: resolveVideoCreatedAt(docSnap.id, data.createdAt),
            embedUrl: sanitizeVideoUrl(data.embedUrl),
            previewMp4Url: mp4Url,
            previewWebpUrl: data.previewWebpUrl || '',
            thumbnail:
              data.thumbnail && !data.thumbnail.includes('lh3.googleusercontent.com')
                ? data.thumbnail
                : mp4Url || data.thumbnailUrl || data.thumbnail || '',
            thumbnailUrl: data.thumbnailUrl || data.thumbnail || '',
            vastAdTagUrl: data.vastAdTagUrl || '',
            models_actors: data.models_actors || data.modelsActors || [],
            modelsActors: data.models_actors || data.modelsActors || [],
            categories: data.categories || (data.category ? [data.category] : []),
            vttUrl: data.vttUrl || '',
            spriteUrl: data.spriteUrl || '',
            orientation: data.orientation || 'horizontal',
          } as Video);
        });

        // Ensure sample video in Firestore is sanitized with Hornhub embed link
        const targetSample = firestoreVideos.find((v) => v.id === 'vid-test-user-1');
        if (targetSample && (targetSample.previewMp4Url || targetSample.embedUrl.includes('youtube'))) {
          this.saveVideo({
            ...targetSample,
            title: 'Desi Romance Scene 4K',
            embedUrl: 'https://hornhub.embedseek.com/#9sq8g',
            previewMp4Url: '',
            previewWebpUrl: '',
          });
        }

        // Merge Static JSON catalog and Firestore videos in-memory by matching ID with 0 UI flickering
        const mergedMap = new Map<string, Video>();
        staticCatalog.forEach((v) => mergedMap.set(v.id, v));
        firestoreVideos.forEach((v) => {
          const existing = mergedMap.get(v.id);
          if (existing) {
            mergedMap.set(v.id, {
              ...existing,
              ...v,
              viewsCount: Math.max(existing.viewsCount || 0, v.viewsCount || 0),
              likesCount: Math.max(existing.likesCount || 0, v.likesCount || 0),
            });
          } else {
            mergedMap.set(v.id, v);
          }
        });

        const mergedList = Array.from(mergedMap.values());
        setStoredVideos(mergedList);
        return mergedList;
      }
    } catch (error) {
      console.warn('[VideoService] Firestore fetch error:', error);
    }

    if (staticCatalog.length > 0) return staticCatalog;
    return getStoredVideos();
  }

  /**
   * Real-time subscription to Firestore videos collection for live views & time sync
   */
  subscribeToVideos(callback: (videos: Video[]) => void) {
    try {
      const q = query(collection(db, COLLECTIONS.VIDEOS));
      return onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const firestoreVideos: Video[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as any;
              const parsedViews = typeof data.viewsCount === 'number'
                ? data.viewsCount
                : parseInt((data.views || '1').replace(/[^0-9]/g, ''), 10) || 1;

              firestoreVideos.push({
                id: docSnap.id,
                ...data,
                viewsCount: parsedViews,
                views: `${parsedViews} ${parsedViews === 1 ? 'view' : 'views'}`,
                createdAt: resolveVideoCreatedAt(docSnap.id, data.createdAt),
                embedUrl: sanitizeVideoUrl(data.embedUrl),
                previewMp4Url: sanitizeVideoUrl(data.previewMp4Url),
                thumbnail:
                  data.thumbnail && !data.thumbnail.includes('lh3.googleusercontent.com')
                    ? data.thumbnail
                    : data.previewWebpUrl || data.previewMp4Url || data.thumbnailUrl || data.thumbnail || '',
                thumbnailUrl: data.thumbnailUrl || data.thumbnail || '',
                previewWebpUrl: data.previewWebpUrl || data.previewWebp || '',
                vastAdTagUrl: data.vastAdTagUrl || '',
                models_actors: data.models_actors || data.modelsActors || [],
                modelsActors: data.models_actors || data.modelsActors || [],
                categories: data.categories || (data.category ? [data.category] : []),
                vttUrl: data.vttUrl || '',
                spriteUrl: data.spriteUrl || '',
                orientation: data.orientation || 'horizontal',
              } as Video);
            });
            const staticCatalog = await this.fetchStaticCatalog();
            const mergedMap = new Map<string, Video>();
            staticCatalog.forEach((v) => mergedMap.set(v.id, v));
            firestoreVideos.forEach((v) => {
              const existing = mergedMap.get(v.id);
              if (existing) {
                mergedMap.set(v.id, {
                  ...existing,
                  ...v,
                  viewsCount: Math.max(existing.viewsCount || 0, v.viewsCount || 0),
                  likesCount: Math.max(existing.likesCount || 0, v.likesCount || 0),
                });
              } else {
                mergedMap.set(v.id, v);
              }
            });

            const mergedList = Array.from(mergedMap.values());
            setStoredVideos(mergedList);
            callback(mergedList);
          }
        },
        (err) => {
          console.warn('[VideoService] Firestore onSnapshot error:', err);
        }
      );
    } catch (e) {
      console.warn('[VideoService] Subscribe error:', e);
      return () => {};
    }
  }

  /**
   * Save a video document to Cloud Firestore
   */
  async saveVideo(video: Video): Promise<Video> {
    const videoData: Video & { thumbnailUrl?: string } = {
      ...video,
      id: video.id || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      thumbnailUrl: video.thumbnailUrl || video.thumbnail,
      thumbnail: video.thumbnail || video.thumbnailUrl || '',
    };

    try {
      const videoRef = doc(db, COLLECTIONS.VIDEOS, videoData.id);
      await setDoc(videoRef, videoData, { merge: true });
      console.log('[VideoService] Video document saved to Firestore:', videoData.id);
    } catch (error) {
      console.warn('[VideoService] Firestore save error (saved to local cache):', error);
    }

    const current = getStoredVideos();
    const updated = [videoData, ...current.filter((v) => v.id !== videoData.id)];
    setStoredVideos(updated);

    return videoData;
  }

  /**
   * Update an existing video document in Cloud Firestore
   */
  async updateVideo(video: Video): Promise<Video> {
    try {
      const videoRef = doc(db, COLLECTIONS.VIDEOS, video.id);
      await updateDoc(videoRef, { ...video });
      console.log('[VideoService] Video updated in Firestore:', video.id);
    } catch (error) {
      console.warn('[VideoService] Firestore update error:', error);
    }

    const current = getStoredVideos();
    const updated = current.map((v) => (v.id === video.id ? video : v));
    setStoredVideos(updated);

    return video;
  }

  /**
   * Check if a view for this video has already been counted in the current browser session
   */
  hasSessionViewCounted(videoId: string): boolean {
    try {
      const sessionKey = `indianfullxx_view_counted_${videoId}`;
      return sessionStorage.getItem(sessionKey) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Mark session view as counted to prevent rapid refresh & duplicate view spam
   */
  markSessionViewCounted(videoId: string): void {
    try {
      const sessionKey = `indianfullxx_view_counted_${videoId}`;
      sessionStorage.setItem(sessionKey, 'true');
    } catch (e) {
      console.error('[VideoService] SessionStorage write failed:', e);
    }
  }

  /**
   * Real-time Firestore Views Counter Increment (Atomic setDoc + Local Cache Sync)
   */
  async incrementVideoViews(videoId: string): Promise<number> {
    const lockedCreatedAt = resolveVideoCreatedAt(videoId);
    try {
      const videoRef = doc(db, COLLECTIONS.VIDEOS, videoId);
      await setDoc(
        videoRef,
        {
          viewsCount: increment(1),
          createdAt: lockedCreatedAt,
        },
        { merge: true }
      );
      console.log('[VideoService] Real-time view incremented atomically in Cloud Firestore:', videoId);
    } catch (error) {
      console.warn('[VideoService] Firestore views increment fallback:', error);
    }

    const current = getStoredVideos();
    let newViewsCount = 1;
    const updated = current.map((v) => {
      if (v.id === videoId) {
        const nextViews = (v.viewsCount || 1) + 1;
        newViewsCount = nextViews;
        return {
          ...v,
          viewsCount: nextViews,
          views: `${nextViews} ${nextViews === 1 ? 'view' : 'views'}`,
          createdAt: lockedCreatedAt,
        };
      }
      return v;
    });
    setStoredVideos(updated);

    return newViewsCount;
  }

  /**
   * Real-time Firestore Likes Counter Increment / Decrement
   */
  async incrementVideoLikes(videoId: string, isLike: boolean): Promise<number> {
    const delta = isLike ? 1 : -1;
    try {
      const videoRef = doc(db, COLLECTIONS.VIDEOS, videoId);
      await setDoc(
        videoRef,
        {
          likesCount: increment(delta),
        },
        { merge: true }
      );
      console.log('[VideoService] Likes updated in Cloud Firestore:', videoId, delta);
    } catch (error) {
      console.warn('[VideoService] Firestore likes update fallback:', error);
    }

    const current = getStoredVideos();
    let newLikesCount = 1200;
    const updated = current.map((v) => {
      if (v.id === videoId) {
        const currentLikes = typeof v.likesCount === 'number' ? v.likesCount : 1200;
        const nextLikes = Math.max(0, currentLikes + delta);
        newLikesCount = nextLikes;
        return { ...v, likesCount: nextLikes };
      }
      return v;
    });
    setStoredVideos(updated);

    return newLikesCount;
  }

  /**
   * Delete a video document from Cloud Firestore
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      const videoRef = doc(db, COLLECTIONS.VIDEOS, videoId);
      await deleteDoc(videoRef);
      console.log('[VideoService] Video deleted from Firestore:', videoId);
    } catch (error) {
      console.warn('[VideoService] Firestore delete error:', error);
    }

    const current = getStoredVideos();
    const updated = current.filter((v) => v.id !== videoId);
    setStoredVideos(updated);

    return true;
  }

  /**
   * Guest Anonymous Naming Logic using Firestore
   * Automatically maps device/client identifier to persistent names ('Anonymous1', 'Anonymous2', etc.)
   */
  async getOrAssignAnonymousName(): Promise<string> {
    const STORAGE_KEY_DEVICE = 'indianfullxx_guest_device_id';
    const STORAGE_KEY_NAME = 'indianfullxx_guest_assigned_name';

    let deviceId = localStorage.getItem(STORAGE_KEY_DEVICE);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(STORAGE_KEY_DEVICE, deviceId);
    }

    const cachedName = localStorage.getItem(STORAGE_KEY_NAME);
    if (cachedName) return cachedName;

    try {
      const uploaderRef = doc(db, COLLECTIONS.ANONYMOUS_UPLOADERS, deviceId);
      const docSnap = await getDoc(uploaderRef);

      if (docSnap.exists()) {
        const assignedName = docSnap.data().anonymousName;
        localStorage.setItem(STORAGE_KEY_NAME, assignedName);
        return assignedName;
      }

      // Count existing uploaders in Firestore to assign next counter
      const snapshot = await getDocs(collection(db, COLLECTIONS.ANONYMOUS_UPLOADERS));
      const nextIndex = snapshot.size + 1;
      const newName = `Anonymous${nextIndex}`;

      await setDoc(uploaderRef, {
        anonymousName: newName,
        deviceId,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem(STORAGE_KEY_NAME, newName);
      return newName;
    } catch (error) {
      console.warn('[VideoService] Anonymous naming Firestore error:', error);
      const fallbackName = cachedName || 'Anonymous1';
      localStorage.setItem(STORAGE_KEY_NAME, fallbackName);
      return fallbackName;
    }
  }

  /**
   * Save a DMCA or Content Moderation report to Cloud Firestore
   */
  async saveReport(report: DMCAReport): Promise<DMCAReport> {
    try {
      const reportRef = doc(db, COLLECTIONS.REPORTS, report.id);
      await setDoc(reportRef, report);
      console.log('[VideoService] Report saved to Firestore:', report.id);
    } catch (error) {
      console.warn('[VideoService] Firestore report save error:', error);
    }

    const current = getStoredReports();
    const updated = [report, ...current.filter((r) => r.id !== report.id)];
    setStoredReports(updated);
    return report;
  }

  /**
   * Fetch all DMCA reports from Cloud Firestore
   */
  async fetchReports(): Promise<DMCAReport[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.REPORTS));
      if (!querySnapshot.empty) {
        const reports: DMCAReport[] = [];
        querySnapshot.forEach((docSnap) => {
          reports.push({ id: docSnap.id, ...docSnap.data() } as DMCAReport);
        });
        setStoredReports(reports);
        return reports;
      }
    } catch (error) {
      console.warn('[VideoService] Firestore reports fetch error:', error);
    }
    return getStoredReports();
  }

  /**
   * Update report status in Cloud Firestore
   */
  async updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
    try {
      const reportRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(reportRef, { status });
    } catch (error) {
      console.warn('[VideoService] Firestore report update error:', error);
    }

    const current = getStoredReports();
    const updated = current.map((r) => (r.id === reportId ? { ...r, status } : r));
    setStoredReports(updated);
  }

  /**
   * Fetch all video categories from Firestore
   */
  async fetchCategories(): Promise<CategoryInfo[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
      if (!querySnapshot.empty) {
        const categories: CategoryInfo[] = [];
        querySnapshot.forEach((docSnap) => {
          categories.push({ id: docSnap.id, ...docSnap.data() } as CategoryInfo);
        });
        setStoredCategories(categories);
        return categories;
      }

      console.log('[VideoService] Seeding initial categories into Cloud Firestore...');
      for (const c of CATEGORIES) {
        await this.saveCategory(c);
      }
      return CATEGORIES;
    } catch (error) {
      console.warn('[VideoService] Firestore categories fetch error:', error);
    }
    return getStoredCategories();
  }

  /**
   * Save a category to Firestore
   */
  async saveCategory(category: CategoryInfo): Promise<CategoryInfo> {
    try {
      const catRef = doc(db, COLLECTIONS.CATEGORIES, category.id);
      await setDoc(catRef, category);
    } catch (error) {
      console.warn('[VideoService] Firestore category save error:', error);
    }

    const current = getStoredCategories();
    const updated = [...current.filter((c) => c.id !== category.id), category];
    setStoredCategories(updated);
    return category;
  }

  /**
   * Fetch landing banners from Firestore
   */
  async fetchBanners(): Promise<LandingBanner[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.BANNERS));
      if (!querySnapshot.empty) {
        const banners: LandingBanner[] = [];
        querySnapshot.forEach((docSnap) => {
          banners.push({ id: docSnap.id, ...docSnap.data() } as LandingBanner);
        });
        setStoredBanners(banners);
        return banners;
      }

      // Auto-seed initial 6 hero banners directly to Cloud Firestore collection if empty
      console.log('[VideoService] Seeding initial 6 landing page banners into Cloud Firestore...');
      for (const b of INITIAL_LANDING_BANNERS) {
        await this.saveBanner(b);
      }
      return INITIAL_LANDING_BANNERS;
    } catch (error) {
      console.warn('[VideoService] Firestore banners fetch error:', error);
    }
    return getStoredBanners();
  }

  /**
   * Save or update a landing banner in Cloud Firestore
   */
  async saveBanner(banner: LandingBanner): Promise<LandingBanner> {
    try {
      const bannerRef = doc(db, COLLECTIONS.BANNERS, banner.id);
      await setDoc(bannerRef, banner, { merge: true });
      console.log('[VideoService] Banner saved to Cloud Firestore:', banner.id);
    } catch (error) {
      console.warn('[VideoService] Firestore banner save error:', error);
    }

    const current = getStoredBanners();
    const updated = [banner, ...current.filter((b) => b.id !== banner.id)];
    setStoredBanners(updated);
    return banner;
  }

  /**
   * Save a new Category Request from a user to Cloud Firestore
   */
  async saveCategoryRequest(categoryReq: CategoryRequest): Promise<CategoryRequest> {
    try {
      const reqRef = doc(db, COLLECTIONS.CATEGORY_REQUESTS, categoryReq.id);
      await setDoc(reqRef, categoryReq, { merge: true });
      console.log('[VideoService] Category request saved to Cloud Firestore:', categoryReq.id);
    } catch (error) {
      console.warn('[VideoService] Firestore category request save error:', error);
    }
    return categoryReq;
  }

  /**
   * Fetch all Category Requests from Cloud Firestore
   */
  async fetchCategoryRequests(): Promise<CategoryRequest[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.CATEGORY_REQUESTS));
      if (!querySnapshot.empty) {
        const requests: CategoryRequest[] = [];
        querySnapshot.forEach((docSnap) => {
          requests.push({ id: docSnap.id, ...docSnap.data() } as CategoryRequest);
        });
        return requests;
      }
    } catch (error) {
      console.warn('[VideoService] Firestore category requests fetch error:', error);
    }
    return [];
  }

  /**
   * Update Category Request status in Cloud Firestore
   */
  async updateCategoryRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
    try {
      const reqRef = doc(db, COLLECTIONS.CATEGORY_REQUESTS, requestId);
      await updateDoc(reqRef, { status });
    } catch (error) {
      console.warn('[VideoService] Firestore category request update error:', error);
    }
  }

  /**
   * Upload video file directly to Firebase Storage
   */
  async uploadVideoFileToStorage(file: File, onProgress?: (percent: number) => void): Promise<string> {
    try {
      const fileId = `vid_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileExt = file.name.split('.').pop() || 'mp4';
      const storageRef = ref(storage, `videos/${fileId}.${fileExt}`);

      if (onProgress) onProgress(15);
      const snapshot = await uploadBytes(storageRef, file);
      if (onProgress) onProgress(85);

      const downloadUrl = await getDownloadURL(snapshot.ref);
      if (onProgress) onProgress(100);
      console.log('[VideoService] Full video file uploaded to Firebase Storage:', downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error('[VideoService] Firebase Storage video upload error:', error);
      throw error;
    }
  }

  /**
   * Fetch comments for a video from Cloud Firestore
   */
  async fetchComments(videoId: string): Promise<VideoComment[]> {
    try {
      const q = query(collection(db, COLLECTIONS.COMMENTS), where('videoId', '==', videoId));
      const querySnapshot = await getDocs(q);
      const comments: VideoComment[] = [];
      querySnapshot.forEach((docSnap) => {
        comments.push({ id: docSnap.id, ...docSnap.data() } as VideoComment);
      });
      comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return comments;
    } catch (error) {
      console.warn('[VideoService] Firestore comments fetch error:', error);
      return [];
    }
  }

  /**
   * Real-time subscription to comments for a video
   */
  subscribeToComments(videoId: string, callback: (comments: VideoComment[]) => void) {
    try {
      const q = query(collection(db, COLLECTIONS.COMMENTS), where('videoId', '==', videoId));
      return onSnapshot(
        q,
        (snapshot) => {
          const comments: VideoComment[] = [];
          snapshot.forEach((docSnap) => {
            comments.push({ id: docSnap.id, ...docSnap.data() } as VideoComment);
          });
          comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          callback(comments);
        },
        (err) => {
          console.warn('[VideoService] Comments onSnapshot error:', err);
        }
      );
    } catch (e) {
      console.warn('[VideoService] Subscribe comments error:', e);
      return () => {};
    }
  }

  /**
   * Add a new comment to Cloud Firestore
   */
  async saveComment(comment: VideoComment): Promise<VideoComment> {
    try {
      const commentRef = doc(db, COLLECTIONS.COMMENTS, comment.id);
      await setDoc(commentRef, comment);
      console.log('[VideoService] Comment saved to Firestore:', comment.id);
    } catch (error) {
      console.warn('[VideoService] Firestore comment save error:', error);
    }
    return comment;
  }

  /**
   * Increment like count for a comment in Cloud Firestore
   */
  async likeComment(commentId: string): Promise<void> {
    try {
      const commentRef = doc(db, COLLECTIONS.COMMENTS, commentId);
      await updateDoc(commentRef, {
        likesCount: increment(1),
      });
    } catch (error) {
      console.warn('[VideoService] Firestore comment like error:', error);
    }
  }

  /**
   * Delete a comment from Cloud Firestore
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const commentRef = doc(db, COLLECTIONS.COMMENTS, commentId);
      await deleteDoc(commentRef);
    } catch (error) {
      console.warn('[VideoService] Firestore comment delete error:', error);
    }
  }

  /**
   * Fetch all Ad Campaigns from Cloud Firestore
   */
  async fetchAdCampaigns(): Promise<AdCampaign[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.AD_CAMPAIGNS));
      if (!querySnapshot.empty) {
        const campaigns: AdCampaign[] = [];
        querySnapshot.forEach((docSnap) => {
          campaigns.push({ id: docSnap.id, ...docSnap.data() } as AdCampaign);
        });
        return campaigns;
      }
    } catch (error) {
      console.warn('[VideoService] Firestore ad campaigns fetch error:', error);
    }
    return [];
  }

  /**
   * Save or update an Ad Campaign in Cloud Firestore
   */
  async saveAdCampaign(campaign: AdCampaign): Promise<AdCampaign> {
    try {
      const campRef = doc(db, COLLECTIONS.AD_CAMPAIGNS, campaign.id);
      await setDoc(campRef, campaign, { merge: true });
      console.log('[VideoService] Ad Campaign saved to Cloud Firestore:', campaign.id);
    } catch (error) {
      console.warn('[VideoService] Firestore ad campaign save error:', error);
    }
    return campaign;
  }

  /**
   * Delete an Ad Campaign from Cloud Firestore
   */
  async deleteAdCampaign(campaignId: string): Promise<void> {
    try {
      const campRef = doc(db, COLLECTIONS.AD_CAMPAIGNS, campaignId);
      await deleteDoc(campRef);
    } catch (error) {
      console.warn('[VideoService] Firestore ad campaign delete error:', error);
    }
  }
}

export const videoService = new VideoService();
export default videoService;
