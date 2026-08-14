import { Router } from 'express';
import { z } from 'zod';
import { categoryController } from '../../controllers/category.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { validateBody } from '../../middleware/validate';
import { Permission } from '../../config/constants';

const router = Router();

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  icon: z.string().min(1),
  heroImage: z.string().min(1),
  description: z.string().max(1000).optional().default(''),
});

const categoryRequestSchema = z.object({
  categoryName: z.string().min(1).max(100),
  videoTitle: z.string().optional(),
  requestedByEmail: z.string().email().optional().or(z.literal('')).nullish(),
});

const updateRequestStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

// Public
router.get('/', categoryController.listCategories);
router.post('/requests', validateBody(categoryRequestSchema), categoryController.requestCategory);

// Protected Admin
router.post('/', authenticateToken, requirePermission(Permission.CATEGORIES_CREATE), validateBody(categorySchema), categoryController.createCategory);
router.put('/:id', authenticateToken, requirePermission(Permission.CATEGORIES_UPDATE), validateBody(categorySchema.partial()), categoryController.updateCategory);
router.delete('/:id', authenticateToken, requirePermission(Permission.CATEGORIES_DELETE), categoryController.deleteCategory);

router.get('/admin/requests', authenticateToken, requirePermission(Permission.CATEGORIES_READ), categoryController.listCategoryRequests);
router.patch('/admin/requests/:id', authenticateToken, requirePermission(Permission.CATEGORIES_UPDATE), validateBody(updateRequestStatusSchema), categoryController.updateCategoryRequestStatus);

export default router;
