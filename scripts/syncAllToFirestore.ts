import { adminDb } from "../server/firebase-admin";
import { CATEGORIES } from "../src/data";
import curatedVideos from "../src/data/pornhubCurated.json";

async function syncAll() {
  console.log("?? Starting Complete Firestore Cloud Database Sync...");

  try {
    // 1. Sync Categories
    console.log(`?? 1. Syncing ${CATEGORIES.length} Categories to Firestore...`);
    const catBatch = adminDb.batch();
    for (const cat of CATEGORIES) {
      const ref = adminDb.collection("categories").doc(cat.id);
      catBatch.set(ref, {
        ...cat,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await catBatch.commit();
    console.log(`? [Categories] All ${CATEGORIES.length} categories successfully synced to Firestore!`);

    // 2. Sync All 466 Curated Videos
    console.log(`?? 2. Uploading ${curatedVideos.length} Curated Videos to Firestore 'videos' collection...`);
    const BATCH_SIZE = 250;
    for (let i = 0; i < curatedVideos.length; i += BATCH_SIZE) {
      const chunk = curatedVideos.slice(i, i + BATCH_SIZE);
      const videoBatch = adminDb.batch();
      for (const video of chunk) {
        const cleanDoc: any = {};
        for (const [k, v] of Object.entries(video)) {
          if (v !== undefined) {
            cleanDoc[k] = v;
          }
        }
        const ref = adminDb.collection("videos").doc(video.id);
        videoBatch.set(ref, cleanDoc, { merge: true });
      }
      await videoBatch.commit();
      console.log(`  ? Uploaded batch ${i + 1} to ${Math.min(i + BATCH_SIZE, curatedVideos.length)} of ${curatedVideos.length} videos...`);
    }

    console.log(`?? [Videos] All ${curatedVideos.length} HD videos successfully committed to Firestore Cloud Database!`);

    // 3. Verify counts in Firestore
    const vidSnap = await adminDb.collection("videos").get();
    console.log(`?? [Verification] Total active videos in Firestore: ${vidSnap.size}`);

    process.exit(0);
  } catch (err: any) {
    console.error("? Sync Error:", err?.message || err);
    process.exit(1);
  }
}

syncAll();
