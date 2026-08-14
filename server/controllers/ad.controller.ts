import { Request, Response, NextFunction } from 'express';
import { adService } from '../services/ad.service';
import { responseUtil } from '../utils/response';

export const adController = {
  listAds: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const list = adService.listAds(activeOnly);
      return responseUtil.success(res, list, 'Ad campaigns retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  createAd: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const created = await adService.create(req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, created, 'Ad campaign created.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  updateAd: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const updated = await adService.update(id, req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, updated, 'Ad campaign updated.');
    } catch (err: any) {
      next(err);
    }
  },

  deleteAd: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const deleted = await adService.delete(id, actorId, actorEmail, actorRole);
      if (!deleted) {
        return responseUtil.error(res, 'NOT_FOUND', 'Ad campaign not found.', 404);
      }
      return responseUtil.success(res, { id }, 'Ad campaign deleted.');
    } catch (err: any) {
      next(err);
    }
  },

  recordImpression: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      adService.recordImpression(id);
      return responseUtil.success(res, null, 'Impression recorded.');
    } catch (err: any) {
      next(err);
    }
  },

  recordClick: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      adService.recordClick(id);
      return responseUtil.success(res, null, 'Click recorded.');
    } catch (err: any) {
      next(err);
    }
  },
};
