import React, { useState, useEffect } from 'react';
import { VideoComment } from '../types';
import { videoService } from '../services/videoService';

interface CommentsSectionProps {
  videoId: string;
  userEmail?: string | null;
  onOpenSoftLogin?: (featureName?: string) => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  videoId,
  userEmail,
  onOpenSoftLogin,
}) => {
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState<string>('');

  useEffect(() => {
    // Get or assign anonymous uploader name for guest commenters
    videoService.getOrAssignAnonymousName().then((name) => {
      setAuthorName(userEmail || name);
    });
  }, [userEmail]);

  useEffect(() => {
    if (!videoId) return;

    // Fetch initial comments
    videoService.fetchComments(videoId).then((initialComments) => {
      setComments(initialComments);
    });

    // Real-time Firestore subscription for comments
    const unsubscribe = videoService.subscribeToComments(videoId, (updatedComments) => {
      setComments(updatedComments);
    });

    return () => unsubscribe();
  }, [videoId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCommentText.trim()) return;

    setIsSubmitting(true);

    try {
      const comment: VideoComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        videoId,
        userName: authorName || userEmail || 'Anonymous Fan',
        userAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
          authorName || 'user'
        )}`,
        text: newCommentText.trim(),
        createdAt: new Date().toISOString(),
        likesCount: 0,
      };

      await videoService.saveComment(comment);
      setComments((prev) => [comment, ...prev.filter((c) => c.id !== comment.id)]);
      setNewCommentText('');
    } catch (err) {
      console.error('[CommentsSection] Save comment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likesCount: c.likesCount + 1 } : c))
    );
    await videoService.likeComment(commentId);
  };

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    await videoService.deleteComment(commentId);
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <section className="mt-8 bg-zinc-100 dark:bg-[#141417] border border-zinc-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#e0358d] text-xl">forum</span>
          <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
            Community Comments ({comments.length})
          </h3>
        </div>
        <span className="text-xs text-zinc-500 dark:text-white/50 font-medium">Synced with Cloud Firestore</span>
      </div>

      {/* Post Comment Input Form */}
      <form onSubmit={handlePostComment} className="mb-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#e0358d]/20 border border-[#e0358d]/40 text-[#e0358d] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            {authorName ? authorName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              rows={2}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder={`Comment as ${authorName || 'Anonymous'}...`}
              className="w-full bg-white dark:bg-[#1e1e24] border border-zinc-300 dark:border-white/15 rounded-xl p-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-white/40 focus:outline-none focus:border-[#e0358d] focus:ring-1 focus:ring-[#e0358d] transition-all resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 dark:text-white/40">
                Posting anonymously as <strong className="text-[#e0358d]">{authorName}</strong>
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !newCommentText.trim()}
                className="px-5 py-2 rounded-xl bg-[#e0358d] hover:bg-[#c9287a] disabled:opacity-50 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>Post Comment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 dark:text-white/40 text-xs">
            <span className="material-symbols-outlined text-3xl mb-1 block opacity-50">chat_bubble_outline</span>
            Be the first to comment on this video!
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3.5 rounded-xl bg-white dark:bg-[#1a1a1e] border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 transition-colors flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-[#e0358d]/10 border border-[#e0358d]/30 text-[#e0358d] flex items-center justify-center font-bold text-xs shrink-0">
                  {comment.userName ? comment.userName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white/90">{comment.userName}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-white/40">{formatTimestamp(comment.createdAt)}</span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-white/80 leading-relaxed break-words">{comment.text}</p>
                </div>
              </div>

              {/* Actions: Like & Delete */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLikeComment(comment.id)}
                  className="flex items-center gap-1 text-[11px] text-white/60 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                  title="Like comment"
                >
                  <span className="material-symbols-outlined text-xs">thumb_up</span>
                  <span>{comment.likesCount}</span>
                </button>

                {userEmail && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-rose-500 transition-all p-1 rounded hover:bg-rose-500/10"
                    title="Delete comment"
                  >
                    <span className="material-symbols-outlined text-xs">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default CommentsSection;
