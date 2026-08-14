import { adminDb } from './firebase-admin';
import { CATEGORIES, INITIAL_LANDING_BANNERS } from '../src/data';

async function testAndSync() {
  console.log('🔄 Step 1: Starting Firestore Connection...');

  try {
    console.log('🔄 Step 2: Testing category collection get()...');
    const catSnapshot = await adminDb.collection('categories').get();
    console.log(`📊 Found ${catSnapshot.size} categories in Firestore.`);

    if (catSnapshot.empty) {
      console.log('🌱 Seeding default categories into Firestore...');
      const batch = adminDb.batch();
      for (const cat of CATEGORIES) {
        const ref = adminDb.collection('categories').doc(cat.id);
        batch.set(ref, {
          ...cat,
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      console.log(`✅ Successfully seeded ${CATEGORIES.length} categories!`);
    }

    console.log('🔄 Step 3: Testing banners collection get()...');
    const bannerSnapshot = await adminDb.collection('banners').get();
    console.log(`📊 Found ${bannerSnapshot.size} banners in Firestore.`);

    if (bannerSnapshot.empty && INITIAL_LANDING_BANNERS && INITIAL_LANDING_BANNERS.length > 0) {
      console.log('🌱 Seeding landing banners into Firestore...');
      const batch = adminDb.batch();
      for (const b of INITIAL_LANDING_BANNERS) {
        const ref = adminDb.collection('banners').doc(b.id);
        batch.set(ref, {
          ...b,
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      console.log(`✅ Successfully seeded ${INITIAL_LANDING_BANNERS.length} banners!`);
    }

    console.log('\n🎉 Firebase Firestore Connected & Ready!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Firebase error:', err.message || err);
    process.exit(1);
  }
}

testAndSync();
