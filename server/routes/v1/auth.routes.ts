import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../../controllers/auth.controller';
import { authLimiter, otpLimiter } from '../../middleware/rateLimit';
import { validateBody } from '../../middleware/validate';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const otpRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const otpVerifySchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'OTP must be exactly 6 digits'),
});

router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/admin-login', authLimiter, validateBody(loginSchema), authController.adminLogin);
router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/request-otp', otpLimiter, validateBody(otpRequestSchema), authController.requestOtp);
router.post('/verify-otp', otpLimiter, validateBody(otpVerifySchema), authController.verifyOtp);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.getMe);

export default router;
