import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { responseUtil } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const isCorsError = typeof err.message === 'string' && err.message.includes('CORS');
  const status = isCorsError ? 403 : (err.status || err.statusCode || 500);
  const code = isCorsError ? 'CORS_FORBIDDEN' : (err.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR'));
  const message = isCorsError ? err.message : (status === 500 ? 'An unexpected internal error occurred. Please try again later.' : err.message || 'Error processing request.');

  logger.error(`Unhandled error: ${err.message || err}`, {
    route: `${req.method} ${req.originalUrl}`,
    userId: req.user?.userId,
    status,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  return responseUtil.error(res, code, message, status);
};
