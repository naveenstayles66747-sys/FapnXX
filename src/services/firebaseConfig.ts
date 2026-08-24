/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck, getToken } from 'firebase/app-check';

// Firebase configuration for project: indianfullxx
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAtpBRAM63FCgK6poFeM2mN27Bgh85dRzk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "indianfullxx.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "indianfullxx",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "indianfullxx.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "924693101684",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:924693101684:web:9de01f74a13d2bc71da521",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9S20NK62DJ"
};

// Initialize Firebase instance safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize App Check
export let appCheck: AppCheck | null = null;

if (typeof window !== 'undefined') {
  try {
    // Support App Check Debug token in development environment
    if (import.meta.env.DEV || import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
    }

    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
    if (recaptchaSiteKey) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('🛡️ [Firebase AppCheck] Initialized successfully with ReCaptchaV3Provider');
    }
  } catch (appCheckErr: any) {
    console.warn('[Firebase AppCheck] Initialization notice:', appCheckErr?.message || appCheckErr);
  }
}

/**
 * Retrieve active App Check token to attach to backend API requests
 */
export async function getAppCheckToken(): Promise<string | null> {
  try {
    if (!appCheck) return null;
    const tokenResult = await getToken(appCheck, false);
    return tokenResult.token;
  } catch {
    return null;
  }
}

// Initialize Firestore with ignoreUndefinedProperties enabled
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  });
} catch {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const storage = getStorage(app);
export const auth = getAuth(app);

/**
 * Utility helper to safely clean any undefined properties before writing to Firestore
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

export default app;
