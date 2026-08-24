import { auditService } from './audit.service';
import { adminDb } from '../firebase-admin';

export interface LandingBannerRecord {
  id: string;
  title: string;
  subtitle: string;
  bannerImage: string;
  tag: string;
  targetCategory?: string;
  targetVideoId?: string;
  ctaText?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// In-memory cache synced with Firestore
const banners = new Map<string, LandingBannerRecord>();
let isFirestoreBannersInitialized = false;

// Sync from Firestore DB
async function initFirestoreBannersSync() {
  if (isFirestoreBannersInitialized) return;
  try {
    const snapshot = await adminDb.collection('banners').get();
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        const data = doc.data() as LandingBannerRecord;
        banners.set(doc.id, { ...data, id: doc.id });
      });
      console.log(`✅ [Firestore BannerService] Loaded ${snapshot.size} banners from Firestore.`);
    }
    isFirestoreBannersInitialized = true;
  } catch (err: any) {
    console.warn('⚠️ [Firestore BannerService] Sync notice:', err.message);
  }
}

initFirestoreBannersSync();

export const bannerService = {
  listBanners: async (activeOnly = false): Promise<LandingBannerRecord[]> => {
    try {
      const snap = await adminDb.collection('banners').get();
      if (!snap.empty) {
        let list: LandingBannerRecord[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as LandingBannerRecord;
          const b = { ...data, id: doc.id };
          list.push(b);
          banners.set(doc.id, b);
        });
        if (activeOnly) {
          list = list.filter((b) => b.isActive);
        }
        return list;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore BannerService] listBanners notice:', err.message);
    }

    let list = Array.from(banners.values());
    if (activeOnly) {
      list = list.filter((b) => b.isActive);
    }
    return list;
  },

  findById: async (id: string): Promise<LandingBannerRecord | undefined> => {
    try {
      const docSnap = await adminDb.collection('banners').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data() as LandingBannerRecord;
        const b = { ...data, id: docSnap.id };
        banners.set(id, b);
        return b;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore BannerService] findById notice:', err.message);
    }
    return banners.get(id);
  },

  create: async (data: LandingBannerRecord, actorId: string, actorEmail: string, actorRole: string): Promise<LandingBannerRecord> => {
    const id = data.id || `banner-${Date.now()}`;
    const now = new Date().toISOString();
    const newBanner: LandingBannerRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    banners.set(id, newBanner);

    // Save to Firestore DB
    try {
      await adminDb.collection('banners').doc(id).set(newBanner);
    } catch (err: any) {
      console.warn(`[Firestore Banner] Save error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'banner.created',
      targetType: 'banner',
      targetId: id,
      metadata: { title: newBanner.title },
    });

    return newBanner;
  },

  update: async (id: string, updates: Partial<LandingBannerRecord>, actorId: string, actorEmail: string, actorRole: string): Promise<LandingBannerRecord> => {
    const existing = await bannerService.findById(id);
    if (!existing) {
      throw new Error(`Banner with ID ${id} not found.`);
    }

    const updated: LandingBannerRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    banners.set(id, updated);

    // Update in Firestore DB
    try {
      await adminDb.collection('banners').doc(id).set(updated, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore Banner] Update error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'banner.updated',
      targetType: 'banner',
      targetId: id,
      metadata: { title: updated.title },
    });

    return updated;
  },

  delete: async (id: string, actorId: string, actorEmail: string, actorRole: string): Promise<boolean> => {
    const existing = await bannerService.findById(id);
    if (!existing) return false;

    banners.delete(id);

    // Delete from Firestore DB
    try {
      await adminDb.collection('banners').doc(id).delete();
    } catch (err: any) {
      console.warn(`[Firestore Banner] Delete error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'banner.deleted',
      targetType: 'banner',
      targetId: id,
      metadata: { title: existing.title },
    });

    return true;
  },
};

