import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'fapnxx_super_secure_jwt_secret_key_2026_x!99',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fapnxx_super_secure_refresh_key_2026_r#88',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000',
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || 'naveenstayles66747@gmail.com',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || 'Naveen@Admin2026!',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  // Firebase client / Admin SDK variables
  FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || 'indianfullxx',
  FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'indianfullxx.firebasestorage.app',
};
