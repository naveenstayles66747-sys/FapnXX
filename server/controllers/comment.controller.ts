import { Request, Response, NextFunction } from 'express';
import { commentService, CommentStatus } from '../services/comment.service';
import { responseUtil } from '../utils/response';
import { Role } from '../config/constants';

export const commentController = {
  listByVideo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.params;
      const viewerRole = req.user?.role as Role | undefined;
      const viewerUserId = req.user?.userId;

      const list = await commentService.listByVideo(videoId, viewerRole, viewerUserId);
      return responseUtil.success(res, list, 'Comments retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  listForModeration: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as CommentStatus | undefined;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const list = await commentService.listForModeration(status, limit);
      return responseUtil.success(res, list, 'Moderation comments retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  createComment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId, text, userName, userAvatar } = req.body;
      const authorRole = req.user?.role as Role | undefined;

      const comment = await commentService.create({
        videoId,
        userId: req.user?.userId,
        userName: userName || req.user?.email || 'Anonymous',
        userAvatar,
        text,
        authorRole,
      });
      return responseUtil.success(res, comment, 'Comment posted successfully.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  moderateComment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const moderator = {
        id: req.user!.userId,
        email: req.user!.email,
        role: req.user!.role,
      };

      const updated = await commentService.moderate(id, { status, reason }, moderator);
      return responseUtil.success(res, updated, `Comment status updated to ${status}.`);
    } catch (err: any) {
      next(err);
    }
  },

  likeComment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const likesCount = await commentService.like(id);
      return responseUtil.success(res, { likesCount }, 'Comment liked.');
    } catch (err: any) {
      next(err);
    }
  },

  deleteComment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user?.userId || 'anonymous';
      const actorRole = req.user?.role || 'USER';
      const actorEmail = req.user?.email || 'anonymous';

      const deleted = await commentService.delete(id, actorId, actorRole, actorEmail);
      if (!deleted) {
        return responseUtil.error(res, 'NOT_FOUND', 'Comment not found.', 404);
      }
      return responseUtil.success(res, { id }, 'Comment deleted.');
    } catch (err: any) {
      next(err);
    }
  },
};
