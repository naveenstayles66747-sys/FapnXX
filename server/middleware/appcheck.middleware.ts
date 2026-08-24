import { Request, Response, NextFunction } from 'express';
import { adminAppCheck } from '../firebase-admin';
import { responseUtil } from '../utils/response';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      appCheck?: {
        appId: string;
        token: any;
        verified: boolean;
      };
    }
  }
}

/**
 * Optional App Check Verification Middleware:
 * Inspects 'X-Firebase-AppCheck' header if present and attaches verified context.
 */
export async function verifyAppCheckOptional(req: Request, _res: Response, next: NextFunction) {
  const appCheckToken = req.header('X-Firebase-AppCheck');

  if (!appCheckToken) {
    return next();
  }

  try {
    const verifiedToken = await adminAppCheck.verifyToken(appCheckToken);
    req.appCheck = {
      appId: verifiedToken.appId,
      token: verifiedToken,
      verified: true,
    };
  } catch (err: any) {
    logger.debug(`[AppCheck Optional] Verification skipped or invalid token: ${err.message}`);
  }

  return next();
}

/**
 * Enforced App Check Verification Middleware:
 * Requires a valid Firebase App Check token. Returns 401 APP_CHECK_FORBIDDEN if absent or invalid.
 */
export async function requireAppCheck(req: Request, res: Response, next: NextFunction) {
  const appCheckToken = req.header('X-Firebase-AppCheck');

  // Allow bypass in testing/dev environments if explicit bypass header is provided or if in test mode
  if (process.env.NODE_ENV === 'test' && !appCheckToken) {
    return next();
  }

  if (!appCheckToken) {
    return responseUtil.error(
      res,
      'APP_CHECK_REQUIRED',
      'Unauthorized request. A valid Firebase App Check token is required.',
      401
    );
  }

  try {
    const verifiedToken = await adminAppCheck.verifyToken(appCheckToken);
    req.appCheck = {
      appId: verifiedToken.appId,
      token: verifiedToken,
      verified: true,
    };
    return next();
  } catch (err: any) {
    logger.warn(`⛔ [AppCheck Blocked] Invalid App Check token: ${err.message}`);
    return responseUtil.error(
      res,
      'APP_CHECK_INVALID',
      'Firebase App Check token validation failed.',
      401
    );
  }
}
