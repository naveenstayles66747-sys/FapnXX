import React, { useState, useEffect, useRef } from 'react';
import { DMCAReport, Video } from '../types';
import { VIDEOS } from '../data';
import { VideoCard } from './VideoCard';
import { ReportModal } from './ReportModal';
import { FluidPlayerWrapper } from './FluidPlayerWrapper';
import { OutstreamVideoCardAd, UnderPlayerBanner, NativeRecommendationAd } from './AdSpaces';
import { CommentsSection } from './CommentsSection';
import { useLanguage } from '../i18n/LanguageContext';
import { videoService } from '../services/videoService';
import {
  addStoredWatchHistory,
  getStoredLikedVideos,
  getStoredSavedVideos,
  toggleStoredLikedVideo,
  toggleStoredSavedVideo,
} from '../utils/storage';

interface VideoDetailScreenProps {
  video: Video;
  onBack: () => void;
  onSelectVideo: (video: Video) => void;
  onNavigateToSearch?: (query: string) => void;
  userEmail?: string | null;
  onOpenSoftLogin?: (featureName?: string) => void;
  onVideoUpdated?: (videoId: string, updates: Partial<Video>) => void;
  videos?: Video[];
}

export const VideoDetailScreen: React.FC<VideoDetailScreenProps> = ({
  video,
  onBack,
  onSelectVideo,
  onNavigateToSearch,
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

  const handleReportSubmitted = (_report: DMCAReport) => {
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
    <main className="flex-grow lg:pl-64 pb-32 w-full max-w-6xl mx-auto overflow-x-hidden">

      {/* ═══════════════════════════════════════════════
          VIDEO PLAYER — Responsive Clean Container
      ═══════════════════════════════════════════════ */}
      <section className="w-full px-2 sm:px-4 md:px-6 py-1.5 sm:py-2">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 flex items-center justify-center">
          <FluidPlayerWrapper video={video} autoPlay={true} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          EXACT REFERENCE DESIGN: VIDEO INFO & STATS BAR
      ═══════════════════════════════════════════════ */}
      <div className="px-3 sm:px-4 md:px-6 py-2 flex flex-col gap-3">
        {/* 1. Title */}
        <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight leading-snug break-words">
          {video.title}
        </h1>

        {/* 2. Stats & Actions Row: (Schedule) 05:00  (ThumbUp) 100%  (Visibility) Views ... Actions */}
        <div className="flex items-center justify-between gap-3 text-xs font-semibold flex-wrap">
          {/* Left Stats Group (All 3 metrics perfectly spaced together) */}
          <div className="flex items-center gap-4 sm:gap-5 text-rose-500 dark:text-rose-400">
            {/* Duration */}
            <span className="flex items-center gap-1.5 font-medium text-xs">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>{video.duration || '05:00'}</span>
            </span>

            {/* Real Rating % / Likes */}
            <span className="flex items-center gap-1.5 font-medium text-xs">
              <span className="material-symbols-outlined text-sm">thumb_up</span>
              <span>
                {(() => {
                  if (likeCount === 0) return '0%';
                  const views = currentViewsCount || 1;
                  const percent = Math.min(100, Math.round((likeCount / views) * 100));
                  return `${Math.max(1, percent)}%`;
                })()}
              </span>
            </span>

            {/* Views with eye icon */}
            <span className="flex items-center gap-1.5 font-medium text-xs">
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>{currentViewsCount.toLocaleString()}</span>
            </span>
          </div>

          {/* Right Action Icons (Like, Share, Report) */}
          <div className="flex items-center gap-3 sm:gap-4 text-zinc-700 dark:text-zinc-300 ml-auto">
            <button
              type="button"
              onClick={handleLike}
              className="hover:text-rose-500 transition-colors cursor-pointer p-1"
              title="Like video"
            >
              <span
                className={`material-symbols-outlined text-lg ${isLiked ? 'text-rose-500 fill-1' : ''}`}
                style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
              >
                thumb_up
              </span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="hover:text-rose-500 transition-colors cursor-pointer p-1"
              title="Share link"
            >
              <span className="material-symbols-outlined text-lg">share</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="hover:text-rose-500 transition-colors cursor-pointer p-1"
              title="Report content"
            >
              <span className="material-symbols-outlined text-lg">flag</span>
            </button>
          </div>
        </div>

        {/* 3. Rounded Info Card (Pornstar & Tags) — High contrast in Light & Dark mode */}
        <div className="rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-white/10 bg-[#f8fafc] dark:bg-[#0f1523] text-zinc-900 dark:text-zinc-100 space-y-4 shadow-sm">
          {/* Pornstar Row */}
          {performersList.length > 0 && (
            <div className="text-xs sm:text-sm font-medium flex items-center gap-2 flex-wrap">
              <span className="text-zinc-700 dark:text-zinc-400">Pornstar: </span>
              {performersList.map((p, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => onNavigateToSearch && onNavigateToSearch(p)}
                  className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold hover:underline hover:text-rose-500 transition-colors cursor-pointer bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 active:scale-95"
                  title={`View all videos of ${p}`}
                >
                  <span className="material-symbols-outlined text-xs">star</span>
                  <span>{p}</span>
                </button>
              ))}
            </div>
          )}

          {/* Tags Section */}
          <div className="space-y-2">
            <div className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-400 font-medium">
              Tags:
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* If user-provided tags exist, show them with rounded pill styling */}
              {video.tags && video.tags.length > 0 ? (
                video.tags.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onNavigateToSearch && onNavigateToSearch(tag)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white dark:bg-[#1a233a] hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-white/10 shadow-sm hover:border-rose-400 transition-all cursor-pointer active:scale-95 group"
                    title={`Search videos with tag #${tag}`}
                  >
                    <span className="material-symbols-outlined text-xs text-zinc-600 dark:text-zinc-400 group-hover:text-white transition-colors">tag</span>
                    <span>{tag}</span>
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateToSearch && onNavigateToSearch(video.quality || 'HD')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white dark:bg-[#1a233a] hover:bg-rose-500 hover:text-white text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-white/10 shadow-sm cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-xs text-zinc-600 dark:text-zinc-400">label</span>
                  <span>{video.quality || 'HD'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Source website attribution if present */}
          {sourceSiteDomain && (
            <div className="pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>Source: </span>
              <span className="text-rose-500 font-semibold">{sourceSiteDomain}</span>
            </div>
          )}
        </div>

        {/* Under-Player Responsive Ad Banner (Desktop 728x90: Zone 6010076 | Mobile 300x250: Zone 6010078) */}
        <UnderPlayerBanner />
      </div>

      {/* ─────────────────────────────────────────────
          RECOMMENDED VIDEOS — Direct Focus Below Player
      ───────────────────────────────────────────── */}
      <div className="px-3 sm:px-4 md:px-6 mt-3 mb-6">
        <h3 className="text-sm md:text-base font-extrabold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
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

        {/* Multi-Device Native Recommendation Widget (Zone ID: 6010176) */}
        <NativeRecommendationAd title="Sponsored Content You May Like" />
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
