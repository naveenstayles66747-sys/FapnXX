import { Request, Response, NextFunction } from 'express';
import { videoServiceBackend } from '../services/video.service';
import { responseUtil } from '../utils/response';
import { VideoStatus, Role } from '../config/constants';

export const videoController = {
  listVideos: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 24;
      const category = req.query.category as string;
      const orientation = req.query.orientation as string;
      const search = req.query.search as string;
      const status = req.query.status as VideoStatus;
      const sort = req.query.sort as 'newest' | 'trending' | 'views' | 'likes';

      // Check if caller is admin requesting unpublished videos
      const isStaff = req.user && (req.user.role === Role.ADMIN || req.user.role === Role.SUPER_ADMIN || req.user.role === Role.EDITOR);
      const includeUnpublished = isStaff && req.query.includeUnpublished === 'true';

      const result = videoServiceBackend.listVideos({
        page,
        limit,
        category,
        orientation,
        search,
        status,
        includeUnpublished,
        sort,
      });

      return responseUtil.success(res, result, 'Videos retrieved successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  getVideoById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const video = videoServiceBackend.findById(id);

      if (!video) {
        return responseUtil.error(res, 'NOT_FOUND', 'Video not found.', 404);
      }

      // If unpublished and not staff, return 404
      if (video.status !== VideoStatus.PUBLISHED) {
        const isStaff = req.user && (req.user.role === Role.ADMIN || req.user.role === Role.SUPER_ADMIN || req.user.role === Role.EDITOR);
        if (!isStaff) {
          return responseUtil.error(res, 'NOT_FOUND', 'Video not found.', 404);
        }
      }

      return responseUtil.success(res, video, 'Video details retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  createVideo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user?.userId || 'guest';
      const actorEmail = req.user?.email || 'guest@indianfullxx.com';
      const actorRole = req.user?.role || Role.USER;

      const video = await videoServiceBackend.create(req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, video, 'Video published successfully.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  updateVideo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const updated = await videoServiceBackend.update(id, req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, updated, 'Video updated successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  deleteVideo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const deleted = await videoServiceBackend.delete(id, actorId, actorEmail, actorRole);
      if (!deleted) {
        return responseUtil.error(res, 'NOT_FOUND', 'Video not found.', 404);
      }

      return responseUtil.success(res, { id }, 'Video deleted successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  incrementViews: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const clientIdentifier = req.ip || req.headers['user-agent'] || 'anonymous';
      const result = videoServiceBackend.incrementViewCount(id, clientIdentifier);
      return responseUtil.success(res, result, 'View recorded.');
    } catch (err: any) {
      next(err);
    }
  },

  toggleLikes: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { isLike } = req.body;
      const newLikesCount = videoServiceBackend.incrementLikes(id, isLike !== false);
      return responseUtil.success(res, { likesCount: newLikesCount }, 'Likes updated.');
    } catch (err: any) {
      next(err);
    }
  },
};
