import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { responseUtil } from '../utils/response';

export const authController = {
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return responseUtil.success(res, result, 'Login successful.');
    } catch (err: any) {
      next(err);
    }
  },

  adminLogin: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.adminLogin({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return responseUtil.success(res, result, 'Admin authorization granted.');
    } catch (err: any) {
      next(err);
    }
  },

  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await authService.register({ email, password });
      return responseUtil.success(res, user, 'Account created successfully. Please sign in.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  requestOtp: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const result = authService.requestOtp(email);
      if (!result.success) {
        return responseUtil.error(res, 'OTP_COOLDOWN', result.message, 429, {
          cooldownRemaining: result.cooldownRemaining,
        });
      }
      return responseUtil.success(res, null, result.message);
    } catch (err: any) {
      next(err);
    }
  },

  verifyOtp: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;
      const result = await authService.verifyOtp(email, code);
      if (!result.valid) {
        return responseUtil.error(res, 'INVALID_OTP', result.message, 400);
      }
      return responseUtil.success(res, null, result.message);
    } catch (err: any) {
      next(err);
    }
  },

  refreshToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) {
        return responseUtil.error(res, 'UNAUTHORIZED', 'Refresh token required.', 401);
      }
      const result = await authService.refreshToken(token);
      return responseUtil.success(res, result, 'Token refreshed successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
      authService.logout(token);
      res.clearCookie('refreshToken');
      return responseUtil.success(res, null, 'Logged out successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  getMe: async (req: Request, res: Response) => {
    return responseUtil.success(res, req.user, 'Current session verified.');
  },
};
