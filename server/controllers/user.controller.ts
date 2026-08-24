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

      const result = await userService.listUsers({ page, limit, search, role });
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
      const actorId = req.user!.userId;
      const updated = await userService.updateRole(id, role as Role, actorRole, actorId, req.user?.email);
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

      const updated = await userService.setUserStatus(id, status as 'active' | 'suspended', actorRole);
      return responseUtil.success(res, updated, `User account ${status}.`);
    } catch (err: any) {
      next(err);
    }
  },

  updateProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user!.userId;
      const targetUserId = req.params.id || actorId;
      const updates = req.body;
      const actorRole = req.user!.role;

      const updated = await userService.updateProfile(targetUserId, updates, actorId, actorRole);
      return responseUtil.success(res, updated, 'User profile updated successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  getInteractions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user!.userId;
      const targetUserId = req.params.id || actorId;
      const actorRole = req.user!.role;

      const data = await userService.getInteractions(targetUserId, actorId, actorRole);
      return responseUtil.success(res, data, 'User interactions retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  syncInteractions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user!.userId;
      const targetUserId = req.params.id || actorId;
      const actorRole = req.user!.role;

      const data = await userService.syncInteractions(targetUserId, req.body, actorId, actorRole);
      return responseUtil.success(res, data, 'User interactions synced successfully.');
    } catch (err: any) {
      next(err);
    }
  },
};
