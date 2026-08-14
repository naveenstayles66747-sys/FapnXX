import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { responseUtil } from '../utils/response';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = (err as any).errors || (err as any).issues || [];
        return responseUtil.error(
          res,
          'VALIDATION_ERROR',
          'Invalid input payload.',
          422,
          details
        );
      }
      return responseUtil.error(res, 'VALIDATION_ERROR', 'Input validation failed.', 422);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = (err as any).errors || (err as any).issues || [];
        return responseUtil.error(
          res,
          'QUERY_VALIDATION_ERROR',
          'Invalid query parameters.',
          422,
          details
        );
      }
      return responseUtil.error(res, 'QUERY_VALIDATION_ERROR', 'Query validation failed.', 422);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = (err as any).errors || (err as any).issues || [];
        return responseUtil.error(
          res,
          'PARAM_VALIDATION_ERROR',
          'Invalid route parameters.',
          422,
          details
        );
      }
      return responseUtil.error(res, 'PARAM_VALIDATION_ERROR', 'Parameter validation failed.', 422);
    }
  };
};
