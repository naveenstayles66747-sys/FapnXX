/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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

// Initialize App Check in browser environment if key is configured
if (typeof window !== 'undefined') {
  try {
    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (appCheckErr) {
    console.warn('[Firebase AppCheck] Initialization notice:', appCheckErr);
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
