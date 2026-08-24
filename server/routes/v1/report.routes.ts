import { Router } from 'express';
import { z } from 'zod';
import { reportController } from '../../controllers/report.controller';
import { authenticateToken, optionalAuth } from '../../middleware/auth.middleware';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware';
import { reportLimiter } from '../../middleware/rateLimit';
import { validateBody } from '../../middleware/validate';
import { Permission, ReportStatus, Role } from '../../config/constants';

const router = Router();

const createReportSchema = z.object({
  videoId: z.string().min(1),
  videoTitle: z.string().min(1),
  reporterName: z.string().max(100).optional(),
  reporterEmail: z.string().email().optional().or(z.literal('')),
  reason: z.enum(['copyright_dmca', 'inappropriate_content', 'spam_misleading', 'privacy_violation', 'other']),
  details: z.string().min(1, 'Details required').max(3000),
  // Public users CANNOT set status or resolution fields
  status: z.never().optional(),
  resolvedAt: z.never().optional(),
  resolvedBy: z.never().optional(),
  resolutionNotes: z.never().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    ReportStatus.PENDING,
    ReportStatus.REVIEWED,
    ReportStatus.RESOLVED,
    ReportStatus.DISMISSED,
    ReportStatus.TAKEDOWN,
  ]),
  resolutionNotes: z.string().max(1000).optional(),
});

// 1. Public / User report submission
router.post('/', reportLimiter, optionalAuth, validateBody(createReportSchema), reportController.createReport);

// 2. Protected Staff Moderation (Moderator / Admin)
router.get('/', authenticateToken, requirePermission(Permission.REPORTS_READ), reportController.listReports);
router.patch(
  '/:id/status',
  authenticateToken,
  requirePermission(Permission.REPORTS_RESOLVE),
  validateBody(updateStatusSchema),
  reportController.updateStatus
);
router.patch(
  '/:id/resolve',
  authenticateToken,
  requirePermission(Permission.REPORTS_RESOLVE),
  validateBody(z.object({ resolutionNotes: z.string().max(1000).optional() })),
  (req, res, next) => {
    req.body.status = ReportStatus.RESOLVED;
    return reportController.updateStatus(req, res, next);
  }
);
router.delete(
  '/:id',
  authenticateToken,
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  reportController.deleteReport
);

export default router;
