import { Router } from 'express';
import { adminController } from '../../controllers/admin.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { Permission } from '../../config/constants';

const router = Router();

router.use(authenticateToken);

router.get('/overview', requirePermission(Permission.ADMIN_OVERVIEW_READ), adminController.getOverview);
router.get('/audit-logs', requirePermission(Permission.ADMIN_AUDIT_READ), adminController.getAuditLogs);

export default router;
