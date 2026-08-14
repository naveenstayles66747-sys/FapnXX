import { Router } from 'express';
import { z } from 'zod';
import { reportController } from '../../controllers/report.controller';
import { authenticateToken, optionalAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { reportLimiter } from '../../middleware/rateLimit';
import { validateBody } from '../../middleware/validate';
import { Permission, ReportStatus } from '../../config/constants';

const router = Router();

const createReportSchema = z.object({
  videoId: z.string().min(1),
  videoTitle: z.string().min(1),
  reporterName: z.string().max(100).optional(),
  reporterEmail: z.string().email().optional().or(z.literal('')),
  reason: z.enum(['copyright_dmca', 'inappropriate_content', 'spam_misleading', 'privacy_violation', 'other']),
  details: z.string().min(1, 'Details required').max(3000),
});

const updateStatusSchema = z.object({
  status: z.enum([ReportStatus.PENDING, ReportStatus.REVIEWED, ReportStatus.RESOLVED, ReportStatus.DISMISSED, ReportStatus.TAKEDOWN]),
});

// Public / User report submission
router.post('/', reportLimiter, optionalAuth, validateBody(createReportSchema), reportController.createReport);

// Protected Staff Moderation
router.get('/', authenticateToken, requirePermission(Permission.REPORTS_READ), reportController.listReports);
router.patch('/:id/status', authenticateToken, requirePermission(Permission.REPORTS_RESOLVE), validateBody(updateStatusSchema), reportController.updateStatus);

export default router;
