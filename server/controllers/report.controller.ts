import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { responseUtil } from '../utils/response';
import { ReportStatus } from '../config/constants';

export const reportController = {
  listReports: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as ReportStatus;
      const list = reportService.listReports({ status });
      return responseUtil.success(res, list, 'Reports retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  createReport: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId, videoTitle, reporterName, reporterEmail, reason, details } = req.body;
      const report = await reportService.create({
        videoId,
        videoTitle,
        reporterName,
        reporterEmail: reporterEmail || req.user?.email,
        reason,
        details,
        clientIp: req.ip,
      });
      return responseUtil.success(res, report, 'Report submitted for review.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  updateStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const updated = await reportService.updateStatus(id, status as ReportStatus, actorId, actorEmail, actorRole);
      return responseUtil.success(res, updated, `Report marked as ${status}.`);
    } catch (err: any) {
      next(err);
    }
  },
};
