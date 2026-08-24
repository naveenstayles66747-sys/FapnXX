import { Router } from 'express';
import { z } from 'zod';
import { commentController } from '../../controllers/comment.controller';
import { optionalAuth, authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { commentLimiter } from '../../middleware/rateLimit';
import { validateBody } from '../../middleware/validate';
import { Role } from '../../config/constants';

const router = Router();

const createCommentSchema = z.object({
  videoId: z.string().min(1),
  text: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
  userName: z.string().max(100).optional(),
  userAvatar: z.string().optional(),
  // Client cannot pass arbitrary moderation fields
  status: z.never().optional(),
  isModerated: z.never().optional(),
  moderatedBy: z.never().optional(),
  moderatedAt: z.never().optional(),
});

const moderateCommentSchema = z.object({
  status: z.enum(['approved', 'rejected', 'removed']),
  reason: z.string().max(500).optional(),
});

// Public / User routes
router.get('/video/:videoId', optionalAuth, commentController.listByVideo);
router.post('/', commentLimiter, optionalAuth, validateBody(createCommentSchema), commentController.createComment);
router.post('/:id/like', commentController.likeComment);
router.delete('/:id', optionalAuth, commentController.deleteComment);

// Protected Staff Moderation routes
router.get(
  '/moderation',
  authenticateToken,
  requireRole(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN),
  commentController.listForModeration
);
router.patch(
  '/:id/moderate',
  authenticateToken,
  requireRole(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN),
  validateBody(moderateCommentSchema),
  commentController.moderateComment
);

export default router;
