import { Router } from 'express';
import { z } from 'zod';
import { userController } from '../../controllers/user.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate';
import { Permission, Role } from '../../config/constants';

const router = Router();

const updateRoleSchema = z.object({
  role: z.enum([Role.USER, Role.MODERATOR, Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN]),
});

const setStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

router.use(authenticateToken);

router.get('/', requirePermission(Permission.USERS_READ), userController.listUsers);
router.patch('/:id/role', requireRole(Role.ADMIN, Role.SUPER_ADMIN), validateBody(updateRoleSchema), userController.updateRole);
router.patch('/:id/status', requirePermission(Permission.USERS_SUSPEND), validateBody(setStatusSchema), userController.setStatus);

export default router;
