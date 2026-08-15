import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';

const serviceAccountPath1 = path.resolve(process.cwd(), 'server', 'serviceAccountKey.json');
const serviceAccountPath2 = path.resolve(process.cwd(), 'serviceAccountKey.json');
const serviceAccountPath = fs.existsSync(serviceAccountPath1) ? serviceAccountPath1 : serviceAccountPath2;
let app: App;

if (getApps().length === 0) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || 'indianfullxx',
    });
    console.log('✅ [Firebase Admin] Initialized with Service Account for Project:', serviceAccount.project_id);
  } else {
    app = initializeApp({
      projectId: 'indianfullxx',
    });
    console.warn('⚠️ [Firebase Admin] Initialized with default project.');
  }
} else {
  app = getApps()[0];
}

export const adminDb: Firestore = getFirestore(app);
export const adminAuth: Auth = getAuth(app);
export const adminStorage: Storage = getStorage(app);
