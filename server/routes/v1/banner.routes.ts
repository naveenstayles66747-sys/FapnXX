import { Router } from 'express';
import { z } from 'zod';
import { bannerController } from '../../controllers/banner.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate';
import { Permission } from '../../config/constants';

const router = Router();

const bannerSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional().default(''),
  bannerImage: z.string().min(1),
  tag: z.string().max(50).optional().default('Featured'),
  targetCategory: z.string().optional(),
  targetVideoId: z.string().optional(),
  ctaText: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

// Public
router.get('/', bannerController.listBanners);

// Protected Admin
router.post('/', authenticateToken, requirePermission(Permission.BANNERS_CREATE), validateBody(bannerSchema), bannerController.createBanner);
router.put('/:id', authenticateToken, requirePermission(Permission.BANNERS_UPDATE), validateBody(bannerSchema.partial()), bannerController.updateBanner);
router.delete('/:id', authenticateToken, requirePermission(Permission.BANNERS_DELETE), bannerController.deleteBanner);

export default router;
