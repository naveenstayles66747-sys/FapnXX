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
import { storage } from './firebaseConfig';

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
   * Fetch all videos via Backend API with static catalog and local storage fallbacks
   */
  async fetchVideos(category?: string): Promise<Video[]> {
    const query = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    
    return this.apiFetch<{ videos: Video[]; total: number }>(
      `/videos${query}`,
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
   * Subscribe to videos (poller / live updates)
   */
  subscribeToVideos(callback: (videos: Video[]) => void) {
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

  /**
   * Save a new video to the Backend API
   */
  async saveVideo(video: Video): Promise<Video> {
    return this.apiFetch<Video>(
      '/videos',
      {
        method: 'POST',
        body: JSON.stringify(video),
      },
      () => {
        const current = getStoredVideos();
        const updated = [video, ...current.filter((v) => v.id !== video.id)];
        setStoredVideos(updated);
        return video;
      }
    ).then((saved) => {
      const current = getStoredVideos();
      const updated = [saved, ...current.filter((v) => v.id !== saved.id)];
      setStoredVideos(updated);
      return saved;
    });
  }

  /**
   * Update an existing video
   */
  async updateVideo(video: Video): Promise<Video> {
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
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<boolean> {
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
   * Secure Anti-Spam View Counter
   */
  async incrementVideoViews(videoId: string): Promise<number> {
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
   * Secure Likes Counter
   */
  async incrementVideoLikes(videoId: string, isLike: boolean): Promise<number> {
    return this.apiFetch<{ likesCount: number }>(
      `/videos/${videoId}/likes`,
      {
        method: 'POST',
        body: JSON.stringify({ isLike }),
      },
      () => {
        const current = getStoredVideos();
        let newCount = 1200;
        const delta = isLike ? 1 : -1;
        const updated = current.map((v) => {
          if (v.id === videoId) {
            newCount = Math.max(0, (v.likesCount || 1200) + delta);
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
   * Fetch all categories
   */
  async fetchCategories(): Promise<CategoryInfo[]> {
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
   * Save a category
   */
  async saveCategory(category: CategoryInfo): Promise<CategoryInfo> {
    return this.apiFetch<CategoryInfo>(
      '/categories',
      {
        method: 'POST',
        body: JSON.stringify(category),
      },
      () => {
        const current = getStoredCategories();
        const updated = [...current.filter((c) => c.id !== category.id), category];
        setStoredCategories(updated);
        return category;
      }
    ).then((saved) => {
      const current = getStoredCategories();
      const updated = [...current.filter((c) => c.id !== saved.id), saved];
      setStoredCategories(updated);
      return saved;
    });
  }

  /**
   * Update category
   */
  async updateCategory(category: CategoryInfo): Promise<CategoryInfo> {
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
   * Delete category
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
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
    return this.apiFetch<CategoryRequest>(
      '/categories/requests',
      {
        method: 'POST',
        body: JSON.stringify({
          categoryName: categoryReq.categoryName,
          videoTitle: categoryReq.videoTitle,
          requestedByEmail: categoryReq.requestedByEmail,
        }),
      },
      () => categoryReq
    );
  }

  /**
   * Fetch all category requests (Admin)
   */
  async fetchCategoryRequests(): Promise<CategoryRequest[]> {
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
   * Fetch landing banners
   */
  async fetchBanners(): Promise<LandingBanner[]> {
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
   * Save banner
   */
  async saveBanner(banner: LandingBanner): Promise<LandingBanner> {
    return this.apiFetch<LandingBanner>(
      '/banners',
      {
        method: 'POST',
        body: JSON.stringify(banner),
      },
      () => {
        const current = getStoredBanners();
        const updated = [banner, ...current.filter((b) => b.id !== banner.id)];
        setStoredBanners(updated);
        return banner;
      }
    ).then((saved) => {
      const current = getStoredBanners();
      const updated = [saved, ...current.filter((b) => b.id !== saved.id)];
      setStoredBanners(updated);
      return saved;
    });
  }

  /**
   * Update banner
   */
  async updateBanner(banner: LandingBanner): Promise<LandingBanner> {
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
   * Delete banner
   */
  async deleteBanner(bannerId: string): Promise<boolean> {
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
   * Fetch comments for a video
   */
  async fetchComments(videoId: string): Promise<VideoComment[]> {
    return this.apiFetch<VideoComment[]>(
      `/comments/video/${videoId}`,
      { method: 'GET' },
      () => []
    );
  }

  /**
   * Subscribe to comments
   */
  subscribeToComments(videoId: string, callback: (comments: VideoComment[]) => void) {
    const interval = setInterval(async () => {
      try {
        const comments = await this.fetchComments(videoId);
        callback(comments);
      } catch {}
    }, 10000);

    return () => clearInterval(interval);
  }

  /**
   * Save comment
   */
  async saveComment(comment: VideoComment): Promise<VideoComment> {
    return this.apiFetch<VideoComment>(
      '/comments',
      {
        method: 'POST',
        body: JSON.stringify({
          videoId: comment.videoId,
          text: comment.text,
          userName: comment.userName,
          userAvatar: comment.userAvatar,
        }),
      },
      () => comment
    );
  }

  /**
   * Like comment
   */
  async likeComment(commentId: string): Promise<void> {
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
    return this.apiFetch<DMCAReport>(
      '/reports',
      {
        method: 'POST',
        body: JSON.stringify(report),
      },
      () => {
        const current = getStoredReports();
        const updated = [report, ...current.filter((r) => r.id !== report.id)];
        setStoredReports(updated);
        return report;
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
   * Fetch ad campaigns
   */
  async fetchAdCampaigns(): Promise<AdCampaign[]> {
    return this.apiFetch<AdCampaign[]>(
      '/ads',
      { method: 'GET' },
      () => []
    );
  }

  /**
   * Save ad campaign
   */
  async saveAdCampaign(campaign: AdCampaign): Promise<AdCampaign> {
    return this.apiFetch<AdCampaign>(
      '/ads',
      {
        method: 'POST',
        body: JSON.stringify(campaign),
      },
      () => campaign
    );
  }

  /**
   * Update ad campaign
   */
  async updateAdCampaign(campaign: AdCampaign): Promise<AdCampaign> {
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
}

export const videoService = new VideoService();
export default videoService;
