import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/category.service';
import { responseUtil } from '../utils/response';

export const categoryController = {
  listCategories: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const list = categoryService.listCategories();
      return responseUtil.success(res, list, 'Categories retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  createCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const created = await categoryService.create(req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, created, 'Category created successfully.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  updateCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const updated = await categoryService.update(id, req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, updated, 'Category updated successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  deleteCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const deleted = await categoryService.delete(id, actorId, actorEmail, actorRole);
      if (!deleted) {
        return responseUtil.error(res, 'NOT_FOUND', 'Category not found.', 404);
      }
      return responseUtil.success(res, { id }, 'Category deleted successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  requestCategory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoryName, videoTitle, requestedByEmail } = req.body;
      const email = req.user?.email || requestedByEmail;
      const reqRecord = await categoryService.requestCategory({ categoryName, videoTitle, requestedByEmail: email });
      return responseUtil.success(res, reqRecord, 'Category request submitted.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  listCategoryRequests: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const list = categoryService.listCategoryRequests();
      return responseUtil.success(res, list, 'Category requests retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  updateCategoryRequestStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const updated = await categoryService.updateCategoryRequestStatus(id, status, actorId, actorEmail, actorRole);
      return responseUtil.success(res, updated, `Category request ${status}.`);
    } catch (err: any) {
      next(err);
    }
  },
};
