import { adminDb } from './firebase-admin.js';

async function seedCleanCollections() {
  console.log('🚀 [Firestore Init] Creating clean initial structure for all collections...');

  // 1. Clean Banners (Initial 4K Landing Banners)
  const banners = [
    {
      id: 'banner-1',
      title: 'Neon Midnight Fantasies',
      subtitle: 'Exclusive 4K Ultra-HD release featuring top international performers in a private penthouse setting.',
      bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      tag: 'Featured 4K Release',
      targetCategory: 'trending',
      ctaText: 'Watch Now in 4K',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'banner-2',
      title: 'Private VIP Encounters',
      subtitle: 'Unfiltered, raw, and intense scenes curated specifically for FapnXX members.',
      bannerImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop',
      tag: 'Exclusive VIP',
      targetCategory: 'milf',
      ctaText: 'Explore VIP Series',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  ];

  for (const b of banners) {
    await adminDb.collection('banners').doc(b.id).set(b, { merge: true });
  }
  console.log(`✅ Seeded ${banners.length} clean banners in 'banners' collection`);

  // 2. Clean Ad Campaign (Starting with 0 impressions & 0 clicks)
  const cleanAd = {
    id: 'ad-001',
    name: 'Featured Partner Sponsorship',
    type: 'banner',
    placement: 'banner_top',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=728&auto=format&fit=crop',
    targetUrl: 'https://fapnxx.com/premium',
    isActive: true,
    impressions: 0,
    clicks: 0,
    createdAt: new Date().toISOString(),
  };
  await adminDb.collection('ad_campaigns').doc(cleanAd.id).set(cleanAd, { merge: true });
  console.log(`✅ Initialized clean ad campaign in 'ad_campaigns' with 0 impressions`);

  // 3. Clean Categories
  const categories = [
    { id: 'trending', name: 'Trending', icon: 'local_fire_department', description: 'The hottest and most popular exclusive content trending across FapnXX.' },
    { id: 'amateur', name: 'Amateur', icon: 'person', description: 'Discover the most popular community-uploaded content and raw cuts.' },
    { id: 'milf', name: 'MILF', icon: 'family_restroom', description: 'Sophisticated luxury series and experienced performers in high definition.' },
    { id: 'teen', name: 'Teen', icon: 'emergency', description: 'Young adult performers and vibrant, energetic cinematic encounters (18+).' },
    { id: 'anal', name: 'Anal', icon: 'settings_input_component', description: 'High-intensity, premium adult productions and uncensored releases.' },
    { id: 'lesbian', name: 'Lesbian', icon: 'female', description: 'Passionate and aesthetic female-centered romance and encounters.' },
    { id: 'pov', name: 'POV', icon: 'visibility', description: 'Immerse yourself completely. Experience every scene from the most intimate perspective.' },
  ];

  for (const c of categories) {
    await adminDb.collection('categories').doc(c.id).set(c, { merge: true });
  }
  console.log(`✅ Seeded ${categories.length} categories in 'categories' collection`);

  console.log('🎉 [Setup Finished] All collections now have clean, structured documents in Firestore!');
  process.exit(0);
}

seedCleanCollections().catch((err) => {
  console.error('❌ Init error:', err);
  process.exit(1);
});
