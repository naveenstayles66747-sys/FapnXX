import { Request, Response, NextFunction } from 'express';
import { commentService } from '../services/comment.service';
import { responseUtil } from '../utils/response';

export const commentController = {
  listByVideo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId } = req.params;
      const list = commentService.listByVideo(videoId);
      return responseUtil.success(res, list, 'Comments retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  createComment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoId, text, userName, userAvatar } = req.body;
      const comment = await commentService.create({
        videoId,
        userId: req.user?.userId,
        userName: userName || req.user?.email || 'Anonymous',
        userAvatar,
        text,
      });
      return responseUtil.success(res, comment, 'Comment posted.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  likeComment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const likesCount = commentService.like(id);
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
