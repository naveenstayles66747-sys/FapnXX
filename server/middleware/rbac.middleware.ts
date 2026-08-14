import { Request, Response, NextFunction } from 'express';
import { Permission, Role, ROLE_PERMISSIONS } from '../config/constants';
import { responseUtil } from '../utils/response';

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return responseUtil.error(res, 'UNAUTHORIZED', 'Authentication required.', 401);
    }

    // SUPER_ADMIN has omnipotent access across all role gates
    if (req.user.role === Role.SUPER_ADMIN || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return responseUtil.error(
      res,
      'FORBIDDEN',
      `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
      403
    );
  };
};

export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return responseUtil.error(res, 'UNAUTHORIZED', 'Authentication required.', 401);
    }

    // SUPER_ADMIN automatically satisfies all permissions
    if (req.user.role === Role.SUPER_ADMIN) {
      return next();
    }

    const userPermissions = req.user.permissions || ROLE_PERMISSIONS[req.user.role] || [];
    const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));

    if (!hasAll) {
      return responseUtil.error(
        res,
        'FORBIDDEN',
        `Insufficient privileges. Missing permission: [${requiredPermissions.filter((p) => !userPermissions.includes(p)).join(', ')}]`,
        403
      );
    }

    next();
  };
};
