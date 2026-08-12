/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// New Firebase configuration for project: indianfullxx
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
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
