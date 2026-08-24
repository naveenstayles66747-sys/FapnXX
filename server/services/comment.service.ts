import { auditService } from './audit.service';
import { adminDb } from '../firebase-admin';

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
let isFirestoreCommentsInitialized = false;

async function initFirestoreCommentsSync() {
  if (isFirestoreCommentsInitialized) return;
  try {
    const snapshot = await adminDb.collection('comments').limit(200).get();
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        const data = doc.data() as CommentRecord;
        comments.set(doc.id, { ...data, id: doc.id });
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
  listByVideo: async (videoId: string): Promise<CommentRecord[]> => {
    try {
      const snap = await adminDb.collection('comments').where('videoId', '==', videoId).limit(100).get();
      if (!snap.empty) {
        const list: CommentRecord[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as CommentRecord;
          const c = { ...data, id: doc.id };
          list.push(c);
          comments.set(doc.id, c);
        });
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore CommentService] listByVideo notice:', err.message);
    }

    const list: CommentRecord[] = [];
    for (const c of comments.values()) {
      if (c.videoId === videoId) {
        list.push(c);
      }
    }
    // Newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  findById: async (id: string): Promise<CommentRecord | undefined> => {
    try {
      const docSnap = await adminDb.collection('comments').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data() as CommentRecord;
        const c = { ...data, id: docSnap.id };
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

    // Save to Firestore DB
    try {
      await adminDb.collection('comments').doc(id).set(newComment);
    } catch (err: any) {
      console.warn(`[Firestore Comment] Save error for doc ${id}:`, err.message);
    }

    return newComment;
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
      await adminDb.collection('comments').doc(id).set({
        likesCount: comment.likesCount,
      }, { merge: true });
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
    const isStaff = actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN' || actorRole === 'MODERATOR';

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

