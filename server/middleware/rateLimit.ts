import rateLimit from 'express-rate-limit';
import { responseUtil } from '../utils/response';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Too many login attempts. Please try again after 15 minutes.',
      429
    );
  },
});

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

export const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Comment rate limit exceeded. Please wait a few minutes.',
      429
    );
  },
});

export const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Report submission limit exceeded. Please wait a few minutes.',
      429
    );
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    return responseUtil.error(
      res,
      'TOO_MANY_REQUESTS',
      'Upload limit exceeded. Please wait before uploading more content.',
      429
    );
  },
});
