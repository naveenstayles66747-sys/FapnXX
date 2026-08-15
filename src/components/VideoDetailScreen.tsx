import React, { useState, useEffect, useRef } from 'react';
import { DMCAReport, Video } from '../types';
import { VIDEOS } from '../data';
import { VideoCard } from './VideoCard';
import { ReportModal } from './ReportModal';
import { FluidPlayerWrapper } from './FluidPlayerWrapper';
import { AdBanner } from './AdSpaces';
import { CommentsSection } from './CommentsSection';
import { useLanguage } from '../i18n/LanguageContext';
import { videoService } from '../services/videoService';
import {
  addStoredWatchHistory,
  getStoredLikedVideos,
  getStoredSavedVideos,
  toggleStoredLikedVideo,
  toggleStoredSavedVideo,
  addStoredReport,
} from '../utils/storage';

interface VideoDetailScreenProps {
  video: Video;
  onBack: () => void;
  onSelectVideo: (video: Video) => void;
  userEmail?: string | null;
  onOpenSoftLogin?: (featureName?: string) => void;
  onVideoUpdated?: (videoId: string, updates: Partial<Video>) => void;
  videos?: Video[];
}

export const VideoDetailScreen: React.FC<VideoDetailScreenProps> = ({
  video,
  onBack,
  onSelectVideo,
  userEmail,
  onOpenSoftLogin,
  onVideoUpdated,
  videos = VIDEOS,
}) => {
  const { t } = useLanguage();
  const isGuest = !userEmail;

  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(() =>
    typeof video.likesCount === 'number' ? video.likesCount : 0
  );
  const [showShareNotification, setShowShareNotification] = useState(false);

  // DMCA Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState(false);

  // Real-time Views Counter
  const [currentViewsCount, setCurrentViewsCount] = useState<number>(() => video.viewsCount || 1);
  const [watchSeconds, setWatchSeconds] = useState<number>(0);
  const hasCountedRef = useRef<boolean>(false);

  // Initialize liked/saved status and true Firestore counts
  useEffect(() => {
    const liked = getStoredLikedVideos().includes(video.id);
    const saved = getStoredSavedVideos().includes(video.id);
    setIsLiked(liked);
    setIsSaved(saved);
    setCurrentViewsCount(video.viewsCount || 1);
    setLikeCount(typeof video.likesCount === 'number' ? video.likesCount : 0);
    if (!isGuest) {
      addStoredWatchHistory(video.id);
    }
  }, [video.id, video.viewsCount, video.likesCount, isGuest]);

  // 5-second watch threshold for view increment
  useEffect(() => {
    hasCountedRef.current = false;
    setWatchSeconds(0);
    const timer = setInterval(() => {
      setWatchSeconds((prev) => {
        const next = prev + 1;
        if (next >= 5 && !hasCountedRef.current) {
          hasCountedRef.current = true;
          videoService.incrementVideoViews(video.id).then((newViewsCount) => {
            setCurrentViewsCount(newViewsCount);
            if (onVideoUpdated) {
              onVideoUpdated(video.id, {
                viewsCount: newViewsCount,
                views: `${newViewsCount} ${newViewsCount === 1 ? 'view' : 'views'}`,
              });
            }
          });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [video.id]);

  const handleLike = async () => {
    const nextLikedState = !isLiked;
    setIsLiked(nextLikedState);
    toggleStoredLikedVideo(video.id);
    const updatedLikes = await videoService.incrementVideoLikes(video.id, nextLikedState);
    setLikeCount(updatedLikes);
    if (onVideoUpdated) {
      onVideoUpdated(video.id, { likesCount: updatedLikes });
    }
  };

  const handleSave = () => {
    toggleStoredSavedVideo(video.id);
    setIsSaved(!isSaved);
  };

  const handleShare = () => {
    const currentUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl).catch(() => {});
    }
    setShowShareNotification(true);
    setTimeout(() => setShowShareNotification(false), 3000);
  };

  const handleReportSubmitted = (report: DMCAReport) => {
    addStoredReport(report);
    setReportSuccessToast(true);
    setTimeout(() => setReportSuccessToast(false), 4000);
  };

  // Stream buffering simulation
  const [isBufferingStream, setIsBufferingStream] = useState<boolean>(true);
  useEffect(() => {
    setIsBufferingStream(true);
    const finish = setTimeout(() => setIsBufferingStream(false), 1200);
    return () => clearTimeout(finish);
  }, [video.id]);

  // Related videos engine
  const relatedVideosWithScore = (videos || VIDEOS || [])
    .filter((v) => v && v.id !== video.id && !v.isTakenDown)
    .map((candidate) => {
      let matchScore = 50;
      if (candidate.category === video.category) matchScore += 35;
      if (candidate.performerName === video.performerName) matchScore += 30;
      const sharedTags = (candidate.tags || []).filter((tag) => (video.tags || []).includes(tag));
      matchScore += sharedTags.length * 10;
      return { ...candidate, relevanceScore: Math.min(matchScore, 99) };
    });
  relatedVideosWithScore.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topRelatedVideos = relatedVideosWithScore.slice(0, 8);

  // Derive performers list from all possible fields
  const performersList: string[] = (() => {
    if (video.performers && video.performers.length > 0) return video.performers;
    if (video.modelsActors && video.modelsActors.length > 0) return video.modelsActors;
    if (video.models_actors && video.models_actors.length > 0) return video.models_actors;
    if (video.performerName && video.performerName !== 'Anonymous' && video.performerName !== 'User Uploaded') {
      return [video.performerName];
    }
    return [];
  })();

  // Source site domain display
  const sourceSiteDomain = video.sourceWebsite || video.channelName
    ? (video.sourceWebsite || video.channelName)
    : null;

  return (
    <main className="flex-grow lg:pl-64 pb-20 w-full max-w-6xl mx-auto overflow-x-hidden">

      {/* ═══════════════════════════════════════════════
          TOP AD STRIP
      ═══════════════════════════════════════════════ */}
      <div className="w-full px-2 sm:px-4 md:px-6 pt-1 sm:pt-2">
        <AdBanner position="banner_top" title="Featured Sponsor" />
      </div>

      {/* ═══════════════════════════════════════════════
          VIDEO PLAYER — Responsive Container with Padding & Rounded Corners
      ═══════════════════════════════════════════════ */}
      <section className="w-full px-2 sm:px-4 md:px-6 py-1.5 sm:py-2">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 flex items-center justify-center">
          {/* Buffering spinner */}
          {isBufferingStream ? (
            <div className="absolute inset-0 bg-black video-loading-screen z-30 flex items-center justify-center">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-rose-500" viewBox="0 0 100 100" fill="currentColor">
                <circle cx="50" cy="14" r="7.5" opacity="1.0" />
                <circle cx="75" cy="25" r="7.5" opacity="0.9" />
                <circle cx="86" cy="50" r="7.5" opacity="0.8" />
                <circle cx="75" cy="75" r="7.5" opacity="0.7" />
                <circle cx="50" cy="86" r="7.5" opacity="0.6" />
                <circle cx="25" cy="75" r="7.5" opacity="0.5" />
                <circle cx="14" cy="50" r="7.5" opacity="0.4" />
                <circle cx="25" cy="25" r="7.5" opacity="0.3" />
              </svg>
            </div>
          ) : null}
          {!isBufferingStream && <FluidPlayerWrapper video={video} autoPlay={true} />}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          COMPACT VIDEO INFO & ACTIONS BAR (Single Clean Row)
      ═══════════════════════════════════════════════ */}
      <div className="px-3 sm:px-4 md:px-6 py-2 flex flex-col gap-2">
        {/* Title & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug break-words">
              {video.title}
            </h1>
            {/* Meta Line: Views • Duration • Rating • Quality • Pornstar */}
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 flex-wrap font-medium">
              <span className="font-semibold text-zinc-200">
                {currentViewsCount.toLocaleString()} {currentViewsCount === 1 ? 'view' : 'views'}
              </span>
              <span>•</span>
              <span className="font-mono text-rose-400 font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                <span>{video.duration || '05:00'}</span>
              </span>
              {video.rating && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">👍 {video.rating}</span>
                </>
              )}
              {performersList.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-pink-400 font-bold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">person</span>
                    <span>{performersList.join(', ')}</span>
                  </span>
                </>
              )}
              <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-white/10 uppercase">
                {video.quality || 'HD'}
              </span>
            </div>
          </div>

          {/* Action Buttons (Compact horizontal row) */}
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
            {/* Like Button */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm border ${
                isLiked
                  ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-white/10'
              }`}
              title="Like this video"
            >
              <span
                className="material-symbols-outlined text-sm"
                style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
              >
                thumb_up
              </span>
              <span>{likeCount.toLocaleString()}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-white/10 transition-all cursor-pointer shadow-sm"
              title="Share video link"
            >
              <span className="material-symbols-outlined text-sm text-pink-400">share</span>
              <span>Share</span>
            </button>

            {/* Save Button (Only if user logged in) */}
            {!isGuest && (
              <button
                type="button"
                onClick={handleSave}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm border ${
                  isSaved
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-white/10'
                }`}
                title={isSaved ? 'Saved' : 'Save'}
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
                >
                  bookmark
                </span>
              </button>
            )}

            {/* Report Button (Compact Flag Icon with tooltip) */}
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-zinc-900/90 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer shadow-sm"
              title="Report content"
            >
              <span className="material-symbols-outlined text-sm">flag</span>
            </button>
          </div>
        </div>

        {/* Compact Tags & Source chips (Only shown if custom tags or source website exist) */}
        {((video.tags && video.tags.length > 0) || sourceSiteDomain) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {sourceSiteDomain && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                <span className="material-symbols-outlined text-[12px]">language</span>
                <span>{sourceSiteDomain}</span>
              </span>
            )}
            {video.tags && video.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-300 px-2 py-0.5 rounded-md transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Description (If present and clean) */}
        {video.description && video.description.trim() && (
          <p className="text-xs text-zinc-400 leading-relaxed mt-0.5 line-clamp-2 hover:line-clamp-none transition-all">
            {video.description}
          </p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          BOTTOM AD STRIP
      ═══════════════════════════════════════════════ */}
      <div className="w-full px-2 sm:px-4 md:px-6 my-2">
        <AdBanner position="banner_bottom" title="Featured Partner Sponsor" />
      </div>

      {/* ─────────────────────────────────────────────
          RECOMMENDED VIDEOS — Direct Focus Below Player
      ───────────────────────────────────────────── */}
      <div className="px-3 sm:px-4 md:px-6 mt-3 mb-6">
        <h3 className="text-sm md:text-base font-extrabold text-white mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-500 text-lg">grid_view</span>
          <span>Recommended Videos</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-5 gap-x-4 sm:gap-5">
          {(topRelatedVideos || []).map((relatedVideo) => (
            <div key={relatedVideo.id} className="relative group">
              <VideoCard
                video={relatedVideo}
                onClick={() => onSelectVideo(relatedVideo)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          COMMENTS SECTION
      ───────────────────────────────────────────── */}
      <div className="px-3 sm:px-4 md:px-6 mt-4 pt-4 border-t border-white/10">
        <CommentsSection
          videoId={video.id}
          userEmail={userEmail}
          onOpenSoftLogin={onOpenSoftLogin}
        />
      </div>

      {/* DMCA Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        video={video}
        onSubmitReportSuccess={handleReportSubmitted}
      />

      {/* Toast Notifications */}
      {showShareNotification && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2.5 bg-emerald-500/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-emerald-300/40 font-bold text-xs tracking-wide">
          <span className="material-symbols-outlined text-xl">content_copy</span>
          <span>{t.copiedToClipboard}</span>
        </div>
      )}

      {reportSuccessToast && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2.5 bg-rose-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-rose-400/40 font-bold text-xs tracking-wide">
          <span className="material-symbols-outlined text-xl">verified</span>
          <span>{t.reportSuccessMsg}</span>
        </div>
      )}
    </main>
  );
};
