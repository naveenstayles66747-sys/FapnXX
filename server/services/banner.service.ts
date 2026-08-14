import { auditService } from './audit.service';

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

const banners = new Map<string, LandingBannerRecord>();

const INITIAL_BANNERS: LandingBannerRecord[] = [
  {
    id: 'banner-1',
    title: 'Neon Midnight Fantasies',
    subtitle: 'Exclusive 4K Ultra-HD release featuring top international performers in a private penthouse setting.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
    tag: 'Featured 4K Release',
    targetCategory: 'trending',
    ctaText: 'Watch Now in 4K',
    isActive: true,
  },
  {
    id: 'banner-2',
    title: 'Private VIP Encounters',
    subtitle: 'Unfiltered, raw, and intense scenes curated specifically for FapnXX members.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTSrT7ZfnLWJmVyGjfLgykiPkmf7a4I4Z57uEg4c8C2_mJ0w3Y2UlFj5Gp5iEtMegkDAtFW4BKpVK3JE5pODTLTPETiDTQyukLYcV--2v9vb8b-OEkgHaWihpbbRppVRY0YbgqDfyvtuphn5xrfVZWgyDUKRJA2wZVxWJTWpDmQ6DpzeuUmUe8ySRNKup3oJc5VLYhRtM6nfKRK-UOZLtbi132Yme7AQeLMsUzD79lpUUp9Ckdox0HQQ',
    tag: 'VIP Originals',
    targetCategory: 'amateur',
    ctaText: 'Stream VIP Scene',
    isActive: true,
  },
];

INITIAL_BANNERS.forEach((b) => banners.set(b.id, b));

export const bannerService = {
  listBanners: (activeOnly = false): LandingBannerRecord[] => {
    let list = Array.from(banners.values());
    if (activeOnly) {
      list = list.filter((b) => b.isActive);
    }
    return list;
  },

  findById: (id: string): LandingBannerRecord | undefined => {
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
    const existing = banners.get(id);
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
    const existing = banners.get(id);
    if (!existing) return false;

    banners.delete(id);

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
