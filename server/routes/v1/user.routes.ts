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

const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().optional(),
  savedVideoIds: z.array(z.string()).max(500).optional(),
  likedVideoIds: z.array(z.string()).max(500).optional(),
  followingPerformerIds: z.array(z.string()).max(500).optional(),
  // Disallowed privileged fields
  role: z.never().optional(),
  permissions: z.never().optional(),
  status: z.never().optional(),
  banStatus: z.never().optional(),
  bannedAt: z.never().optional(),
  isBanned: z.never().optional(),
  isAdmin: z.never().optional(),
  admin: z.never().optional(),
  isModerator: z.never().optional(),
  moderator: z.never().optional(),
});

router.use(authenticateToken);

router.get('/', requirePermission(Permission.USERS_READ), userController.listUsers);
router.patch('/profile', validateBody(updateProfileSchema), userController.updateProfile);
router.patch('/:id/profile', validateBody(updateProfileSchema), userController.updateProfile);
router.patch('/:id/role', requireRole(Role.ADMIN, Role.SUPER_ADMIN), validateBody(updateRoleSchema), userController.updateRole);
router.patch('/:id/status', requirePermission(Permission.USERS_SUSPEND), validateBody(setStatusSchema), userController.setStatus);

export default router;
