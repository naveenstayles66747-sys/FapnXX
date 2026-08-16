import { Router } from 'express';
import { z } from 'zod';
import { videoController } from '../../controllers/video.controller';
import { optionalAuth, authenticateToken } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate';
import { Permission, VideoStatus } from '../../config/constants';

const router = Router();

const createVideoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  category: z.string().min(1),
  categoryLabel: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  models_actors: z.array(z.string()).optional(),
  modelsActors: z.array(z.string()).optional(),
  performers: z.array(z.string()).optional(),
  channelName: z.string().optional(),
  sourceWebsite: z.string().optional(),
  sourceWebsiteUrl: z.string().url().optional().or(z.literal('')),
  thumbnail: z.string().min(1, 'Thumbnail is required'),
  thumbnailUrl: z.string().optional(),
  duration: z.string().optional(),
  quality: z.enum(['4K', 'HD', 'UHD']).optional(),
  performerName: z.string().optional(),
  performerAvatar: z.string().optional(),
  description: z.string().max(3000).optional(),
  orientation: z.string().optional(),
  isExclusive: z.boolean().optional(),
  embedUrl: z.string().optional(),
  previewMp4Url: z.string().optional(),
  previewWebpUrl: z.string().optional(),
  vttUrl: z.string().optional(),
  spriteUrl: z.string().optional(),
  vastAdTagUrl: z.string().optional(),
  status: z.nativeEnum(VideoStatus).optional(),
});

const updateVideoSchema = createVideoSchema.partial();

const toggleLikeSchema = z.object({
  isLike: z.boolean().optional(),
});

// Public / Hybrid endpoints (with optional auth so admin sees unpublished videos)
router.get('/extract-metadata', videoController.extractMetadata);
router.get('/', optionalAuth, videoController.listVideos);
router.get('/:id', optionalAuth, videoController.getVideoById);
router.post('/:id/views', videoController.incrementViews);
router.post('/:id/likes', validateBody(toggleLikeSchema), videoController.toggleLikes);

// Privileged endpoints
router.post('/', optionalAuth, validateBody(createVideoSchema), videoController.createVideo);
router.put('/:id', authenticateToken, requirePermission(Permission.VIDEOS_UPDATE), validateBody(updateVideoSchema), videoController.updateVideo);
router.delete('/:id', authenticateToken, requirePermission(Permission.VIDEOS_DELETE), videoController.deleteVideo);

export default router;
