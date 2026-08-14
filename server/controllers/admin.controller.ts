import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/audit.service';
import { videoServiceBackend } from '../services/video.service';
import { userService } from '../services/user.service';
import { reportService } from '../services/report.service';
import { categoryService } from '../services/category.service';
import { responseUtil } from '../utils/response';

export const adminController = {
  getOverview: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const videos = videoServiceBackend.listVideos({ includeUnpublished: true });
      const users = userService.listUsers();
      const reports = reportService.listReports();
      const categories = categoryService.listCategories();
      const audit = auditService.getLogs({ limit: 1 });

      const totalViews = videos.videos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
      const pendingReports = reports.filter((r) => r.status === 'pending').length;

      return responseUtil.success(
        res,
        {
          stats: {
            totalVideos: videos.total,
            totalUsers: users.total,
            totalViews,
            totalCategories: categories.length,
            pendingReports,
            totalAuditLogs: audit.total,
          },
          system: {
            status: 'operational',
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
          },
        },
        'Admin overview loaded.'
      );
    } catch (err: any) {
      next(err);
    }
  },

  getAuditLogs: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 30;
      const action = req.query.action as string;
      const actorEmail = req.query.actorEmail as string;
      const targetType = req.query.targetType as string;

      const result = auditService.getLogs({ page, limit, action, actorEmail, targetType });
      return responseUtil.success(res, result, 'Audit logs retrieved.');
    } catch (err: any) {
      next(err);
    }
  },
};
