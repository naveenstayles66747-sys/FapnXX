import { auditService } from './audit.service';

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

export const adService = {
  listAds: (activeOnly = false): AdCampaignRecord[] => {
    let list = Array.from(adCampaigns.values());
    if (activeOnly) {
      list = list.filter((a) => a.isActive);
    }
    return list;
  },

  findById: (id: string): AdCampaignRecord | undefined => {
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
    const existing = adCampaigns.get(id);
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
    const existing = adCampaigns.get(id);
    if (!existing) return false;

    adCampaigns.delete(id);

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
    }
  },

  recordClick: (id: string): void => {
    const ad = adCampaigns.get(id);
    if (ad && ad.isActive) {
      ad.clicks += 1;
      adCampaigns.set(id, ad);
    }
  },
};
