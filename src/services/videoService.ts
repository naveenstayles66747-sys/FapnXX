import {
  AdCampaign,
  CategoryInfo,
  CategoryRequest,
  DMCAReport,
  LandingBanner,
  ReportStatus,
  Video,
  VideoComment,
} from '../types';
import { CATEGORIES, INITIAL_LANDING_BANNERS, INITIAL_VIDEOS } from '../data';
import {
  getOrCreateDeviceId,
} from '../utils/storage';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  increment,
} from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';
import { storage, db, auth, cleanForFirestore, getAppCheckToken } from './firebaseConfig';

const API_BASE = (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '')
  ? `${import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '')}/api/v1`
  : '/api/v1';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SmartMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string, ttlMs: number = 60000): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(prefixOrKey?: string): void {
    if (!prefixOrKey) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefixOrKey)) {
        this.cache.delete(key);
      }
    }
  }
}

export class VideoService {
  private smartCache = new SmartMemoryCache();

  private setupVisibilityAwareFallback<T>(
    fetcher: () => Promise<T>,
    callback: (data: T) => void,
    intervalMs: number
  ): () => void {
    let timer: any = null;
    let isSubscribed = true;

    const runPoll = async () => {
      if (!isSubscribed) return;
      if (typeof document !== 'undefined' && document.hidden) {
        // Tab is hidden or minimized: pause background network polling
        return;
      }
      try {
        const data = await fetcher();
        if (isSubscribed && data) {
          callback(data);
        }
      } catch (err) {
        console.warn('[SmartPoll] Background fetch notice:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden && isSubscribed) {
        // Tab restored to focus: immediately revalidate
        runPoll();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    timer = setInterval(runPoll, intervalMs);

    return () => {
      isSubscribed = false;
      if (timer) clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    let token: string | null = null;
    if (auth.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch (err) {
        console.warn('[VideoService] Failed to retrieve Firebase ID token:', err);
      }
    }
    const appCheckToken = await getAppCheckToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
    };
  }

  /**
   * Upload a preview file directly to Firebase Storage with fallback to portable base64 Data URL
   */
  async uploadPreviewToStorage(file: File, customId?: string): Promise<string> {
    try {
      const id = customId || `preview_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileExt = file.name.split('.').pop() || 'webp';
      const storageRef = ref(storage, `previews/${id}.${fileExt}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err: any) {
      console.warn('[VideoService] Firebase Storage direct upload fallback to base64:', err?.message);
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            resolve('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop');
          }
        };
        reader.onerror = () => {
          resolve('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop');
        };
        reader.readAsDataURL(file);
      });
    }
  }

  /**
   * Upload a base64 / data URL frame directly to Firebase Storage with fallback
   */
  async uploadDataUrlToStorage(dataUrl: string, customId?: string): Promise<string> {
    try {
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        return dataUrl;
      }
      const id = customId || `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const storageRef = ref(storage, `thumbnails/${id}.jpg`);
      const snapshot = await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err: any) {
      console.warn('[VideoService] Data URL storage upload fallback to data URL:', err?.message);
      return dataUrl;
    }
  }

  /**
   * Upload full video file to Firebase Storage with progress tracking
   * Throws error on failure so caller can display error message instead of saving temporary blob URLs
   */
  async uploadVideoFileToStorage(file: File, onProgress?: (percent: number) => void): Promise<string> {
    try {
      if (onProgress) onProgress(15);
      const fileId = `vid_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileExt = file.name.split('.').pop() || 'mp4';
      const storageRef = ref(storage, `videos/${fileId}.${fileExt}`);
      if (onProgress) onProgress(45);
      const snapshot = await uploadBytes(storageRef, file);
      if (onProgress) onProgress(85);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      if (onProgress) onProgress(100);
      return downloadUrl;
    } catch (err: any) {
      console.error('[VideoService] Firebase Storage video upload failed:', err?.message || err);
      throw new Error(`Video file upload to Firebase Cloud Storage failed: ${err?.message || 'Storage network error'}`);
    }
  }

  /**
   * Safe fetch helper for backend APIs with structured response extraction
   */
  private async apiFetch<T>(
    endpoint: string,
    options?: RequestInit,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    try {
      const authHeaders = await this.getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          ...authHeaders,
          ...(options?.headers || {}),
        },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json && json.success) {
          return json.data as T;
        }
      }
    } catch {
      // Fast non-blocking fallback
    }

    if (fallback) {
      return fallback();
    }
    throw new Error(`Failed to fetch from ${endpoint}`);
  }

  /**
   * Seamless Firebase Auth Token synchronization
   */
  async syncFirebaseAuthToken(customToken?: string): Promise<boolean> {
    if (!customToken) return false;
    try {
      await signInWithCustomToken(auth, customToken);
      console.log('✅ [FirebaseAuth] Signed in with Custom Token successfully.');
      return true;
    } catch (err: any) {
      console.warn('⚠️ [FirebaseAuth] Client custom token sign-in fallback:', err.message);
      return false;
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
            viewsCount: typeof item.viewsCount === 'number' ? item.viewsCount : 1,
            views: `${item.viewsCount || 1} views`,
            likesCount: item.likesCount || 0,
            rating: item.rating || '100%',
            timeAgo: item.timeAgo || 'Just now',
            createdAt: item.createdAt || new Date().toISOString(),
            performerName: item.performerName || 'User Uploaded',
            performerAvatar:
              item.performerAvatar ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
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
   * Check if a video is fake or demo data
   */
  isDemoOrFakeVideo(v: any): boolean {
    if (!v || typeof v !== 'object') return true;
    const id = (v.id || '').toLowerCase();
    const embed = (v.embedUrl || '').toLowerCase();
    const title = (v.title || '').toLowerCase();
    const createdBy = (v.createdBy || '').toLowerCase();

    if (id.startsWith('vid-0') || id.startsWith('demo-') || id.startsWith('test-')) return true;
    if (embed.includes('embedseek.com/#9sq8g') || embed.includes('example.com')) return true;
    if (createdBy === 'system' || v.isDemo === true) return true;
    if (
      title.includes('desi bhabhi romance 4k') ||
      title.includes('indian college girl - amateur hd') ||
      title.includes('trending milf scene - full hd') ||
      title.includes('asian beauty - exclusive 4k vr') ||
      title.includes('hot lesbian scene - premium hd')
    ) {
      return true;
    }
    return false;
  }

  /**
   * Fetch all videos via direct Firestore SDK with Backend API and CDN fallbacks with Smart Cache
   */
  async fetchVideos(category?: string): Promise<Video[]> {
    const cacheKey = `videos_${category || 'all'}`;
    const cached = this.smartCache.get<Video[]>(cacheKey, 60000);
    if (cached && cached.length > 0) {
      return cached;
    }

    // Direct Fast Firestore attempt
    try {
      let videoCollectionRef = collection(db, 'videos');
      let snap;
      if (category && category !== 'all') {
        snap = await getDocs(query(videoCollectionRef, where('category', '==', category.toLowerCase())));
      } else {
        snap = await getDocs(videoCollectionRef);
      }

      if (!snap.empty) {
        const firestoreVideos: Video[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          firestoreVideos.push({
            id: d.id,
            title: data.title || 'Untitled',
            embedUrl: data.embedUrl || '',
            thumbnail: data.thumbnail || data.thumbnailUrl || '',
            previewMp4Url: data.previewMp4Url || undefined,
            previewWebpUrl: data.previewWebpUrl || undefined,
            category: data.category || 'amateur',
            categoryLabel: data.categoryLabel || 'Amateur',
            categories: data.categories || [data.category || 'amateur'],
            tags: data.tags || ['HD'],
            duration: data.duration || '05:00',
            quality: data.quality || 'HD',
            viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 0,
            views: data.views || `${data.viewsCount || 0} views`,
            likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
            rating: data.rating || (data.likesCount ? `${Math.round(((data.likesCount || 0) / (data.viewsCount || 1)) * 100)}%` : '0%'),
            timeAgo: data.timeAgo || 'Recent',
            createdAt: data.createdAt || new Date().toISOString(),
            performerName: data.performerName || 'User Uploaded',
            performerAvatar: data.performerAvatar || '',
            description: data.description || '',
            isEmbed: data.isEmbed !== undefined ? data.isEmbed : true,
            orientation: data.orientation || 'horizontal',
            performers: data.performers || undefined,
            channelName: data.channelName || undefined,
            sourceWebsite: data.sourceWebsite || undefined,
            sourceWebsiteUrl: data.sourceWebsiteUrl || undefined,
            vttUrl: data.vttUrl || undefined,
            spriteUrl: data.spriteUrl || undefined,
            modelsActors: data.modelsActors || data.models_actors || undefined,
            models_actors: data.models_actors || data.modelsActors || undefined,
          });
        });

        if (firestoreVideos.length > 0) {
          // Sort newest first, filter out taken-down, embed-less, and demo/fake videos
          const cleanVideos = firestoreVideos.filter(
            (v) => !(v as any).isTakenDown && (v.embedUrl || v.previewMp4Url) && !this.isDemoOrFakeVideo(v)
          );
          cleanVideos.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          this.smartCache.set(cacheKey, cleanVideos);
          return cleanVideos;
        }
      }
      return [];
    } catch (firestoreErr: any) {
      console.warn('⚠️ [Firestore Client] fetchVideos notice:', firestoreErr.message);
      return [];
    }
  }

  /**
   * Subscribe to videos (live updates across all worldwide devices with Firestore Realtime & Visibility-Aware fallback)
   */
  subscribeToVideos(callback: (videos: Video[]) => void) {
    try {
      const q = query(collection(db, 'videos'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Video[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as any;
              list.push({
                ...data,
                id: d.id,
                isEmbed: data.isEmbed !== undefined ? data.isEmbed : true,
                viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 1,
                likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
              });
            });
            if (list.length > 0) {
              const cleanList = list.filter(
                (v) => !(v as any).isTakenDown && (v.embedUrl || v.previewMp4Url) && !this.isDemoOrFakeVideo(v)
              );
              cleanList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
              this.smartCache.set('videos_all', cleanList);
              callback(cleanList);
            }
          }
        },
        (err) => {
          console.warn('⚠️ [Firestore] Realtime subscription fallback to visibility-aware poll:', err.message);
          this.setupVisibilityAwareFallback(() => this.fetchVideos(), callback, 60000);
        }
      );
      return unsubscribe;
    } catch {
      return this.setupVisibilityAwareFallback(() => this.fetchVideos(), callback, 60000);
    }
  }

  /**
   * Save a new video to Firestore and Backend API
   */
  async saveVideo(video: Video): Promise<Video> {
    const videoId = video.id || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullVideo = {
      ...video,
      id: videoId,
      createdAt: video.createdAt || new Date().toISOString(),
      viewsCount: typeof video.viewsCount === 'number' ? video.viewsCount : 1,
      likesCount: typeof video.likesCount === 'number' ? video.likesCount : 0,
      views: video.views || '1 view',
    };

    // Invalidate local video cache
    this.smartCache.invalidate('videos');

    // Direct Firestore write (Single authoritative write path)
    try {
      await setDoc(doc(db, 'videos', videoId), cleanForFirestore(fullVideo), { merge: true });
      console.log('✅ [Firestore] Video saved successfully:', videoId);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct video save notice:', err.message);
    }

    return fullVideo;
  }

  /**
   * Update an existing video via Firestore (Admin/Staff only)
   */
  async updateVideo(video: Video): Promise<Video> {
    this.smartCache.invalidate('videos');

    try {
      await setDoc(doc(db, 'videos', video.id), cleanForFirestore(video), { merge: true });
      console.log('✅ [Firestore] Video updated successfully:', video.id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct video update notice:', err.message);
    }

    return video;
  }

  /**
   * Delete video via Firestore (Admin/Staff only)
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    this.smartCache.invalidate('videos');

    try {
      await deleteDoc(doc(db, 'videos', videoId));
      console.log('✅ [Firestore] Video deleted successfully:', videoId);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct video delete notice:', err.message);
    }

    return true;
  }

  /**
   * Secure Server-Side Views Counter via Backend Validated API
   * Direct arbitrary client tampering is disabled.
   */
  async incrementVideoViews(videoId: string): Promise<number> {
    const deviceId = getOrCreateDeviceId();
    try {
      const res = await this.apiFetch<{ newViewsCount: number; counted: boolean }>(
        `/videos/${videoId}/views`,
        {
          method: 'POST',
          headers: {
            'x-client-device-id': deviceId,
          },
        }
      );
      if (res && typeof res.newViewsCount === 'number') {
        return res.newViewsCount;
      }
      return 1;
    } catch {
      return 1;
    }
  }

  /**
   * Secure Server-Side Likes Counter via Backend Validated API & Transaction
   * Direct arbitrary client tampering is disabled.
   */
  async incrementVideoLikes(videoId: string, isLike: boolean): Promise<number> {
    try {
      const res = await this.apiFetch<{ likesCount: number; rating?: string }>(
        `/videos/${videoId}/likes`,
        {
          method: 'POST',
          body: JSON.stringify({ isLike }),
        }
      );
      if (res && typeof res.likesCount === 'number') {
        return res.likesCount;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Fetch all categories via direct Firestore SDK with API and default fallback
   */
  async fetchCategories(): Promise<CategoryInfo[]> {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      if (!snap.empty) {
        const firestoreCats: CategoryInfo[] = [];
        snap.forEach((d) => {
          firestoreCats.push({ ...(d.data() as CategoryInfo), id: d.id });
        });
        if (firestoreCats.length > 0) {
          return firestoreCats;
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] fetchCategories fallback:', err.message);
    }

    return CATEGORIES;
  }

  /**
   * Save a category via Firestore and Backend API (Admin/Staff only)
   */
  async saveCategory(category: CategoryInfo): Promise<CategoryInfo> {
    const id = category.id.trim().toLowerCase().replace(/\s+/g, '-');
    const fullCategory = { ...category, id };

    try {
      await setDoc(doc(db, 'categories', id), cleanForFirestore(fullCategory), { merge: true });
      console.log('✅ [Firestore] Category saved successfully:', id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct category save notice:', err.message);
    }

    return fullCategory;
  }

  /**
   * Update category via Firestore (Admin/Staff only)
   */
  async updateCategory(category: CategoryInfo): Promise<CategoryInfo> {
    try {
      await setDoc(doc(db, 'categories', category.id), cleanForFirestore(category), { merge: true });
      console.log('✅ [Firestore] Category updated successfully:', category.id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct category update notice:', err.message);
    }

    return category;
  }

  /**
   * Delete category via Firestore (Admin/Staff only)
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      console.log('✅ [Firestore] Category deleted successfully:', categoryId);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct category delete notice:', err.message);
    }

    return true;
  }

  /**
   * Submit category request via Firestore
   */
  async saveCategoryRequest(categoryReq: CategoryRequest): Promise<CategoryRequest> {
    const reqId = categoryReq.id || `cat-req-${Date.now()}`;
    const fullReq = { ...categoryReq, id: reqId, createdAt: new Date().toISOString(), status: 'pending' as const };

    try {
      await setDoc(doc(db, 'category_requests', reqId), cleanForFirestore(fullReq), { merge: true });
      console.log('✅ [Firestore] Category request saved successfully:', reqId);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct category request save notice:', err.message);
    }

    return fullReq;
  }

  /**
   * Fetch all category requests (Admin)
   */
  async fetchCategoryRequests(): Promise<CategoryRequest[]> {
    try {
      const snap = await getDocs(collection(db, 'category_requests'));
      if (!snap.empty) {
        const list: CategoryRequest[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as CategoryRequest), id: d.id }));
        return list;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] fetchCategoryRequests fallback:', err.message);
    }

    return [];
  }

  /**
   * Update category request status (Admin/Staff only)
   */
  async updateCategoryRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
    try {
      await setDoc(doc(db, 'category_requests', requestId), { status }, { merge: true });
      console.log('✅ [Firestore] Category request status updated:', requestId, status);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct category request status update notice:', err.message);
    }
  }

  /**
   * Fetch landing banners via direct Firestore SDK with fallback
   */
  async fetchBanners(): Promise<LandingBanner[]> {
    try {
      const snap = await getDocs(collection(db, 'banners'));
      if (!snap.empty) {
        const firestoreBanners: LandingBanner[] = [];
        snap.forEach((d) => {
          firestoreBanners.push({ ...(d.data() as LandingBanner), id: d.id });
        });
        if (firestoreBanners.length > 0) {
          return firestoreBanners;
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] fetchBanners fallback:', err.message);
    }
    return INITIAL_LANDING_BANNERS;
  }

  /**
   * Real-time listener for landing banners updates across all devices worldwide
   */
  subscribeToBanners(callback: (banners: LandingBanner[]) => void) {
    try {
      const q = query(collection(db, 'banners'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: LandingBanner[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as LandingBanner;
              list.push({ ...data, id: d.id });
            });
            if (list.length > 0) {
              callback(list);
            }
          }
        },
        (err) => {
          console.warn('⚠️ [Firestore] Realtime banners subscription notice:', err.message);
        }
      );
      return unsubscribe;
    } catch {
      return () => {};
    }
  }

  /**
   * Save banner via Firestore and Backend API (Admin/Staff only)
   */
  async saveBanner(banner: LandingBanner): Promise<LandingBanner> {
    const id = banner.id || `banner-${Date.now()}`;
    const fullBanner = { ...banner, id };

    try {
      await setDoc(doc(db, 'banners', id), cleanForFirestore(fullBanner), { merge: true });
      console.log('✅ [Firestore] Banner saved successfully:', id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct banner save notice:', err.message);
    }

    return fullBanner;
  }

  /**
   * Update banner via Firestore (Admin/Staff only)
   */
  async updateBanner(banner: LandingBanner): Promise<LandingBanner> {
    try {
      await setDoc(doc(db, 'banners', banner.id), cleanForFirestore(banner), { merge: true });
      console.log('✅ [Firestore] Banner updated successfully:', banner.id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct banner update notice:', err.message);
    }

    return banner;
  }

  /**
   * Delete banner via Firestore (Admin/Staff only)
   */
  async deleteBanner(bannerId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'banners', bannerId));
      console.log('✅ [Firestore] Banner deleted successfully:', bannerId);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct banner delete notice:', err.message);
    }

    return true;
  }

  /**
   * Fetch comments for a video from Firestore with Smart Cache & memory sorting
   */
  async fetchComments(videoId: string): Promise<VideoComment[]> {
    const cacheKey = `comments_${videoId}`;
    const cached = this.smartCache.get<VideoComment[]>(cacheKey, 45000);
    if (cached) {
      return cached;
    }

    try {
      const q = query(
        collection(db, 'comments'),
        where('videoId', '==', videoId),
        limit(100)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: VideoComment[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as VideoComment), id: d.id }));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        this.smartCache.set(cacheKey, list);
        return list;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] fetchComments fallback to API:', err.message);
    }

    return this.apiFetch<VideoComment[]>(
      `/comments/video/${videoId}`,
      { method: 'GET' },
      () => []
    ).then((list) => {
      if (Array.isArray(list)) {
        this.smartCache.set(cacheKey, list);
      }
      return list || [];
    });
  }

  /**
   * Subscribe to comments with Firestore Realtime onSnapshot & Visibility-Aware Smart Fallback
   */
  subscribeToComments(videoId: string, callback: (comments: VideoComment[]) => void) {
    const cacheKey = `comments_${videoId}`;
    try {
      const q = query(
        collection(db, 'comments'),
        where('videoId', '==', videoId),
        limit(100)
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: VideoComment[] = [];
          snapshot.forEach((d) => list.push({ ...(d.data() as VideoComment), id: d.id }));
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          this.smartCache.set(cacheKey, list);
          callback(list);
        },
        (err) => {
          console.warn('⚠️ [Firestore Client] Comment realtime subscription fallback:', err.message);
          this.setupVisibilityAwareFallback(() => this.fetchComments(videoId), callback, 45000);
        }
      );
      return unsubscribe;
    } catch {
      return this.setupVisibilityAwareFallback(() => this.fetchComments(videoId), callback, 45000);
    }
  }

  /**
   * Save comment to Firestore (Single authoritative write path)
   */
  async saveComment(comment: VideoComment): Promise<VideoComment> {
    const id = comment.id || `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullComment: VideoComment = {
      ...comment,
      id,
      createdAt: comment.createdAt || new Date().toISOString(),
      likesCount: typeof comment.likesCount === 'number' ? comment.likesCount : 0,
    };

    // Invalidate local comments cache
    this.smartCache.invalidate(`comments_${comment.videoId}`);

    try {
      await setDoc(doc(db, 'comments', id), cleanForFirestore(fullComment));
      console.log('✅ [Firestore] Comment posted to cloud database:', id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] saveComment notice:', err.message);
    }

    return fullComment;
  }

  /**
   * Like comment via Firestore
   */
  async likeComment(commentId: string): Promise<void> {
    this.smartCache.invalidate('comments_');
    try {
      await setDoc(doc(db, 'comments', commentId), { likesCount: increment(1) }, { merge: true });
    } catch (err: any) {
      console.warn('⚠️ [Firestore] likeComment notice:', err.message);
    }
  }

  /**
   * Delete comment via Firestore
   */
  async deleteComment(commentId: string): Promise<void> {
    this.smartCache.invalidate('comments_');
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (err: any) {
      console.warn('⚠️ [Firestore] deleteComment notice:', err.message);
    }
  }

  /**
   * Save DMCA/Moderation Report via Firestore
   */
  async saveReport(report: DMCAReport): Promise<DMCAReport> {
    const id = report.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullReport: DMCAReport = { ...report, id, createdAt: new Date().toISOString(), status: 'pending' as const };

    try {
      await setDoc(doc(db, 'reports', id), cleanForFirestore(fullReport));
      console.log('✅ [Firestore] Report submitted to database:', id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] saveReport notice:', err.message);
    }

    return fullReport;
  }

  /**
   * Fetch reports (Admin/Staff only)
   */
  async fetchReports(): Promise<DMCAReport[]> {
    try {
      const snap = await getDocs(collection(db, 'reports'));
      if (!snap.empty) {
        const list: DMCAReport[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as DMCAReport), id: d.id }));
        return list;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] fetchReports fallback:', err.message);
    }

    return [];
  }

  /**
   * Update report status via Firestore (Admin/Staff only)
   */
  async updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
    try {
      await setDoc(doc(db, 'reports', reportId), { status, resolvedAt: new Date().toISOString() }, { merge: true });
      console.log('✅ [Firestore] Report status updated:', reportId, status);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] updateReportStatus notice:', err.message);
    }
  }

  /**
   * Fetch ad campaigns via Firestore SDK with fallback
   */
  async fetchAdCampaigns(): Promise<AdCampaign[]> {
    try {
      const snap = await getDocs(collection(db, 'ad_campaigns'));
      if (!snap.empty) {
        const list: AdCampaign[] = [];
        snap.forEach((d) => list.push({ ...(d.data() as AdCampaign), id: d.id }));
        return list;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] fetchAdCampaigns fallback:', err.message);
    }

    return [];
  }

  /**
   * Save ad campaign via Firestore (Admin/Staff only)
   */
  async saveAdCampaign(campaign: AdCampaign): Promise<AdCampaign> {
    const id = campaign.id || `ad-${Date.now()}`;
    const fullAd = { ...campaign, id };

    try {
      await setDoc(doc(db, 'ad_campaigns', id), cleanForFirestore(fullAd), { merge: true });
      console.log('✅ [Firestore] Ad campaign saved successfully:', id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct ad campaign save notice:', err.message);
    }

    return fullAd;
  }

  /**
   * Update ad campaign via Firestore (Admin/Staff only)
   */
  async updateAdCampaign(campaign: AdCampaign): Promise<AdCampaign> {
    try {
      await setDoc(doc(db, 'ad_campaigns', campaign.id), cleanForFirestore(campaign), { merge: true });
      console.log('✅ [Firestore] Ad campaign updated successfully:', campaign.id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct ad campaign update notice:', err.message);
    }

    return campaign;
  }

  /**
   * Delete ad campaign via Firestore (Admin/Staff only)
   */
  async deleteAdCampaign(campaignId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'ad_campaigns', campaignId));
      console.log('✅ [Firestore] Ad campaign deleted successfully:', campaignId);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Direct ad campaign delete notice:', err.message);
    }
  }

  /**
   * Upload video file or asset with backend validation
   */
  async validateUpload(params: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadType: 'video' | 'preview' | 'banner' | 'avatar';
  }) {
    return this.apiFetch<{ safeFilename: string; destinationPath: string; maxSizeBytes: number }>(
      '/uploads/validate',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  /**
   * Anonymous naming helper
   */
  async getOrAssignAnonymousName(): Promise<string> {
    const STORAGE_KEY_NAME = 'indianfullxx_guest_assigned_name';
    const cachedName = localStorage.getItem(STORAGE_KEY_NAME);
    if (cachedName) return cachedName;

    const randomSuffix = Math.floor(Math.random() * 900) + 100;
    const assignedName = `Anonymous${randomSuffix}`;
    localStorage.setItem(STORAGE_KEY_NAME, assignedName);
    return assignedName;
  }

  /**
   * Get or initialize unique device/client identifier for cloud sync
   */
  getDeviceId(): string {
    return getOrCreateDeviceId();
  }

  /**
   * Sync all user interactions (saved videos, liked videos, watch history, preferences) to Firestore for logged-in user
   * Guest interactions are preserved purely in localStorage to prevent unauthorized Firestore writes.
   */
  async syncUserInteractionsToFirestore(data: {
    savedVideos?: string[];
    likedVideos?: string[];
    watchHistory?: any[];
    contentPreference?: string;
    theme?: string;
    ageVerified?: boolean;
  }): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.uid) {
        // Guests stay in localStorage only
        return;
      }
      const userDocRef = doc(db, 'user_interactions', currentUser.uid);
      await setDoc(
        userDocRef,
        {
          ...data,
          userId: currentUser.uid,
          email: currentUser.email || undefined,
          lastActiveAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log('✅ [Firestore] User interactions synced to cloud database for user:', currentUser.uid);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] User interactions sync notice:', err?.message);
    }
  }

  /**
   * Fetch saved user interactions from Firestore for logged-in user
   */
  async fetchUserInteractionsFromFirestore(): Promise<{
    savedVideos?: string[];
    likedVideos?: string[];
    watchHistory?: any[];
    contentPreference?: string;
    ageVerified?: boolean;
  } | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.uid) {
        return null;
      }
      const userDocRef = doc(db, 'user_interactions', currentUser.uid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('✅ [Firestore] Loaded cloud user interactions for user:', currentUser.uid);
        return data as any;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore] fetchUserInteractionsFromFirestore notice:', err?.message);
    }
    return null;
  }
}

export const videoService = new VideoService();
export default videoService;


