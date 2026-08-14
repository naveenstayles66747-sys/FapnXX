import { Request, Response, NextFunction } from 'express';
import { tokenUtil, TokenPayload } from '../utils/token';
import { responseUtil } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      requestId?: string;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.accessToken;

  if (!token) {
    return responseUtil.error(res, 'UNAUTHORIZED', 'Authentication token required.', 401);
  }

  const payload = tokenUtil.verifyAccessToken(token);
  if (!payload) {
    return responseUtil.error(res, 'INVALID_TOKEN', 'Session expired or token is invalid. Please sign in again.', 401);
  }

  req.user = payload;
  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.accessToken;

  if (token) {
    const payload = tokenUtil.verifyAccessToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
};
