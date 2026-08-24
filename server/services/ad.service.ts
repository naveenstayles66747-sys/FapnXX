import { auditService } from './audit.service';
import { adminDb } from '../firebase-admin';

export interface AdCampaignRecord {
  id: string;
  brandName: string;
  title: string;
  bannerImage: string;
  targetUrl: string;
  cpmRate: string;
  impressions: number;
  clicks: number;
  isActive: boolean;
  position: 'banner_top' | 'card_inline' | 'pre_roll';
  createdAt?: string;
  updatedAt?: string;
}

const adCampaigns = new Map<string, AdCampaignRecord>();
let isFirestoreAdsInitialized = false;

const INITIAL_ADS: AdCampaignRecord[] = [
  {
    id: 'ad-1',
    brandName: 'FapnXX VIP Pass',
    title: 'Unlock Unlimited 4K Streaming & Original Content',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
    targetUrl: '#vip-upgrade',
    cpmRate: '$14.50',
    impressions: 142500,
    clicks: 8420,
    isActive: true,
    position: 'banner_top',
  },
  {
    id: 'ad-2',
    brandName: 'Luxury Silk Apparel',
    title: 'Exclusive Midnight Collection - 25% Off VIPs',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvu8sGdltZki91ehu4_TciVh4ojFc2rkzEbjdpwT0f5CLnFmvQzwYrEOQxEFJ_5nuaxrYR5ciK2iYmRsy2xBkg_ftrLdEVMKzs0Mo7wZJj8dGjATtrpcrXvwKvJX9cojHQ3HXSmrDB9oyFdG_EbNoZ_IyKVxNxSzjWcNqxV9DZCb9emwKm10HSw50UmQCf-2beum05L1bV6fTQBVtTvEbXbkY0kh99hiKCxl2v-kLPTgTtkEfqFhfeYQ',
    targetUrl: '#silk-collection',
    cpmRate: '$18.00',
    impressions: 89100,
    clicks: 5310,
    isActive: true,
    position: 'card_inline',
  },
];

INITIAL_ADS.forEach((a) => adCampaigns.set(a.id, a));

// Sync from Firestore DB
async function initFirestoreAdsSync() {
  if (isFirestoreAdsInitialized) return;
  try {
    const snapshot = await adminDb.collection('ad_campaigns').get();
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        const data = doc.data() as AdCampaignRecord;
        adCampaigns.set(doc.id, { ...data, id: doc.id });
      });
      console.log(`✅ [Firestore AdService] Loaded ${snapshot.size} ad campaigns from Firestore.`);
    }
    isFirestoreAdsInitialized = true;
  } catch (err: any) {
    console.warn('⚠️ [Firestore AdService] Sync fallback:', err.message);
  }
}

initFirestoreAdsSync();

export const adService = {
  listAds: async (activeOnly = false): Promise<AdCampaignRecord[]> => {
    try {
      const snap = await adminDb.collection('ad_campaigns').get();
      if (!snap.empty) {
        let list: AdCampaignRecord[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as AdCampaignRecord;
          const a = { ...data, id: doc.id };
          list.push(a);
          adCampaigns.set(doc.id, a);
        });
        if (activeOnly) {
          list = list.filter((a) => a.isActive);
        }
        return list;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore AdService] listAds notice:', err.message);
    }

    let list = Array.from(adCampaigns.values());
    if (activeOnly) {
      list = list.filter((a) => a.isActive);
    }
    return list;
  },

  findById: async (id: string): Promise<AdCampaignRecord | undefined> => {
    try {
      const docSnap = await adminDb.collection('ad_campaigns').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data() as AdCampaignRecord;
        const a = { ...data, id: docSnap.id };
        adCampaigns.set(id, a);
        return a;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore AdService] findById notice:', err.message);
    }
    return adCampaigns.get(id);
  },

  create: async (data: AdCampaignRecord, actorId: string, actorEmail: string, actorRole: string): Promise<AdCampaignRecord> => {
    const id = data.id || `ad-${Date.now()}`;
    const now = new Date().toISOString();
    const newAd: AdCampaignRecord = {
      ...data,
      id,
      impressions: 0,
      clicks: 0,
      createdAt: now,
      updatedAt: now,
    };

    adCampaigns.set(id, newAd);

    // Save to Firestore DB
    try {
      await adminDb.collection('ad_campaigns').doc(id).set(newAd);
    } catch (err: any) {
      console.warn(`[Firestore AdCampaign] Save error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'ad.created',
      targetType: 'ad_campaign',
      targetId: id,
      metadata: { brandName: newAd.brandName, title: newAd.title },
    });

    return newAd;
  },

  update: async (id: string, updates: Partial<AdCampaignRecord>, actorId: string, actorEmail: string, actorRole: string): Promise<AdCampaignRecord> => {
    const existing = await adService.findById(id);
    if (!existing) {
      throw new Error(`Ad Campaign with ID ${id} not found.`);
    }

    const updated: AdCampaignRecord = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    adCampaigns.set(id, updated);

    // Update in Firestore DB
    try {
      await adminDb.collection('ad_campaigns').doc(id).set(updated, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore AdCampaign] Update error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'ad.updated',
      targetType: 'ad_campaign',
      targetId: id,
      metadata: { brandName: updated.brandName },
    });

    return updated;
  },

  delete: async (id: string, actorId: string, actorEmail: string, actorRole: string): Promise<boolean> => {
    const existing = await adService.findById(id);
    if (!existing) return false;

    adCampaigns.delete(id);

    // Delete from Firestore DB
    try {
      await adminDb.collection('ad_campaigns').doc(id).delete();
    } catch (err: any) {
      console.warn(`[Firestore AdCampaign] Delete error for doc ${id}:`, err.message);
    }

    await auditService.log({
      actorId,
      actorEmail,
      actorRole,
      action: 'ad.deleted',
      targetType: 'ad_campaign',
      targetId: id,
      metadata: { brandName: existing.brandName },
    });

    return true;
  },

  recordImpression: (id: string): void => {
    const ad = adCampaigns.get(id);
    if (ad && ad.isActive) {
      ad.impressions += 1;
      adCampaigns.set(id, ad);

      // Async update in Firestore DB
      adminDb.collection('ad_campaigns').doc(id).set({
        impressions: ad.impressions,
      }, { merge: true }).catch(() => null);
    }
  },

  recordClick: (id: string): void => {
    const ad = adCampaigns.get(id);
    if (ad && ad.isActive) {
      ad.clicks += 1;
      adCampaigns.set(id, ad);

      // Async update in Firestore DB
      adminDb.collection('ad_campaigns').doc(id).set({
        clicks: ad.clicks,
      }, { merge: true }).catch(() => null);
    }
  },
};

