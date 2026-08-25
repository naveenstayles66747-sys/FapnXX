import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../firebase-admin';
import { tokenUtil, TokenPayload } from '../utils/token';
import { responseUtil } from '../utils/response';
import { Role, ROLE_PERMISSIONS } from '../config/constants';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      requestId?: string;
    }
  }
}

/**
 * Extracts and maps Firebase token payload or legacy JWT to standard TokenPayload
 */
const resolveTokenPayload = async (token: string): Promise<TokenPayload | null> => {
  // 1. Primary: Verify as Firebase ID Token
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    let role: Role = Role.USER;
    if (decoded.role === 'SUPER_ADMIN') {
      role = Role.SUPER_ADMIN;
    } else if (decoded.role === 'ADMIN' || decoded.admin === true) {
      role = Role.ADMIN;
    } else if (decoded.role === 'MODERATOR' || decoded.moderator === true) {
      role = Role.MODERATOR;
    } else if (decoded.role === 'EDITOR') {
      role = Role.EDITOR;
    }

    return {
      userId: decoded.uid,
      email: decoded.email || '',
      role,
      permissions: ROLE_PERMISSIONS[role] || [],
    };
  } catch (_) {
    // 2. Secondary fallback for transition/internal tokens
    return tokenUtil.verifyAccessToken(token);
  }
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.accessToken;

  if (!token) {
    return responseUtil.error(res, 'UNAUTHORIZED', 'Authentication token required.', 401);
  }

  const payload = await resolveTokenPayload(token);
  if (!payload) {
    return responseUtil.error(res, 'INVALID_TOKEN', 'Session expired or token is invalid. Please sign in again with Firebase.', 401);
  }

  req.user = payload;
  next();
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.accessToken;

  if (token) {
    const payload = await resolveTokenPayload(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
};
