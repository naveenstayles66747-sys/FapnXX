import { Router } from 'express';
import { z } from 'zod';
import { commentController } from '../../controllers/comment.controller';
import { optionalAuth } from '../../middleware/auth.middleware';
import { commentLimiter } from '../../middleware/rateLimit';
import { validateBody } from '../../middleware/validate';

const router = Router();

const createCommentSchema = z.object({
  videoId: z.string().min(1),
  text: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
  userName: z.string().max(100).optional(),
  userAvatar: z.string().optional(),
});

router.get('/video/:videoId', commentController.listByVideo);
router.post('/', commentLimiter, optionalAuth, validateBody(createCommentSchema), commentController.createComment);
router.post('/:id/like', commentController.likeComment);
router.delete('/:id', optionalAuth, commentController.deleteComment);

export default router;
