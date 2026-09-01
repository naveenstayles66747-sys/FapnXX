import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getAppCheck, AppCheck } from 'firebase-admin/app-check';
import path from 'path';
import fs from 'fs';

const resolveServiceAccountCredentials = (): any | null => {
  // 1. Check FIREBASE_SERVICE_ACCOUNT_KEY env var (Supports raw JSON or base64 encoded string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    try {
      if (raw.startsWith('{')) {
        return JSON.parse(raw);
      } else {
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        return JSON.parse(decoded);
      }
    } catch (err: any) {
      console.error('❌ [Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env variable:', err?.message);
    }
  }

  // 2. Check granular environment variables (Standard for Vercel / Railway / Heroku / AWS)
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID || 'indianfullxx';

  if (clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    };
  }

  // 3. Check GOOGLE_APPLICATION_CREDENTIALS file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      return JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    } catch (err: any) {
      console.warn('⚠️ [Firebase Admin] Failed to read GOOGLE_APPLICATION_CREDENTIALS:', err?.message);
    }
  }

  // 4. Check local serviceAccountKey.json files
  const searchPaths = [
    path.resolve(process.cwd(), 'server', 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), '..', 'serviceAccountKey.json'),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (content && content.project_id && content.private_key) {
          return content;
        }
      } catch (err: any) {
        console.warn(`⚠️ [Firebase Admin] Found ${p} but failed to parse:`, err?.message);
      }
    }
  }

  return null;
};

let app: App;

if (getApps().length === 0) {
  const credentials = resolveServiceAccountCredentials();
  if (credentials) {
    app = initializeApp({
      credential: cert(credentials),
      projectId: credentials.project_id || 'indianfullxx',
    });
    console.log(`✅ [Firebase Admin SDK] Successfully initialized with verified service account credentials for project: [${credentials.project_id || 'indianfullxx'}] (${credentials.client_email || 'Service Account'})`);
  } else {
    app = initializeApp({
      projectId: 'indianfullxx',
    });
    console.warn('⚠️ [Firebase Admin SDK] Initialized in application-default mode without explicit service account key. For production admin operations, ensure FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY environment variables are configured.');
  }
} else {
  app = getApps()[0];
}

export const adminDb: Firestore = getFirestore(app);
adminDb.settings({ ignoreUndefinedProperties: true });
export const adminAuth: Auth = getAuth(app);
export const adminStorage: Storage = getStorage(app);
export const adminAppCheck: AppCheck = getAppCheck(app);
