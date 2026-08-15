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
  getStoredBanners,
  getStoredCategories,
  getStoredReports,
  getStoredVideos,
  setStoredBanners,
  setStoredCategories,
  setStoredReports,
  setStoredVideos,
} from '../utils/storage';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  increment,
} from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';
import { storage, db, auth, cleanForFirestore } from './firebaseConfig';

const API_BASE = '/api/v1';


export class VideoService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('fapnxx_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Upload a preview file directly to Firebase Storage with backend validation
   */
  async uploadPreviewToStorage(file: File, customId?: string): Promise<string> {
    try {
      await this.validateUpload({
        filename: file.name,
        mimeType: file.type || 'image/webp',
        sizeBytes: file.size,
        uploadType: 'preview',
      });
      const id = customId || `preview_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileExt = file.name.split('.').pop() || 'webp';
      const storageRef = ref(storage, `previews/${id}.${fileExt}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.warn('[VideoService] Firebase Storage preview upload fallback:', err);
      return URL.createObjectURL(file);
    }
  }

  /**
   * Upload full video file to Firebase Storage with backend validation
   */
  async uploadVideoFileToStorage(file: File, onProgress?: (percent: number) => void): Promise<string> {
    try {
      await this.validateUpload({
        filename: file.name,
        mimeType: file.type || 'video/mp4',
        sizeBytes: file.size,
        uploadType: 'video',
      });
      if (onProgress) onProgress(20);
      const fileId = `vid_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fileExt = file.name.split('.').pop() || 'mp4';
      const storageRef = ref(storage, `videos/${fileId}.${fileExt}`);
      if (onProgress) onProgress(50);
      const snapshot = await uploadBytes(storageRef, file);
      if (onProgress) onProgress(85);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      if (onProgress) onProgress(100);
      return downloadUrl;
    } catch (err) {
      console.warn('[VideoService] Storage video upload error, fallback to local blob:', err);
      return URL.createObjectURL(file);
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
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...(options?.headers || {}),
        },
      });

      if (response.ok) {
        const json = await response.json();
        if (json && json.success) {
          return json.data as T;
        }
      }
    } catch (err) {
      console.warn(`[VideoService] API fetch error at ${endpoint}:`, err);
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
   * Helper to seed initial catalog, categories, and banners into Firestore if database is empty
   */
  async seedInitialVideosToFirestore(): Promise<void> {
    try {
      console.log('🔄 [Firestore] Seeding initial video catalog to Firestore database...');
      // Seed categories
      for (const cat of CATEGORIES) {
        if (cat && cat.id) {
          await setDoc(doc(db, 'categories', cat.id), cleanForFirestore(cat), { merge: true });
        }
      }
      // Seed banners
      for (const banner of INITIAL_LANDING_BANNERS) {
        if (banner && banner.id) {
          await setDoc(doc(db, 'banners', banner.id), cleanForFirestore(banner), { merge: true });
        }
      }
      // Seed videos
      for (const v of INITIAL_VIDEOS) {
        if (v && v.id) {
          await setDoc(doc(db, 'videos', v.id), cleanForFirestore(v), { merge: true });
        }
      }
      console.log('✅ [Firestore] Initial catalog seeded successfully to Firestore worldwide!');
    } catch (err: any) {
      console.warn('⚠️ [Firestore] Seeding notice:', err?.message);
    }
  }

  /**
   * Fetch all videos via direct Firestore SDK with Backend API and CDN fallbacks
   */
  async fetchVideos(category?: string): Promise<Video[]> {
    // 1. Direct Firestore attempt
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
          const combined = [...firestoreVideos];
          const firestoreIds = new Set(firestoreVideos.map((v) => v.id));
          INITIAL_VIDEOS.forEach((defaultVid) => {
            if (!firestoreIds.has(defaultVid.id)) {
              combined.push(defaultVid);
            }
          });
          // Sort newest first
          combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setStoredVideos(combined);
          return combined;
        }
      } else {
        // Firestore is empty — auto-seed initial videos into Firestore
        this.seedInitialVideosToFirestore();
      }
    } catch (firestoreErr: any) {
      console.warn('⚠️ [Firestore Client] fetchVideos fallback to API:', firestoreErr.message);
    }

    // 2. Fallback to backend API
    const queryParam = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    return this.apiFetch<{ videos: Video[]; total: number }>(
      `/videos${queryParam}`,
      { method: 'GET' },
      async () => {
        const staticCatalog = await this.fetchStaticCatalog();
        const stored = getStoredVideos();
        if (stored && stored.length > 0) return { videos: stored, total: stored.length };
        return { videos: staticCatalog.length > 0 ? staticCatalog : INITIAL_VIDEOS, total: INITIAL_VIDEOS.length };
      }
    ).then((res) => {
      const list = res.videos || [];
      if (list.length > 0) {
        setStoredVideos(list);
      }
      return list;
    });
  }

  /**
   * Subscribe to videos (live updates across all worldwide devices)
   */
  subscribeToVideos(callback: (videos: Video[]) => void) {
    try {
      const q = query(collection(db, 'videos'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list: Video[] = [];
          const firestoreIds = new Set<string>();
          snapshot.forEach((d) => {
            const data = d.data() as any;
            firestoreIds.add(d.id);
            list.push({
              ...data,
              id: d.id,
              isEmbed: data.isEmbed !== undefined ? data.isEmbed : true,
              viewsCount: typeof data.viewsCount === 'number' ? data.viewsCount : 1,
              likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
            });
          });
          INITIAL_VIDEOS.forEach((defaultVid) => {
            if (!firestoreIds.has(defaultVid.id)) {
              list.push(defaultVid);
            }
          });
          if (list.length > 0) {
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setStoredVideos(list);
            callback(list);
          }
        }
      }, (err) => {
        console.warn('⚠️ [Firestore] Realtime subscription fallback to polling:', err.message);
      });
      return unsubscribe;
    } catch {
      const interval = setInterval(async () => {
        try {
          const videos = await this.fetchVideos();
          if (videos && videos.length > 0) {
            callback(videos);
          }
        } catch {}
      }, 15000);
      return () => clearInterval(interval);
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

    // 1. Direct Firestore write
    try {
      await setDoc(doc(db, 'videos', videoId), cleanForFirestore(fullVideo), { merge: true });
      console.log('✅ [Firestore] Video saved to cloud database:', videoId);
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] saveVideo notice:', err.message);
    }

    // 2. Sync to Backend API
    return this.apiFetch<Video>(
      '/videos',
      {
        method: 'POST',
        body: JSON.stringify(fullVideo),
      },
      () => {
        const current = getStoredVideos();
        const updated = [fullVideo, ...current.filter((v) => v.id !== fullVideo.id)];
        setStoredVideos(updated);
        return fullVideo;
      }
    ).then((saved) => {
      const current = getStoredVideos();
      const updated = [saved, ...current.filter((v) => v.id !== saved.id)];
      setStoredVideos(updated);
      return saved;
    });
  }

  /**
   * Update an existing video in Firestore and Backend API
   */
  async updateVideo(video: Video): Promise<Video> {
    // 1. Direct Firestore update
    try {
      await setDoc(doc(db, 'videos', video.id), cleanForFirestore(video), { merge: true });
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] updateVideo fallback to API:', err.message);
    }

    // 2. Sync to Backend API
    return this.apiFetch<Video>(
      `/videos/${video.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(video),
      },
      () => {
        const current = getStoredVideos();
        const updated = current.map((v) => (v.id === video.id ? video : v));
        setStoredVideos(updated);
        return video;
      }
    ).then((updated) => {
      const current = getStoredVideos();
      const updatedList = current.map((v) => (v.id === updated.id ? updated : v));
      setStoredVideos(updatedList);
      return updated;
    });
  }

  /**
   * Delete a video from Firestore and Backend API
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    // 1. Direct Firestore delete
    try {
      await deleteDoc(doc(db, 'videos', videoId));
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] deleteVideo fallback to API:', err.message);
    }

    // 2. Sync to Backend API
    return this.apiFetch<{ id: string }>(
      `/videos/${videoId}`,
      { method: 'DELETE' },
      () => {
        const current = getStoredVideos();
        const updated = current.filter((v) => v.id !== videoId);
        setStoredVideos(updated);
        return { id: videoId };
      }
    ).then(() => {
      const current = getStoredVideos();
      const updated = current.filter((v) => v.id !== videoId);
      setStoredVideos(updated);
      return true;
    });
  }


  /**
   * Worldwide Real-time View Counter with Direct Atomic Firestore Increment
   */
  async incrementVideoViews(videoId: string): Promise<number> {
    try {
      const vRef = doc(db, 'videos', videoId);
      const vSnap = await getDoc(vRef);
      if (vSnap.exists()) {
        const cur = vSnap.data().viewsCount || 0;
        const newCount = cur + 1;
        await updateDoc(vRef, {
          viewsCount: increment(1),
          views: `${newCount} ${newCount === 1 ? 'view' : 'views'}`,
          lastViewedAt: new Date().toISOString(),
        });
        return newCount;
      } else {
        // Document not in Firestore yet — create it with initial view count
        const existingVideo = getStoredVideos().find((v) => v.id === videoId);
        const newCount = (existingVideo?.viewsCount || 0) + 1;
        const videoData = existingVideo
          ? { ...existingVideo, viewsCount: newCount, views: `${newCount} views` }
          : { id: videoId, viewsCount: newCount, views: `${newCount} views`, createdAt: new Date().toISOString() };
        await setDoc(vRef, cleanForFirestore(videoData), { merge: true });
        return newCount;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore] incrementVideoViews sync notice:', err?.message);
    }

    return this.apiFetch<{ newViewsCount: number; counted: boolean }>(
      `/videos/${videoId}/views`,
      { method: 'POST' },
      () => {
        const current = getStoredVideos();
        let newCount = 1;
        const updated = current.map((v) => {
          if (v.id === videoId) {
            newCount = (v.viewsCount || 1) + 1;
            return {
              ...v,
              viewsCount: newCount,
              views: `${newCount} ${newCount === 1 ? 'view' : 'views'}`,
            };
          }
          return v;
        });
        setStoredVideos(updated);
        return { newViewsCount: newCount, counted: true };
      }
    ).then((res) => res.newViewsCount);
  }

  /**
   * Worldwide Real-time Likes Counter with Direct Atomic Firestore Increment
   */
  async incrementVideoLikes(videoId: string, isLike: boolean): Promise<number> {
    const delta = isLike ? 1 : -1;
    try {
      const vRef = doc(db, 'videos', videoId);
      const vSnap = await getDoc(vRef);
      if (vSnap.exists()) {
        const cur = vSnap.data().likesCount || 0;
        const newCount = Math.max(0, cur + delta);
        await updateDoc(vRef, {
          likesCount: increment(delta),
          lastLikedAt: new Date().toISOString(),
        });
        return newCount;
      } else {
        const existingVideo = getStoredVideos().find((v) => v.id === videoId);
        const newLikes = Math.max(0, (existingVideo?.likesCount || 0) + delta);
        const videoData = existingVideo
          ? { ...existingVideo, likesCount: newLikes }
          : { id: videoId, likesCount: newLikes, createdAt: new Date().toISOString() };
        await setDoc(vRef, cleanForFirestore(videoData), { merge: true });
        return newLikes;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore] incrementVideoLikes sync notice:', err?.message);
    }

    return this.apiFetch<{ likesCount: number }>(
      `/videos/${videoId}/likes`,
      {
        method: 'POST',
        body: JSON.stringify({ isLike }),
      },
      () => {
        const current = getStoredVideos();
        let newCount = 0;
        const updated = current.map((v) => {
          if (v.id === videoId) {
            newCount = Math.max(0, (v.likesCount || 0) + delta);
            return { ...v, likesCount: newCount };
          }
          return v;
        });
        setStoredVideos(updated);
        return { likesCount: newCount };
      }
    ).then((res) => res.likesCount);
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
          setStoredCategories(firestoreCats);
          return firestoreCats;
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] fetchCategories fallback:', err.message);
    }

    return this.apiFetch<CategoryInfo[]>(
      '/categories',
      { method: 'GET' },
      () => getStoredCategories() || CATEGORIES
    ).then((cats) => {
      setStoredCategories(cats);
      return cats;
    });
  }

  /**
   * Save a category to Firestore and Backend API
   */
  async saveCategory(category: CategoryInfo): Promise<CategoryInfo> {
    const id = category.id.trim().toLowerCase().replace(/\s+/g, '-');
    const fullCategory = { ...category, id };

    try {
      await setDoc(doc(db, 'categories', id), cleanForFirestore(fullCategory), { merge: true });
      console.log('✅ [Firestore] Category saved to cloud:', id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] saveCategory fallback:', err.message);
    }

    return this.apiFetch<CategoryInfo>(
      '/categories',
      {
        method: 'POST',
        body: JSON.stringify(fullCategory),
      },
      () => {
        const current = getStoredCategories();
        const updated = [...current.filter((c) => c.id !== fullCategory.id), fullCategory];
        setStoredCategories(updated);
        return fullCategory;
      }
    ).then((saved) => {
      const current = getStoredCategories();
      const updated = [...current.filter((c) => c.id !== saved.id), saved];
      setStoredCategories(updated);
      return saved;
    });
  }

  /**
   * Update category in Firestore and Backend API
   */
  async updateCategory(category: CategoryInfo): Promise<CategoryInfo> {
    try {
      await setDoc(doc(db, 'categories', category.id), cleanForFirestore(category), { merge: true });
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] updateCategory fallback:', err.message);
    }

    return this.apiFetch<CategoryInfo>(
      `/categories/${category.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(category),
      },
      () => category
    ).then((saved) => {
      const current = getStoredCategories();
      const updated = current.map((c) => (c.id === saved.id ? saved : c));
      setStoredCategories(updated);
      return saved;
    });
  }

  /**
   * Delete category from Firestore and Backend API
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] deleteCategory fallback:', err.message);
    }

    return this.apiFetch<{ id: string }>(
      `/categories/${categoryId}`,
      { method: 'DELETE' },
      () => ({ id: categoryId })
    ).then(() => {
      const current = getStoredCategories();
      const updated = current.filter((c) => c.id !== categoryId);
      setStoredCategories(updated);
      return true;
    });
  }

  /**
   * Submit category request
   */
  async saveCategoryRequest(categoryReq: CategoryRequest): Promise<CategoryRequest> {
    const reqId = `cat-req-${Date.now()}`;
    const fullReq = { ...categoryReq, id: reqId, createdAt: new Date().toISOString(), status: 'pending' as const };

    try {
      await setDoc(doc(db, 'category_requests', reqId), cleanForFirestore(fullReq));
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] saveCategoryRequest fallback:', err.message);
    }

    return this.apiFetch<CategoryRequest>(
      '/categories/requests',
      {
        method: 'POST',
        body: JSON.stringify(fullReq),
      },
      () => fullReq
    );
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

    return this.apiFetch<CategoryRequest[]>(
      '/categories/admin/requests',
      { method: 'GET' },
      () => []
    );
  }

  /**
   * Update category request status (Admin)
   */
  async updateCategoryRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
    try {
      await setDoc(doc(db, 'category_requests', requestId), { status }, { merge: true });
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] updateCategoryRequestStatus fallback:', err.message);
    }

    await this.apiFetch(
      `/categories/admin/requests/${requestId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      () => null
    );
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
          setStoredBanners(firestoreBanners);
          return firestoreBanners;
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] fetchBanners fallback:', err.message);
    }

    return this.apiFetch<LandingBanner[]>(
      '/banners',
      { method: 'GET' },
      () => getStoredBanners() || INITIAL_LANDING_BANNERS
    ).then((banners) => {
      setStoredBanners(banners);
      return banners;
    });
  }

  /**
   * Save banner to Firestore and Backend API
   */
  async saveBanner(banner: LandingBanner): Promise<LandingBanner> {
    const id = banner.id || `banner-${Date.now()}`;
    const fullBanner = { ...banner, id };

    try {
      await setDoc(doc(db, 'banners', id), cleanForFirestore(fullBanner), { merge: true });
      console.log('✅ [Firestore] Banner saved to cloud:', id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] saveBanner fallback:', err.message);
    }

    return this.apiFetch<LandingBanner>(
      '/banners',
      {
        method: 'POST',
        body: JSON.stringify(fullBanner),
      },
      () => {
        const current = getStoredBanners();
        const updated = [fullBanner, ...current.filter((b) => b.id !== fullBanner.id)];
        setStoredBanners(updated);
        return fullBanner;
      }
    ).then((saved) => {
      const current = getStoredBanners();
      const updated = [saved, ...current.filter((b) => b.id !== saved.id)];
      setStoredBanners(updated);
      return saved;
    });
  }

  /**
   * Update banner in Firestore and Backend API
   */
  async updateBanner(banner: LandingBanner): Promise<LandingBanner> {
    try {
      await setDoc(doc(db, 'banners', banner.id), cleanForFirestore(banner), { merge: true });
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] updateBanner fallback:', err.message);
    }

    return this.apiFetch<LandingBanner>(
      `/banners/${banner.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(banner),
      },
      () => banner
    ).then((saved) => {
      const current = getStoredBanners();
      const updated = current.map((b) => (b.id === saved.id ? saved : b));
      setStoredBanners(updated);
      return saved;
    });
  }

  /**
   * Delete banner from Firestore and Backend API
   */
  async deleteBanner(bannerId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'banners', bannerId));
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] deleteBanner fallback:', err.message);
    }

    return this.apiFetch<{ id: string }>(
      `/banners/${bannerId}`,
      { method: 'DELETE' },
      () => ({ id: bannerId })
    ).then(() => {
      const current = getStoredBanners();
      const updated = current.filter((b) => b.id !== bannerId);
      setStoredBanners(updated);
      return true;
    });
  }

  /**
   * Fetch comments for a video from Firestore with memory sorting to prevent index errors
   */
  async fetchComments(videoId: string): Promise<VideoComment[]> {
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
        return list;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] fetchComments fallback to API:', err.message);
    }

    return this.apiFetch<VideoComment[]>(
      `/comments/video/${videoId}`,
      { method: 'GET' },
      () => []
    );
  }

  /**
   * Subscribe to comments with Firestore Realtime onSnapshot (Live across all worldwide users)
   */
  subscribeToComments(videoId: string, callback: (comments: VideoComment[]) => void) {
    try {
      const q = query(
        collection(db, 'comments'),
        where('videoId', '==', videoId),
        limit(100)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: VideoComment[] = [];
        snapshot.forEach((d) => list.push({ ...(d.data() as VideoComment), id: d.id }));
        // Sort newest first in memory
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(list);
      }, (err) => {
        console.warn('⚠️ [Firestore Client] Comment realtime subscription fallback:', err.message);
      });
      return unsubscribe;
    } catch {
      const interval = setInterval(async () => {
        try {
          const comments = await this.fetchComments(videoId);
          callback(comments);
        } catch {}
      }, 10000);
      return () => clearInterval(interval);
    }
  }

  /**
   * Save comment to Firestore worldwide and Backend API
   */
  async saveComment(comment: VideoComment): Promise<VideoComment> {
    const id = comment.id || `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullComment: VideoComment = {
      ...comment,
      id,
      createdAt: comment.createdAt || new Date().toISOString(),
      likesCount: typeof comment.likesCount === 'number' ? comment.likesCount : 0,
    };

    try {
      await setDoc(doc(db, 'comments', id), cleanForFirestore(fullComment));
      console.log('✅ [Firestore] Comment posted to cloud database:', id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] saveComment notice:', err.message);
    }

    return this.apiFetch<VideoComment>(
      '/comments',
      {
        method: 'POST',
        body: JSON.stringify(fullComment),
      },
      () => fullComment
    );
  }

  /**
   * Like comment with Direct Atomic Firestore update
   */
  async likeComment(commentId: string): Promise<void> {
    try {
      const cRef = doc(db, 'comments', commentId);
      await updateDoc(cRef, { likesCount: increment(1) });
    } catch (err: any) {
      console.warn('⚠️ [Firestore] likeComment notice:', err?.message);
    }

    await this.apiFetch(
      `/comments/${commentId}/like`,
      { method: 'POST' },
      () => null
    );
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] deleteComment fallback:', err.message);
    }

    await this.apiFetch(
      `/comments/${commentId}`,
      { method: 'DELETE' },
      () => null
    );
  }

  /**
   * Save DMCA/Moderation Report
   */
  async saveReport(report: DMCAReport): Promise<DMCAReport> {
    const id = report.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullReport: DMCAReport = { ...report, id, createdAt: new Date().toISOString() };

    try {
      await setDoc(doc(db, 'reports', id), cleanForFirestore(fullReport));
      console.log('✅ [Firestore] Report saved to cloud database:', id);
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] saveReport fallback:', err.message);
    }

    return this.apiFetch<DMCAReport>(
      '/reports',
      {
        method: 'POST',
        body: JSON.stringify(fullReport),
      },
      () => {
        const current = getStoredReports();
        const updated = [fullReport, ...current.filter((r) => r.id !== fullReport.id)];
        setStoredReports(updated);
        return fullReport;
      }
    ).then((saved) => {
      const current = getStoredReports();
      const updated = [saved, ...current.filter((r) => r.id !== saved.id)];
      setStoredReports(updated);
      return saved;
    });
  }

  /**
   * Fetch reports (Admin)
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

    return this.apiFetch<DMCAReport[]>(
      '/reports',
      { method: 'GET' },
      () => getStoredReports()
    );
  }

  /**
   * Update report status (Admin)
   */
  async updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
    try {
      await setDoc(doc(db, 'reports', reportId), { status, resolvedAt: new Date().toISOString() }, { merge: true });
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] updateReportStatus fallback:', err.message);
    }

    await this.apiFetch(
      `/reports/${reportId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      () => null
    );
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

    return this.apiFetch<AdCampaign[]>(
      '/ads',
      { method: 'GET' },
      () => []
    );
  }

  /**
   * Save ad campaign to Firestore and Backend API
   */
  async saveAdCampaign(campaign: AdCampaign): Promise<AdCampaign> {
    const id = campaign.id || `ad-${Date.now()}`;
    const fullAd = { ...campaign, id };

    try {
      await setDoc(doc(db, 'ad_campaigns', id), cleanForFirestore(fullAd), { merge: true });
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] saveAdCampaign fallback:', err.message);
    }

    return this.apiFetch<AdCampaign>(
      '/ads',
      {
        method: 'POST',
        body: JSON.stringify(fullAd),
      },
      () => fullAd
    );
  }

  /**
   * Update ad campaign
   */
  async updateAdCampaign(campaign: AdCampaign): Promise<AdCampaign> {
    try {
      await setDoc(doc(db, 'ad_campaigns', campaign.id), cleanForFirestore(campaign), { merge: true });
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] updateAdCampaign fallback:', err.message);
    }

    return this.apiFetch<AdCampaign>(
      `/ads/${campaign.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(campaign),
      },
      () => campaign
    );
  }

  /**
   * Delete ad campaign
   */
  async deleteAdCampaign(campaignId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'ad_campaigns', campaignId));
    } catch (err: any) {
      console.warn('⚠️ [Firestore Client] deleteAdCampaign fallback:', err.message);
    }

    await this.apiFetch(
      `/ads/${campaignId}`,
      { method: 'DELETE' },
      () => null
    );
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
    const DEVICE_ID_KEY = 'fapnxx_device_uid';
    let devId = '';
    try {
      devId = localStorage.getItem(DEVICE_ID_KEY) || '';
    } catch {}

    if (!devId) {
      devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      try {
        localStorage.setItem(DEVICE_ID_KEY, devId);
      } catch {}
    }
    return devId;
  }

  /**
   * Sync all user interactions (saved videos, liked videos, watch history, preferences) to Firestore server database
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
      const deviceId = this.getDeviceId();
      const userDocRef = doc(db, 'user_interactions', deviceId);
      await setDoc(
        userDocRef,
        {
          ...data,
          deviceId,
          lastActiveAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log('✅ [Firestore] User interactions synced to server-side database for device:', deviceId);
    } catch (err: any) {
      console.warn('⚠️ [Firestore] User interactions server sync notice:', err?.message);
    }
  }

  /**
   * Fetch saved user interactions from Firestore server database
   */
  async fetchUserInteractionsFromFirestore(): Promise<{
    savedVideos?: string[];
    likedVideos?: string[];
    watchHistory?: any[];
    contentPreference?: string;
    ageVerified?: boolean;
  } | null> {
    try {
      const deviceId = this.getDeviceId();
      const userDocRef = doc(db, 'user_interactions', deviceId);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('✅ [Firestore] Loaded user interactions from server-side database for device:', deviceId);
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


