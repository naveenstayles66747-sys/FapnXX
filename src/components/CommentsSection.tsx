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
}) => {
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState<string>('');

  useEffect(() => {
    // Persistent Guest ID (e.g., Guest_4821) or Logged In Username
    videoService.getOrAssignAnonymousName().then((name) => {
      if (userEmail) {
        setAuthorName(userEmail.split('@')[0]);
      } else {
        setAuthorName(name);
      }
    });
  }, [userEmail]);

  useEffect(() => {
    if (!videoId) return;

    // Fetch initial comments
    videoService.fetchComments(videoId).then((initialComments) => {
      setComments(initialComments);
    });

    // Real-time Firestore subscription for instant live sync
    const unsubscribe = videoService.subscribeToComments(videoId, (updatedComments) => {
      setComments(updatedComments);
    });

    return () => unsubscribe();
  }, [videoId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const comment: VideoComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        videoId,
        userName: authorName || 'Guest_1001',
        userAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
          authorName || 'Guest'
        )}`,
        text: newCommentText.trim(),
        createdAt: new Date().toISOString(),
        likesCount: 0,
      };

      await videoService.saveComment(comment);
      setComments((prev) => [comment, ...prev.filter((c) => c.id !== comment.id)]);
      setNewCommentText('');
      setIsInputOpen(false);
    } catch (err) {
      console.error('[CommentsSection] Save comment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likesCount: (c.likesCount || 0) + 1 } : c))
    );
    await videoService.likeComment(commentId);
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
    <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-white/10">
      {/* Comments Header & Add Comment Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Comments{' '}
          <span className="text-zinc-500 dark:text-zinc-400 font-normal">
            {comments.length === 0 ? 'no comments for this video.' : `(${comments.length})`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsInputOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm text-[#ec4899]">chat_bubble</span>
          <span>Add comment</span>
        </button>
      </div>

      {/* Expandable Add Comment Input Box */}
      {isInputOpen && (
        <form onSubmit={handlePostComment} className="space-y-2 pt-1 animate-fadeIn">
          <textarea
            rows={3}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={`Write a comment as ${authorName || 'Guest'}...`}
            autoFocus
            className="w-full bg-zinc-50 dark:bg-[#121115] border border-zinc-300 dark:border-white/20 rounded-xl p-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] transition-all resize-none shadow-inner"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              Posting as <strong className="text-[#ec4899]">{authorName || 'Guest'}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsInputOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !newCommentText.trim()}
                className="px-5 py-1.5 rounded-lg bg-[#3b3a40] hover:bg-[#4b4a52] dark:bg-[#2b2a30] dark:hover:bg-[#3f3e46] disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>SENDING...</span>
                  </>
                ) : (
                  <span>SEND</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Comments List */}
      {comments.length > 0 && (
        <div className="space-y-2.5 pt-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-2.5 sm:p-3 rounded-xl bg-zinc-100/70 dark:bg-white/5 border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 transition-colors flex items-start justify-between gap-2.5"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#ec4899]/15 border border-[#ec4899]/30 text-[#ec4899] flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                  {comment.userName ? comment.userName.charAt(0).toUpperCase() : 'G'}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {comment.userName}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0 font-mono">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed break-words">
                    {comment.text}
                  </p>
                </div>
              </div>

              {/* Like Button */}
              <button
                type="button"
                onClick={() => handleLikeComment(comment.id)}
                className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-[#ec4899] dark:text-zinc-400 dark:hover:text-[#ffb0cd] transition-colors p-1 rounded hover:bg-zinc-200/60 dark:hover:bg-white/10 cursor-pointer shrink-0"
                title="Like comment"
              >
                <span className="material-symbols-outlined text-xs">thumb_up</span>
                <span>{comment.likesCount || 0}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
