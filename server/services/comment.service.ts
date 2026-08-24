import { auditService } from './audit.service';
import { adminDb } from '../firebase-admin';
import { Role } from '../config/constants';

export type CommentStatus = 'approved' | 'pending' | 'rejected' | 'removed';

export interface CommentRecord {
  id: string;
  videoId: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  likesCount: number;
  status: CommentStatus;
  isModerated?: boolean;
  moderatedBy?: string;
  moderatedAt?: string;
  moderationReason?: string;
}

const comments = new Map<string, CommentRecord>();
let isFirestoreCommentsInitialized = false;

async function initFirestoreCommentsSync() {
  if (isFirestoreCommentsInitialized) return;
  try {
    const snapshot = await adminDb.collection('comments').limit(300).get();
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        const data = doc.data() as CommentRecord;
        comments.set(doc.id, {
          ...data,
          id: doc.id,
          status: data.status || 'approved',
        });
      });
      console.log(`✅ [Firestore CommentService] Loaded ${snapshot.size} comments from Firestore.`);
    }
    isFirestoreCommentsInitialized = true;
  } catch (err: any) {
    console.warn('⚠️ [Firestore CommentService] Sync fallback:', err.message);
  }
}

initFirestoreCommentsSync();

export const commentService = {
  listByVideo: async (
    videoId: string,
    viewerRole?: Role,
    viewerUserId?: string
  ): Promise<CommentRecord[]> => {
    const isStaff =
      viewerRole === Role.ADMIN ||
      viewerRole === Role.SUPER_ADMIN ||
      viewerRole === Role.MODERATOR;

    try {
      let query: FirebaseFirestore.Query = adminDb
        .collection('comments')
        .where('videoId', '==', videoId);

      const snap = await query.limit(150).get();
      if (!snap.empty) {
        const list: CommentRecord[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as CommentRecord;
          const c: CommentRecord = {
            ...data,
            id: doc.id,
            status: data.status || 'approved',
          };
          comments.set(doc.id, c);

          // Filtering: Staff sees all, normal user sees approved + own comments
          if (isStaff || c.status === 'approved' || (viewerUserId && c.userId === viewerUserId)) {
            list.push(c);
          }
        });
        return list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore CommentService] listByVideo notice:', err.message);
    }

    const list: CommentRecord[] = [];
    for (const c of comments.values()) {
      if (c.videoId === videoId) {
        if (isStaff || c.status === 'approved' || (viewerUserId && c.userId === viewerUserId)) {
          list.push(c);
        }
      }
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  listForModeration: async (
    statusFilter?: CommentStatus,
    limitCount: number = 50
  ): Promise<CommentRecord[]> => {
    try {
      let query: FirebaseFirestore.Query = adminDb.collection('comments');
      if (statusFilter) {
        query = query.where('status', '==', statusFilter);
      }
      const snap = await query.limit(limitCount).get();
      if (!snap.empty) {
        const list: CommentRecord[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as CommentRecord;
          const c = { ...data, id: doc.id, status: data.status || 'approved' };
          comments.set(doc.id, c);
          list.push(c);
        });
        return list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore CommentService] listForModeration notice:', err.message);
    }

    let list = Array.from(comments.values());
    if (statusFilter) {
      list = list.filter((c) => c.status === statusFilter);
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  findById: async (id: string): Promise<CommentRecord | undefined> => {
    try {
      const docSnap = await adminDb.collection('comments').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data() as CommentRecord;
        const c = { ...data, id: docSnap.id, status: data.status || 'approved' };
        comments.set(id, c);
        return c;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore CommentService] findById notice:', err.message);
    }
    return comments.get(id);
  },

  create: async (params: {
    videoId: string;
    userId?: string;
    userName: string;
    userAvatar?: string;
    text: string;
    authorRole?: Role;
  }): Promise<CommentRecord> => {
    const id = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isStaff =
      params.authorRole === Role.ADMIN ||
      params.authorRole === Role.SUPER_ADMIN ||
      params.authorRole === Role.MODERATOR;

    // Policy: Staff comments are automatically approved. User comments are approved by policy.
    // Client cannot override status or moderation fields.
    const initialStatus: CommentStatus = 'approved';

    const newComment: CommentRecord = {
      id,
      videoId: params.videoId,
      userId: params.userId,
      userName: params.userName.trim() || 'Anonymous Fan',
      userAvatar:
        params.userAvatar ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(params.userName)}`,
      text: params.text.trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0,
      status: initialStatus,
      isModerated: isStaff,
    };

    comments.set(id, newComment);

    // Save to Firestore DB
    try {
      await adminDb.collection('comments').doc(id).set(newComment);
    } catch (err: any) {
      console.warn(`[Firestore Comment] Save error for doc ${id}:`, err.message);
    }

    return newComment;
  },

  moderate: async (
    id: string,
    action: { status: CommentStatus; reason?: string },
    moderator: { id: string; email: string; role: Role }
  ): Promise<CommentRecord> => {
    const comment = await commentService.findById(id);
    if (!comment) {
      throw new Error('Comment not found.');
    }

    const previousStatus = comment.status;
    comment.status = action.status;
    comment.isModerated = true;
    comment.moderatedBy = moderator.email;
    comment.moderatedAt = new Date().toISOString();
    comment.moderationReason = action.reason || `Status updated to ${action.status}`;
    comment.updatedAt = comment.moderatedAt;

    comments.set(id, comment);

    // Persist moderation update in Firestore
    try {
      await adminDb.collection('comments').doc(id).set(
        {
          status: comment.status,
          isModerated: true,
          moderatedBy: comment.moderatedBy,
          moderatedAt: comment.moderatedAt,
          moderationReason: comment.moderationReason,
          updatedAt: comment.updatedAt,
        },
        { merge: true }
      );
    } catch (err: any) {
      console.warn(`[Firestore Comment] Moderation update error for doc ${id}:`, err.message);
    }

    // Record in Audit Log
    try {
      await auditService.log({
        actorId: moderator.id,
        actorEmail: moderator.email,
        actorRole: moderator.role,
        action: 'comment.moderated',
        targetType: 'comment',
        targetId: id,
        metadata: {
          videoId: comment.videoId,
          previousStatus,
          newStatus: action.status,
          reason: action.reason,
        },
      });
    } catch (auditErr: any) {
      console.warn('[AuditLog] Comment moderation log notice:', auditErr.message);
    }

    return comment;
  },

  like: async (id: string): Promise<number> => {
    let comment = await commentService.findById(id);
    if (!comment) {
      throw new Error('Comment not found.');
    }
    comment.likesCount = (comment.likesCount || 0) + 1;
    comments.set(id, comment);

    // Persist directly to Firestore DB
    try {
      await adminDb.collection('comments').doc(id).set(
        {
          likesCount: comment.likesCount,
        },
        { merge: true }
      );
    } catch (err: any) {
      console.warn(`[Firestore Comment] Like error for doc ${id}:`, err.message);
    }

    return comment.likesCount;
  },

  delete: async (
    id: string,
    actorId: string,
    actorRole: string,
    actorEmail: string
  ): Promise<boolean> => {
    const comment = await commentService.findById(id);
    if (!comment) {
      return false;
    }

    // Check ownership or moderator/admin rights
    const isOwner = comment.userId && comment.userId === actorId;
    const isStaff =
      actorRole === 'ADMIN' ||
      actorRole === 'SUPER_ADMIN' ||
      actorRole === 'MODERATOR';

    if (!isOwner && !isStaff) {
      throw new Error('You do not have permission to delete this comment.');
    }

    comments.delete(id);

    // Delete from Firestore DB
    try {
      await adminDb.collection('comments').doc(id).delete();
    } catch (err: any) {
      console.warn(`[Firestore Comment] Delete error for doc ${id}:`, err.message);
    }

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
