import rateLimit from 'express-rate-limit';
import { responseUtil } from '../utils/response';

/**
 * 1. Login Rate Limiter (Brute-force protection)
 * Limits: 10 attempts per 15 minutes
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Too many authentication attempts. Please wait 15 minutes before trying again.',
      429
    );
  },
});

export const authLimiter = loginLimiter;

/**
 * 2. Token Refresh Rate Limiter
 * Limits: 30 refresh requests per 15 minutes
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Token refresh rate limit exceeded. Please slow down.',
      429
    );
  },
});

/**
 * 3. Comment Creation Rate Limiter (Anti-Spam)
 * Limits: 15 comments per 10 minutes
 */
export const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Comment submission rate limit exceeded. Please wait a few minutes before commenting again.',
      429
    );
  },
});

/**
 * 4. DMCA & Abuse Report Rate Limiter
 * Limits: 10 reports per 10 minutes
 */
export const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Report submission limit exceeded. Please wait a few minutes before submitting another report.',
      429
    );
  },
});

/**
 * 5. Video Creation Rate Limiter
 * Limits: 30 video creations per 1 hour
 */
export const videoCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Video creation rate limit exceeded. Please wait before publishing more videos.',
      429
    );
  },
});

/**
 * 6. Storage Upload Validation Rate Limiter
 * Limits: 40 uploads per 1 hour
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Upload rate limit exceeded. Please wait before uploading additional media files.',
      429
    );
  },
});

/**
 * 7. Metadata URL Extraction Rate Limiter (SSRF/DoS protection)
 * Limits: 20 metadata extractions per 5 minutes
 */
export const metadataExtractionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'URL metadata extraction limit exceeded. Please wait a few minutes before submitting more links.',
      429
    );
  },
});

/**
 * 8. Admin Management APIs Rate Limiter
 * Limits: 150 requests per 15 minutes
 */
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Administrative API rate limit reached. Please reduce request frequency.',
      429
    );
  },
});

/**
 * 9. OTP Request Rate Limiter
 * Limits: 5 OTP requests per 15 minutes
 */
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Too many OTP requests. Please wait 15 minutes before requesting again.',
      429
    );
  },
});

/**
 * 10. General API Rate Limiter
 * Limits: 500 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Too many requests. Please slow down.',
      429
    );
  },
});
