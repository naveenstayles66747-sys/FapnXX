import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { responseUtil } from '../utils/response';
import { Role } from '../config/constants';

export const userController = {
  listUsers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = req.query.search as string;
      const role = req.query.role as Role;

      const result = userService.listUsers({ page, limit, search, role });
      return responseUtil.success(res, result, 'Users retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  updateRole: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const actorRole = req.user!.role;

      const updated = userService.updateRole(id, role as Role, actorRole);
      return responseUtil.success(res, updated, 'User role updated successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  setStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const actorRole = req.user!.role;

      const updated = userService.setUserStatus(id, status as 'active' | 'suspended', actorRole);
      return responseUtil.success(res, updated, `User account ${status}.`);
    } catch (err: any) {
      next(err);
    }
  },
};
