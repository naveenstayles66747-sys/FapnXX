import { adminDb } from './firebase-admin';

// ============================================================
// FULL FIRESTORE SEEDER — seeds videos, categories, banners,
// ads, users, comments into Firestore so the console shows data
// ============================================================

async function seedAll() {
  console.log('\n🚀 Starting Full Firestore Seeder for Project: indianfullxx\n');

  // ── 1. CATEGORIES ─────────────────────────────────────────
  const categories = [
    { id: 'all', name: 'All', icon: '🎬', slug: 'all', order: 0 },
    { id: 'trending', name: 'Trending', icon: '🔥', slug: 'trending', order: 1 },
    { id: 'amateur', name: 'Amateur', icon: '📹', slug: 'amateur', order: 2 },
    { id: 'milf', name: 'MILF', icon: '💋', slug: 'milf', order: 3 },
    { id: 'teen', name: 'Teen', icon: '🌟', slug: 'teen', order: 4 },
    { id: 'asian', name: 'Asian', icon: '🌸', slug: 'asian', order: 5 },
    { id: 'desi', name: 'Desi', icon: '🇮🇳', slug: 'desi', order: 6 },
    { id: 'lesbian', name: 'Lesbian', icon: '💞', slug: 'lesbian', order: 7 },
    { id: 'hentai', name: 'Hentai', icon: '🎭', slug: 'hentai', order: 8 },
    { id: 'vr', name: 'VR', icon: '🥽', slug: 'vr', order: 9 },
  ];

  const catSnap = await adminDb.collection('categories').get();
  if (catSnap.empty) {
    const batch = adminDb.batch();
    for (const cat of categories) {
      batch.set(adminDb.collection('categories').doc(cat.id), {
        ...cat,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
    console.log(`✅ Seeded ${categories.length} categories`);
  } else {
    console.log(`⏭️  Categories already exist (${catSnap.size} found) — skipping`);
  }

  // ── 2. VIDEOS ──────────────────────────────────────────────
  const videos = [
    {
      id: 'vid-001',
      title: 'Desi Bhabhi Romance 4K',
      category: 'desi',
      categoryLabel: 'Desi',
      categories: ['desi', 'trending', 'amateur'],
      tags: ['Desi', '4K', 'Amateur', 'Bhabhi'],
      models_actors: ['Priya Sharma'],
      thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
      duration: '12:45',
      quality: '4K',
      views: '45.2K views',
      viewsCount: 45200,
      likesCount: 3800,
      rating: '97%',
      timeAgo: '2 days ago',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      performerName: 'Priya Sharma',
      description: 'Hot desi romance scene in stunning 4K quality.',
      orientation: 'straight',
      isNew: true,
      isExclusive: false,
      embedUrl: 'https://hornhub.embedseek.com/#9sq8g',
      isEmbed: true,
      status: 'published',
      createdBy: 'system',
      version: 1,
    },
    {
      id: 'vid-002',
      title: 'Indian College Girl - Amateur HD',
      category: 'amateur',
      categoryLabel: 'Amateur',
      categories: ['amateur', 'desi'],
      tags: ['Amateur', 'HD', 'Indian', 'College'],
      models_actors: ['Kavya'],
      thumbnail: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=800&auto=format&fit=crop',
      duration: '08:32',
      quality: 'HD',
      views: '28.7K views',
      viewsCount: 28700,
      likesCount: 2100,
      rating: '95%',
      timeAgo: '5 days ago',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      performerName: 'Kavya',
      description: 'Amateur Indian college girl scene.',
      orientation: 'straight',
      isNew: false,
      isExclusive: false,
      embedUrl: 'https://hornhub.embedseek.com/#9sq8g',
      isEmbed: true,
      status: 'published',
      createdBy: 'system',
      version: 1,
    },
    {
      id: 'vid-003',
      title: 'Trending MILF Scene - Full HD',
      category: 'milf',
      categoryLabel: 'MILF',
      categories: ['milf', 'trending'],
      tags: ['MILF', 'HD', 'Trending', 'Popular'],
      models_actors: ['Sunita Rao'],
      thumbnail: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop',
      duration: '22:10',
      quality: 'HD',
      views: '91.4K views',
      viewsCount: 91400,
      likesCount: 8200,
      rating: '99%',
      timeAgo: '1 week ago',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      performerName: 'Sunita Rao',
      description: 'Most trending MILF video of the week.',
      orientation: 'straight',
      isNew: false,
      isExclusive: true,
      embedUrl: 'https://hornhub.embedseek.com/#9sq8g',
      isEmbed: true,
      status: 'published',
      createdBy: 'system',
      version: 1,
    },
    {
      id: 'vid-004',
      title: 'Asian Beauty - Exclusive 4K VR',
      category: 'asian',
      categoryLabel: 'Asian',
      categories: ['asian', 'vr', 'trending'],
      tags: ['Asian', '4K', 'VR', 'Exclusive'],
      models_actors: ['Yuki Chan'],
      thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop',
      duration: '35:00',
      quality: '4K',
      views: '120K views',
      viewsCount: 120000,
      likesCount: 14500,
      rating: '99%',
      timeAgo: '3 days ago',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      performerName: 'Yuki Chan',
      description: 'Exclusive 4K VR experience with stunning Asian beauty.',
      orientation: 'straight',
      isNew: true,
      isExclusive: true,
      embedUrl: 'https://hornhub.embedseek.com/#9sq8g',
      isEmbed: true,
      status: 'published',
      createdBy: 'system',
      version: 1,
    },
    {
      id: 'vid-005',
      title: 'Hot Lesbian Scene - Premium HD',
      category: 'lesbian',
      categoryLabel: 'Lesbian',
      categories: ['lesbian', 'trending'],
      tags: ['Lesbian', 'HD', 'Premium'],
      models_actors: ['Riya & Sneha'],
      thumbnail: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=800&auto=format&fit=crop',
      duration: '18:25',
      quality: 'HD',
      views: '67.3K views',
      viewsCount: 67300,
      likesCount: 5900,
      rating: '98%',
      timeAgo: '4 days ago',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      performerName: 'Riya & Sneha',
      description: 'Premium lesbian scene with high production quality.',
      orientation: 'lesbian',
      isNew: false,
      isExclusive: false,
      embedUrl: 'https://hornhub.embedseek.com/#9sq8g',
      isEmbed: true,
      status: 'published',
      createdBy: 'system',
      version: 1,
    },
  ];

  const vidSnap = await adminDb.collection('videos').get();
  if (vidSnap.empty) {
    const batch = adminDb.batch();
    for (const vid of videos) {
      batch.set(adminDb.collection('videos').doc(vid.id), vid);
    }
    await batch.commit();
    console.log(`✅ Seeded ${videos.length} videos`);
  } else {
    console.log(`⏭️  Videos already exist (${vidSnap.size} found) — skipping`);
  }

  // ── 3. BANNERS ─────────────────────────────────────────────
  const banners = [
    {
      id: 'banner-001',
      title: 'New Premium 4K Videos Added',
      subtitle: 'Watch in stunning 4K Ultra HD quality',
      ctaText: 'Watch Now',
      ctaLink: '/videos?quality=4K',
      imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920&auto=format&fit=crop',
      isActive: true,
      order: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'banner-002',
      title: 'Exclusive Desi Content',
      subtitle: 'Hottest Indian content updated daily',
      ctaText: 'Explore Desi',
      ctaLink: '/videos?category=desi',
      imageUrl: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=1920&auto=format&fit=crop',
      isActive: true,
      order: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const bannerSnap = await adminDb.collection('banners').get();
  if (bannerSnap.empty) {
    const batch = adminDb.batch();
    for (const b of banners) {
      batch.set(adminDb.collection('banners').doc(b.id), b);
    }
    await batch.commit();
    console.log(`✅ Seeded ${banners.length} banners`);
  } else {
    console.log(`⏭️  Banners already exist (${bannerSnap.size} found) — skipping`);
  }

  // ── 4. AD CAMPAIGNS ────────────────────────────────────────
  const ads = [
    {
      id: 'ad-001',
      name: 'Premium Membership Ad',
      type: 'banner',
      placement: 'top',
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=728&auto=format&fit=crop',
      targetUrl: 'https://example.com/premium',
      isActive: true,
      impressions: 0,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const adSnap = await adminDb.collection('ad_campaigns').get();
  if (adSnap.empty) {
    const batch = adminDb.batch();
    for (const ad of ads) {
      batch.set(adminDb.collection('ad_campaigns').doc(ad.id), ad);
    }
    await batch.commit();
    console.log(`✅ Seeded ${ads.length} ad campaigns`);
  } else {
    console.log(`⏭️  Ad campaigns already exist (${adSnap.size} found) — skipping`);
  }

  // ── 5. ADMIN USER ──────────────────────────────────────────
  const adminUser = {
    id: 'admin-001',
    email: 'admin@indianfullxx.com',
    username: 'SuperAdmin',
    role: 'SUPER_ADMIN',
    isActive: true,
    isVerified: true,
    displayName: 'Super Admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  const userSnap = await adminDb.collection('users').get();
  if (userSnap.empty) {
    await adminDb.collection('users').doc(adminUser.id).set(adminUser);
    console.log(`✅ Seeded admin user: ${adminUser.email}`);
  } else {
    console.log(`⏭️  Users already exist (${userSnap.size} found) — skipping`);
  }

  // ── 6. SAMPLE COMMENTS ─────────────────────────────────────
  const comments = [
    {
      id: 'comment-001',
      videoId: 'vid-001',
      userId: 'user-guest-1',
      username: 'Anonymous',
      text: 'Amazing video quality!',
      likesCount: 12,
      isApproved: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'comment-002',
      videoId: 'vid-001',
      userId: 'user-guest-2',
      username: 'Fan123',
      text: 'Best desi content ever!',
      likesCount: 8,
      isApproved: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const commentSnap = await adminDb.collection('comments').get();
  if (commentSnap.empty) {
    const batch = adminDb.batch();
    for (const c of comments) {
      batch.set(adminDb.collection('comments').doc(c.id), c);
    }
    await batch.commit();
    console.log(`✅ Seeded ${comments.length} comments`);
  } else {
    console.log(`⏭️  Comments already exist (${commentSnap.size} found) — skipping`);
  }

  // ── Summary ────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log('✅ FIRESTORE SEED COMPLETE!');
  console.log('════════════════════════════════════════════');
  console.log('📂 Collections created in Firestore:');
  console.log('   • categories');
  console.log('   • videos');
  console.log('   • banners');
  console.log('   • ad_campaigns');
  console.log('   • users');
  console.log('   • comments');
  console.log('\n👉 Open: https://console.firebase.google.com/project/indianfullxx/firestore');
  console.log('════════════════════════════════════════════\n');

  process.exit(0);
}

seedAll().catch((err) => {
  console.error('❌ Seeder error:', err.message || err);
  process.exit(1);
});
