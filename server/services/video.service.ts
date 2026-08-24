import { VideoStatus } from '../config/constants';
import { auditService } from './audit.service';
import { adminDb } from '../firebase-admin';

export interface VideoRecord {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  categories?: string[];
  tags: string[];
  models_actors?: string[];
  modelsActors?: string[];
  performers?: string[];
  channelName?: string;
  sourceWebsite?: string;
  sourceWebsiteUrl?: string;
  thumbnail: string;
  thumbnailUrl?: string;
  duration: string;
  quality: '4K' | 'HD' | 'UHD';
  views: string;
  viewsCount: number;
  likesCount: number;
  rating?: string;
  timeAgo: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  performerName: string;
  performerAvatar?: string;
  description: string;
  orientation?: 'straight' | 'gay' | 'lesbian' | 'horizontal' | 'vertical' | 'vr' | string;
  isExclusive?: boolean;
  isNew?: boolean;
  isOriginal?: boolean;
  embedUrl?: string;
  previewMp4Url?: string;
  previewWebpUrl?: string;
  vttUrl?: string;
  spriteUrl?: string;
  vastAdTagUrl?: string;
  isEmbed?: boolean;
  isSponsored?: boolean;
  status: VideoStatus;
  createdBy: string;
  uploadedBy?: string;
  approvedBy?: string;
  publishedBy?: string;
  version: number;
}

// In-memory cache synced with Firestore
const videos = new Map<string, VideoRecord>();
let isFirestoreInitialized = false;

// View debounce map: `${videoId}_${ipOrSession}` -> lastCountedTimestamp
const viewCooldowns = new Map<string, number>();
const VIEW_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// Initial video seeds
const INITIAL_SEED_VIDEOS: VideoRecord[] = [
  {
    id: 'vid-test-user-1',
    title: 'Desi Romance Scene 4K',
    category: 'amateur',
    categoryLabel: 'Amateur',
    categories: ['amateur', 'trending'],
    tags: ['Amateur', 'HD', 'Featured', 'Desi'],
    models_actors: ['Pooja B', 'Karan'],
    modelsActors: ['Pooja B', 'Karan'],
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
    duration: '05:00',
    quality: 'HD',
    views: '1.2K views',
    viewsCount: 1200,
    likesCount: 340,
    rating: '98%',
    timeAgo: '2 hours ago',
    createdAt: '2026-08-10T12:00:00.000Z',
    updatedAt: '2026-08-10T12:00:00.000Z',
    publishedAt: '2026-08-10T12:00:00.000Z',
    performerName: 'User Uploaded',
    performerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
    description: 'Exclusive adult video stream.',
    orientation: 'straight',
    isNew: true,
    embedUrl: 'https://hornhub.embedseek.com/#9sq8g',
    isEmbed: true,
    status: VideoStatus.PUBLISHED,
    createdBy: 'system',
    version: 1,
  },
];

INITIAL_SEED_VIDEOS.forEach((v) => videos.set(v.id, v));

// Synchronize from Firestore Collection on start & real-time updates
async function initFirestoreVideosSync() {
  if (isFirestoreInitialized) return;
  try {
    const snapshot = await adminDb.collection('videos').get();
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        const data = doc.data() as VideoRecord;
        videos.set(doc.id, { ...data, id: doc.id });
      });
      console.log(`✅ [Firestore VideoService] Loaded ${snapshot.size} videos from Firestore DB.`);
    } else {
      // Seed default videos to Firestore
      for (const v of INITIAL_SEED_VIDEOS) {
        await adminDb.collection('videos').doc(v.id).set(v, { merge: true });
      }
      console.log('🌱 [Firestore VideoService] Seeded initial videos to Firestore DB.');
    }
    isFirestoreInitialized = true;
  } catch (err: any) {
    console.warn('⚠️ [Firestore VideoService] Sync fallback:', err.message);
  }
}

// Trigger initial sync
initFirestoreVideosSync();


export const videoServiceBackend = {
  listVideos: async (options?: {
    page?: number;
    limit?: number;
    category?: string;
    orientation?: string;
    search?: string;
    status?: VideoStatus;
    includeUnpublished?: boolean;
    sort?: 'newest' | 'trending' | 'views' | 'likes';
  }): Promise<{ videos: VideoRecord[]; total: number; page: number; totalPages: number }> => {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 24));

    // 1. Direct Firestore query as authoritative single source of truth
    try {
      const snap = await adminDb.collection('videos').get();
      if (!snap.empty) {
        let list: VideoRecord[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as VideoRecord;
          const record = { ...data, id: doc.id };
          list.push(record);
          videos.set(doc.id, record);
        });

        // By default, public listing only returns PUBLISHED videos unless requested by admin
        if (!options?.includeUnpublished) {
          list = list.filter((v) => v.status === VideoStatus.PUBLISHED || !v.status);
        } else if (options?.status) {
          list = list.filter((v) => v.status === options.status);
        }

        if (options?.category && options.category !== 'all') {
          const cat = options.category.toLowerCase();
          list = list.filter(
            (v) =>
              v.category?.toLowerCase() === cat ||
              v.categories?.some((c) => c.toLowerCase() === cat)
          );
        }

        if (options?.orientation && options.orientation !== 'all') {
          const ori = options.orientation.toLowerCase();
          list = list.filter((v) => !v.orientation || v.orientation.toLowerCase() === ori);
        }

        if (options?.search) {
          const q = options.search.toLowerCase();
          list = list.filter(
            (v) =>
              v.title?.toLowerCase().includes(q) ||
              v.description?.toLowerCase().includes(q) ||
              v.tags?.some((t) => t.toLowerCase().includes(q)) ||
              v.models_actors?.some((m) => m.toLowerCase().includes(q)) ||
              v.performerName?.toLowerCase().includes(q)
          );
        }

        // Sort order
        if (options?.sort === 'views') {
          list.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
        } else if (options?.sort === 'likes') {
          list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
        } else {
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }

        const total = list.length;
        const startIndex = (page - 1) * limit;
        const paginated = list.slice(startIndex, startIndex + limit);

        return {
          videos: paginated,
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore VideoService] Query notice:', err.message);
    }

    // 2. Memory cache fallback
    let list = Array.from(videos.values());

    if (!options?.includeUnpublished) {
      list = list.filter((v) => v.status === VideoStatus.PUBLISHED || !v.status);
    } else if (options?.status) {
      list = list.filter((v) => v.status === options.status);
    }

    if (options?.category && options.category !== 'all') {
      const cat = options.category.toLowerCase();
      list = list.filter(
        (v) =>
          v.category?.toLowerCase() === cat ||
          v.categories?.some((c) => c.toLowerCase() === cat)
      );
    }

    if (options?.orientation && options.orientation !== 'all') {
      const ori = options.orientation.toLowerCase();
      list = list.filter((v) => !v.orientation || v.orientation.toLowerCase() === ori);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q) ||
          v.tags?.some((t) => t.toLowerCase().includes(q)) ||
          v.models_actors?.some((m) => m.toLowerCase().includes(q)) ||
          v.performerName?.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (options?.sort === 'views') {
      list.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
    } else if (options?.sort === 'likes') {
      list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      videos: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  findById: async (id: string): Promise<VideoRecord | undefined> => {
    try {
      const docSnap = await adminDb.collection('videos').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data() as VideoRecord;
        const record = { ...data, id: docSnap.id };
        videos.set(id, record);
        return record;
      }
    } catch (err: any) {
      console.warn(`[Firestore VideoService] findById notice:`, err.message);
    }
    return videos.get(id);
  },

  create: async (data: Partial<VideoRecord>, actorId: string, actorEmail: string, actorRole: string): Promise<VideoRecord> => {
    const id = data.id || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newVideo: VideoRecord = {
      id,
      title: data.title?.trim() || 'Untitled Video',
      category: data.category || 'trending',
      categoryLabel: data.categoryLabel || 'Trending',
      categories: data.categories || (data.category ? [data.category] : ['trending']),
      tags: data.tags || ['HD'],
      models_actors: data.models_actors || data.modelsActors || [],
      modelsActors: data.models_actors || data.modelsActors || [],
      performers: data.performers || [],
      channelName: data.channelName,
      sourceWebsite: data.sourceWebsite,
      sourceWebsiteUrl: data.sourceWebsiteUrl,
      thumbnail: data.thumbnail || data.thumbnailUrl || '',
      thumbnailUrl: data.thumbnailUrl || data.thumbnail || '',
      duration: data.duration || '05:00',
      quality: data.quality || 'HD',
      views: '1 view',
      viewsCount: 1,
      likesCount: 0,
      rating: '100%',
      timeAgo: 'Just now',
      createdAt: now,
      updatedAt: now,
      publishedAt: data.status === VideoStatus.PUBLISHED ? now : undefined,
      performerName: data.performerName || 'User Uploaded',
      performerAvatar: data.performerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
      description: data.description || '',
      orientation: data.orientation || 'horizontal',
      isExclusive: !!data.isExclusive,
      isNew: true,
      embedUrl: data.embedUrl || '',
      previewMp4Url: data.previewMp4Url || '',
      previewWebpUrl: data.previewWebpUrl || '',
      vttUrl: data.vttUrl || '',
      spriteUrl: data.spriteUrl || '',
      isEmbed: true,
      status: data.status || VideoStatus.PUBLISHED,
      createdBy: actorId,
      uploadedBy: actorId,
      publishedBy: data.status === VideoStatus.PUBLISHED ? actorId : undefined,
      version: 1,
    };

    videos.set(id, newVideo);

    // Save permanently to Firestore DB
    try {
      await adminDb.collection('videos').doc(id).set(newVideo);
    } catch (err: any) {
      console.warn(`[Firestore Video] Save error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'video.created',
      targetType: 'video',
      targetId: id,
      metadata: { title: newVideo.title, status: newVideo.status },
    });

    return newVideo;
  },

  update: async (
    id: string,
    updates: Partial<VideoRecord>,
    actorId: string,
    actorEmail: string,
    actorRole: string
  ): Promise<VideoRecord> => {
    const existing = videos.get(id);
    if (!existing) {
      throw new Error(`Video with ID ${id} not found.`);
    }

    const now = new Date().toISOString();
    const updated: VideoRecord = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable ID
      updatedAt: now,
      version: (existing.version || 1) + 1,
    };

    if (updates.status === VideoStatus.PUBLISHED && existing.status !== VideoStatus.PUBLISHED) {
      updated.publishedAt = now;
      updated.publishedBy = actorId;
    }

    videos.set(id, updated);

    // Update permanently in Firestore DB
    try {
      await adminDb.collection('videos').doc(id).set(updated, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore Video] Update error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'video.updated',
      targetType: 'video',
      targetId: id,
      metadata: { changedFields: Object.keys(updates) },
    });

    return updated;
  },

  delete: async (id: string, actorId: string, actorEmail: string, actorRole: string): Promise<boolean> => {
    const existing = videos.get(id);
    if (!existing) {
      return false;
    }

    videos.delete(id);

    // Delete permanently from Firestore DB
    try {
      await adminDb.collection('videos').doc(id).delete();
    } catch (err: any) {
      console.warn(`[Firestore Video] Delete error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'video.deleted',
      targetType: 'video',
      targetId: id,
      metadata: { title: existing.title },
    });

    return true;
  },

  incrementViewCount: async (videoId: string, clientIdentifier: string): Promise<{ newViewsCount: number; counted: boolean }> => {
    let video = videos.get(videoId);
    if (!video) {
      const snap = await adminDb.collection('videos').doc(videoId).get();
      if (snap.exists) {
        video = { ...(snap.data() as VideoRecord), id: snap.id };
        videos.set(videoId, video);
      }
    }
    if (!video) {
      throw new Error('Video not found.');
    }

    const cooldownKey = `${videoId}_${clientIdentifier}`;
    const lastCounted = viewCooldowns.get(cooldownKey);
    const now = Date.now();

    // Anti-spam debounce: if viewed within last 10 minutes from this client, return current count without incrementing
    if (lastCounted && now - lastCounted < VIEW_COOLDOWN_MS) {
      return { newViewsCount: video.viewsCount || 1, counted: false };
    }

    viewCooldowns.set(cooldownKey, now);
    video.viewsCount = (video.viewsCount || 0) + 1;
    video.views = `${video.viewsCount} ${video.viewsCount === 1 ? 'view' : 'views'}`;
    videos.set(videoId, video);

    // Persist view count directly to Firestore
    try {
      await adminDb.collection('videos').doc(videoId).set({
        viewsCount: video.viewsCount,
        views: video.views,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore Video] View update error for doc ${videoId}:`, err.message);
    }

    return { newViewsCount: video.viewsCount, counted: true };
  },

  incrementLikes: async (videoId: string, isLike: boolean): Promise<{ likesCount: number; rating: string }> => {
    let video = videos.get(videoId);
    if (!video) {
      const snap = await adminDb.collection('videos').doc(videoId).get();
      if (snap.exists) {
        video = { ...(snap.data() as VideoRecord), id: snap.id };
        videos.set(videoId, video);
      }
    }
    if (!video) {
      throw new Error('Video not found.');
    }

    const delta = isLike ? 1 : -1;
    video.likesCount = Math.max(0, (video.likesCount || 0) + delta);
    
    // Server-calculated verified rating (prevents client-side arbitrary rating manipulation)
    const baseViews = Math.max(1, video.viewsCount || 1);
    const likeRatio = Math.min(1, video.likesCount / baseViews);
    const calculatedScore = Math.round(75 + likeRatio * 25);
    video.rating = `${Math.min(100, Math.max(50, calculatedScore))}%`;

    videos.set(videoId, video);

    // Persist likes and calculated rating directly to Firestore
    try {
      await adminDb.collection('videos').doc(videoId).set({
        likesCount: video.likesCount,
        rating: video.rating,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore Video] Likes update error for doc ${videoId}:`, err.message);
    }

    return { likesCount: video.likesCount, rating: video.rating };
  },
};
