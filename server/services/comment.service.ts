import { auditService } from './audit.service';

export interface CommentRecord {
  id: string;
  videoId: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
  likesCount: number;
  isModerated?: boolean;
}

const comments = new Map<string, CommentRecord>();

export const commentService = {
  listByVideo: (videoId: string): CommentRecord[] => {
    const list: CommentRecord[] = [];
    for (const c of comments.values()) {
      if (c.videoId === videoId) {
        list.push(c);
      }
    }
    // Newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  create: async (params: {
    videoId: string;
    userId?: string;
    userName: string;
    userAvatar?: string;
    text: string;
  }): Promise<CommentRecord> => {
    const id = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newComment: CommentRecord = {
      id,
      videoId: params.videoId,
      userId: params.userId,
      userName: params.userName.trim() || 'Anonymous Fan',
      userAvatar: params.userAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(params.userName)}`,
      text: params.text.trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0,
      isModerated: false,
    };

    comments.set(id, newComment);
    return newComment;
  },

  like: (id: string): number => {
    const comment = comments.get(id);
    if (!comment) {
      throw new Error('Comment not found.');
    }
    comment.likesCount += 1;
    comments.set(id, comment);
    return comment.likesCount;
  },

  delete: async (
    id: string,
    actorId: string,
    actorRole: string,
    actorEmail: string
  ): Promise<boolean> => {
    const comment = comments.get(id);
    if (!comment) {
      return false;
    }

    // Check ownership or moderator/admin rights
    const isOwner = comment.userId && comment.userId === actorId;
    const isStaff = actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN' || actorRole === 'MODERATOR';

    if (!isOwner && !isStaff) {
      throw new Error('You do not have permission to delete this comment.');
    }

    comments.delete(id);

    if (isStaff && !isOwner) {
      await auditService.log({
        actorId,
        actorEmail,
        actorRole,
        action: 'comment.moderated_delete',
        targetType: 'comment',
        targetId: id,
        metadata: { videoId: comment.videoId, originalText: comment.text },
      });
    }

    return true;
  },
};
