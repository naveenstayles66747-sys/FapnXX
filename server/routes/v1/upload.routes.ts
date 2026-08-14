import { Router } from 'express';
import { z } from 'zod';
import { uploadController } from '../../controllers/upload.controller';
import { optionalAuth } from '../../middleware/auth.middleware';
import { uploadLimiter } from '../../middleware/rateLimit';
import { validateBody } from '../../middleware/validate';

const router = Router();

const validateUploadSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().positive(),
  uploadType: z.enum(['video', 'preview', 'banner', 'avatar']).default('video'),
});

router.post('/validate', uploadLimiter, optionalAuth, validateBody(validateUploadSchema), uploadController.validateUpload);

export default router;
