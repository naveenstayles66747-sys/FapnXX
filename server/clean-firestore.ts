import { adminDb } from './firebase-admin.js';

async function purgeAllFakeCollections() {
  console.log('🧹 [Purge] Starting complete wipe of demo/fake seeded collections in Firestore...');

  const collectionsToClean = [
    'ad_campaigns',
    'banners',
    'comments',
    'reports',
  ];

  for (const colName of collectionsToClean) {
    const snap = await adminDb.collection(colName).get();
    if (!snap.empty) {
      const batch = adminDb.batch();
      snap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`🗑️ Deleted all ${snap.size} documents from collection: ${colName}`);
    } else {
      console.log(`✨ Collection ${colName} is already empty`);
    }
  }

  // Also clean demo videos (vid-001, vid-002, etc.) but keep any user uploads (vid-user-...)
  const vidSnap = await adminDb.collection('videos').get();
  if (!vidSnap.empty) {
    const batch = adminDb.batch();
    let deletedCount = 0;
    vidSnap.forEach((doc) => {
      const id = doc.id;
      // Delete seeded dummy videos
      if (id.startsWith('vid-00') || id.startsWith('video-') || id === 'vid-test-user-1') {
        batch.delete(doc.ref);
        deletedCount++;
      } else {
        // If user upload, ensure clean views and likes
        batch.update(doc.ref, {
          viewsCount: doc.data().viewsCount || 1,
          likesCount: doc.data().likesCount || 0,
        });
      }
    });
    if (deletedCount > 0) {
      await batch.commit();
      console.log(`🗑️ Deleted ${deletedCount} demo seed videos from 'videos' collection`);
    }
  }

  console.log('🎉 [Purge Complete] Firestore has been completely cleared of demo data!');
  process.exit(0);
}

purgeAllFakeCollections().catch((err) => {
  console.error('❌ Purge error:', err);
  process.exit(1);
});
