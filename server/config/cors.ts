import { CorsOptions } from 'cors';
import { env } from './env';
import { logger } from '../utils/logger';

// Parse configured allowed origins from environment
const rawConfiguredOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(',').map((o) => o.trim().toLowerCase())
  : [];

// Standard local development origins
const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Combine allowed origins
const allowedOrigins = new Set<string>([
  ...rawConfiguredOrigins,
  ...(env.NODE_ENV !== 'production' ? devOrigins : []),
]);

/**
 * Checks if a given request origin is authorized under the CORS policy
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests without Origin header (same-origin, server-to-server, curl, mobile apps)
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.trim().toLowerCase();

  // 1. Direct match in allowed set
  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  // 2. Allow Vercel preview/production deployments (*.vercel.app)
  if (
    normalizedOrigin.endsWith('.vercel.app') &&
    (normalizedOrigin.startsWith('https://') || normalizedOrigin.startsWith('http://'))
  ) {
    return true;
  }

  // 3. Check wildcard subdomain matching for configured domains (e.g. *.domain.com)
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const rootDomain = allowed.substring(2);
      try {
        const url = new URL(normalizedOrigin);
        if (url.hostname === rootDomain || url.hostname.endsWith('.' + rootDomain)) {
          return true;
        }
      } catch {}
    }
  }

  return false;
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn(`⛔ [CORS BLOCKED] Rejected unauthorized origin: ${origin}`);
      const corsError = new Error(`CORS Error: Origin '${origin}' is not authorized.`);
      (corsError as any).status = 403;
      callback(corsError);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // Cache preflight for 24 hours
};
