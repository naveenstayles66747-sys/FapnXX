import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Permission, Role } from '../config/constants';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

const revokedTokens = new Set<string>();

export const tokenUtil = {
  signAccessToken: (payload: TokenPayload): string => {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  },

  signRefreshToken: (payload: { userId: string }): string => {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });
  },

  verifyAccessToken: (token: string): TokenPayload | null => {
    if (revokedTokens.has(token)) {
      return null;
    }
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  },

  verifyRefreshToken: (token: string): { userId: string } | null => {
    if (revokedTokens.has(token)) {
      return null;
    }
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
    } catch {
      return null;
    }
  },

  revokeToken: (token: string): void => {
    revokedTokens.add(token);
  },

  isRevoked: (token: string): boolean => {
    return revokedTokens.has(token);
  },
};
