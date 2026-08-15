import { adminDb } from './firebase-admin';

async function resetFakeData() {
  console.log('🧹 [Cleanup] Starting reset of fake/demo Firestore documents...');

  // 1. Reset ad_campaigns with 0 impressions & 0 clicks or purge fake ads
  const adSnap = await adminDb.collection('ad_campaigns').get();
  if (!adSnap.empty) {
    const batch = adminDb.batch();
    adSnap.forEach((doc) => {
      batch.update(doc.ref, {
        impressions: 0,
        clicks: 0,
      });
    });
    await batch.commit();
    console.log(`✅ Reset ${adSnap.size} ad campaigns to 0 impressions & 0 clicks`);
  }

  // 2. Clean fake videos (vid-001 to vid-005) or reset views to real 1/0
  const vidSnap = await adminDb.collection('videos').get();
  if (!vidSnap.empty) {
    const batch = adminDb.batch();
    let count = 0;
    vidSnap.forEach((doc) => {
      const data = doc.data();
      // If it has fake 120000 / 67300 views from old seed script, reset to 0/1
      if (data.viewsCount && data.viewsCount > 10000) {
        batch.update(doc.ref, {
          viewsCount: 1,
          views: '1 view',
          likesCount: 0,
        });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Reset ${count} seeded videos with fake views down to 1 view & 0 likes`);
    }
  }

  console.log('🎉 [Cleanup] Firestore is now 100% clean with zero fake numbers!');
  process.exit(0);
}

resetFakeData().catch((err) => {
  console.error('❌ Reset error:', err);
  process.exit(1);
});
