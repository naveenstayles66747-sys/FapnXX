import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const requiredSecrets = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SUPER_ADMIN_EMAIL',
  'SUPER_ADMIN_PASSWORD',
] as const;

const missingSecrets: string[] = [];

for (const secretKey of requiredSecrets) {
  const value = process.env[secretKey];
  if (!value || value.trim() === '') {
    missingSecrets.push(secretKey);
  }
}

if (missingSecrets.length > 0) {
  console.error('\n========================================================================');
  console.error('❌ [FATAL CONFIGURATION ERROR] SERVER STARTUP ABORTED');
  console.error('========================================================================');
  console.error('The following mandatory production secrets are MISSING from process.env:');
  missingSecrets.forEach((s) => console.error(`  - ${s}`));
  console.error('\nTo prevent accidental insecure execution with weak/default credentials,');
  console.error('the server strictly requires these environment variables to be explicitly defined.');
  console.error('Please configure them in your .env file or production host (e.g. Vercel).');
  console.error('========================================================================\n');
  throw new Error(`Fatal Security Exception: Missing mandatory secrets [${missingSecrets.join(', ')}]. Server startup aborted.`);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000',
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL!,
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD!,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  // Firebase client / Admin SDK variables
  FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || 'indianfullxx',
  FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'indianfullxx.firebasestorage.app',
} as const;
