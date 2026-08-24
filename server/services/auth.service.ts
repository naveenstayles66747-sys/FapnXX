import { Role, ROLE_PERMISSIONS } from '../config/constants';
import { passwordUtil } from '../utils/password';
import { tokenUtil, TokenPayload } from '../utils/token';
import { otpUtil } from '../utils/otp';
import { userService, sanitizeUser, User } from './user.service';
import { auditService } from './audit.service';
import { adminAuth } from '../firebase-admin';

export const authService = {
  login: async (params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: Omit<User, 'passwordHash'>; accessToken: string; refreshToken: string; firebaseCustomToken?: string }> => {
    const cleanEmail = params.email.trim().toLowerCase();
    const user = await userService.findByEmail(cleanEmail);

    if (!user) {
      await auditService.log({
        actorId: 'anonymous',
        actorEmail: cleanEmail,
        actorRole: 'ANONYMOUS',
        action: 'auth.login_failed',
        targetType: 'user',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { reason: 'User not found' },
      });
      throw new Error('Invalid email or password.');
    }

    if (user.status === 'suspended') {
      throw new Error('Your account has been suspended. Please contact support.');
    }

    const isMatch = await passwordUtil.compare(params.password, user.passwordHash);
    if (!isMatch) {
      await auditService.log({
        actorId: user.id,
        actorEmail: cleanEmail,
        actorRole: user.role,
        action: 'auth.login_failed',
        targetType: 'user',
        targetId: user.id,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { reason: 'Incorrect password' },
      });
      throw new Error('Invalid email or password.');
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();

    const permissions = ROLE_PERMISSIONS[user.role] || [];
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions,
    };

    const accessToken = tokenUtil.signAccessToken(payload);
    const refreshToken = tokenUtil.signRefreshToken({ userId: user.id });

    // Generate Firebase Custom Token for seamless Firebase Auth & Firestore Rules matching
    let firebaseCustomToken: string | undefined;
    try {
      firebaseCustomToken = await adminAuth.createCustomToken(user.id, {
        role: user.role,
        admin: user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN,
      });
    } catch (err: any) {
      console.warn('⚠️ [FirebaseAuth] Custom token generation fallback:', err.message);
    }

    await auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'auth.login_success',
      targetType: 'user',
      targetId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      firebaseCustomToken,
    };
  },

  adminLogin: async (params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: Omit<User, 'passwordHash'>; accessToken: string; refreshToken: string; firebaseCustomToken?: string }> => {
    const res = await authService.login(params);
    if (res.user.role !== Role.ADMIN && res.user.role !== Role.SUPER_ADMIN && res.user.role !== Role.EDITOR) {
      throw new Error('Access denied. This account does not possess administrative privileges.');
    }

    await auditService.log({
      actorId: res.user.id,
      actorEmail: res.user.email,
      actorRole: res.user.role,
      action: 'admin.login',
      targetType: 'admin_portal',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return res;
  },


  register: async (params: { email: string; password: string }): Promise<Omit<User, 'passwordHash'>> => {
    const newUser = await userService.create({
      email: params.email,
      password: params.password,
      role: Role.USER,
    });

    await auditService.log({
      actorId: newUser.id,
      actorEmail: newUser.email,
      actorRole: newUser.role,
      action: 'auth.register',
      targetType: 'user',
      targetId: newUser.id,
    });

    return sanitizeUser(newUser);
  },

  requestOtp: (email: string) => {
    return otpUtil.generate(email);
  },

  verifyOtp: async (email: string, code: string): Promise<{ valid: boolean; message: string }> => {
    return otpUtil.verify(email, code);
  },

  refreshToken: async (token: string): Promise<{ accessToken: string }> => {
    const decoded = tokenUtil.verifyRefreshToken(token);
    if (!decoded) {
      throw new Error('Invalid or expired refresh token.');
    }

    const user = await userService.findById(decoded.userId);
    if (!user || user.status === 'suspended') {
      throw new Error('User inactive or suspended.');
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || [],
    };

    const accessToken = tokenUtil.signAccessToken(payload);
    return { accessToken };
  },

  logout: (accessToken?: string): void => {
    if (accessToken) {
      tokenUtil.revokeToken(accessToken);
    }
  },
};
