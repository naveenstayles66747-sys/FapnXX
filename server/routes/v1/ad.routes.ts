import { Router } from 'express';
import { z } from 'zod';
import { adController } from '../../controllers/ad.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate';
import { Permission } from '../../config/constants';

const router = Router();

const adSchema = z.object({
  id: z.string().optional(),
  brandName: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  bannerImage: z.string().min(1),
  targetUrl: z.string().min(1),
  cpmRate: z.string().optional().default('$12.00'),
  isActive: z.boolean().default(true),
  position: z.enum(['banner_top', 'card_inline', 'pre_roll']),
});

// Public
router.get('/', adController.listAds);
router.post('/:id/impression', adController.recordImpression);
router.post('/:id/click', adController.recordClick);

// Protected Admin
router.post('/', authenticateToken, requirePermission(Permission.ADS_CREATE), validateBody(adSchema), adController.createAd);
router.put('/:id', authenticateToken, requirePermission(Permission.ADS_UPDATE), validateBody(adSchema.partial()), adController.updateAd);
router.delete('/:id', authenticateToken, requirePermission(Permission.ADS_DELETE), adController.deleteAd);

export default router;
