import { Request, Response, NextFunction } from "express";
import { pornhubService } from "../services/pornhub.service";
import { responseUtil } from "../utils/response";

export const pornhubController = {
  getStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = pornhubService.getDbStatus();
      return responseUtil.success(res, status, "Pornhub Webmaster DB status verified.");
    } catch (err: any) {
      next(err);
    }
  },

  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string;
      const minViews = req.query.minViews ? parseInt(req.query.minViews as string, 10) : 50000;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const searchQuery = req.query.q as string;
      const atsCode = req.query.atsCode as string;

      const result = await pornhubService.queryVideos({
        category,
        minViews,
        limit,
        searchQuery,
        atsCode,
        autoPublish: false,
      });

      return responseUtil.success(res, result, "Pornhub DB queried successfully.");
    } catch (err: any) {
      next(err);
    }
  },

  importBatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, minViews, limit, searchQuery, atsCode } = req.body;

      const result = await pornhubService.queryVideos({
        category,
        minViews: minViews !== undefined ? parseInt(minViews, 10) : 100000,
        limit: limit !== undefined ? parseInt(limit, 10) : 25,
        searchQuery,
        atsCode,
        autoPublish: true,
      });

      return responseUtil.success(res, result, `Imported and published ${result.count} videos to Firestore successfully!`);
    } catch (err: any) {
      next(err);
    }
  },
};
