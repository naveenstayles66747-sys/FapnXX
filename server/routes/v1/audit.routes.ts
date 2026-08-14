import { Router } from 'express';
import { adminController } from '../../controllers/admin.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { Permission } from '../../config/constants';

const router = Router();

router.use(authenticateToken);
router.get('/', requirePermission(Permission.ADMIN_AUDIT_READ), adminController.getAuditLogs);

export default router;
