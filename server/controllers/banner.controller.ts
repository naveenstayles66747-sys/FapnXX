import { Request, Response, NextFunction } from 'express';
import { bannerService } from '../services/banner.service';
import { responseUtil } from '../utils/response';

export const bannerController = {
  listBanners: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const list = await bannerService.listBanners(activeOnly);
      return responseUtil.success(res, list, 'Banners retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  createBanner: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const created = await bannerService.create(req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, created, 'Banner created.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  updateBanner: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const updated = await bannerService.update(id, req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, updated, 'Banner updated.');
    } catch (err: any) {
      next(err);
    }
  },

  deleteBanner: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const deleted = await bannerService.delete(id, actorId, actorEmail, actorRole);
      if (!deleted) {
        return responseUtil.error(res, 'NOT_FOUND', 'Banner not found.', 404);
      }
      return responseUtil.success(res, { id }, 'Banner deleted.');
    } catch (err: any) {
      next(err);
    }
  },
};
