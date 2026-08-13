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
    typeof video.likesCount === 'number' ? video.likesCount : 1200
  );
  const [showShareNotification, setShowShareNotification] = useState(false);

  // DMCA Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState(false);

  // Real-time Views Counter
  const [currentViewsCount, setCurrentViewsCount] = useState<number>(() => video.viewsCount || 1);
  const [watchSeconds, setWatchSeconds] = useState<number>(0);
  const hasCountedRef = useRef<boolean>(false);

  // Initialize liked/saved status
  useEffect(() => {
    const liked = getStoredLikedVideos().includes(video.id);
    const saved = getStoredSavedVideos().includes(video.id);
    setIsLiked(liked);
    setIsSaved(saved);
    setCurrentViewsCount(video.viewsCount || 1);
    setLikeCount(typeof video.likesCount === 'number' ? video.likesCount : 1200);
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
    if (isGuest) {
      if (onOpenSoftLogin) onOpenSoftLogin('Cloud Bookmarks & Sync');
      return;
    }
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
    const step1 = setTimeout(() => {}, 800);
    const step2 = setTimeout(() => {}, 1600);
    const finish = setTimeout(() => setIsBufferingStream(false), 2400);
    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(finish);
    };
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
    <main className="flex-grow lg:pl-64 pb-16 w-full max-w-6xl mx-auto overflow-x-hidden">

      {/* ═══════════════════════════════════════════════
          TOP AD STRIP — exactly like reference image
          Small banner above video player
      ═══════════════════════════════════════════════ */}
      <div className="w-full px-3 md:px-6 pt-2">
        <AdBanner position="banner_top" title="Featured Sponsor" />
        {/* Fallback compact ad strip if no campaign configured */}
        <div className="w-full bg-[#111114] border border-white/8 rounded-lg px-3 py-2 flex items-center justify-between text-xs mb-2"
          style={{ display: 'none' }} id="top-ad-fallback">
          <span className="text-white/50 font-bold">AD</span>
          <span className="text-white font-semibold">Featured Partner – Visit Now</span>
          <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded">AD</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          VIDEO PLAYER — Full width, no padding on mobile
      ═══════════════════════════════════════════════ */}
      <section className="player-wrapper video-player-container relative flex items-center justify-center border-y border-white/10 overflow-hidden">
        {/* Buffering spinner */}
        {isBufferingStream ? (
          <div className="absolute inset-0 bg-black video-loading-screen z-30 flex items-center justify-center">
            <svg className="w-12 h-12 animate-spin text-white" viewBox="0 0 100 100" fill="currentColor">
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
      </section>

      {/* ═══════════════════════════════════════════════
          VIDEO INFO SECTION — Reference layout below player
      ═══════════════════════════════════════════════ */}
      <div className="px-3 md:px-6 py-3 flex flex-col gap-0 overflow-hidden">

        {/* Video Title */}
        <h1 className="text-base md:text-xl font-extrabold text-white tracking-tight leading-snug break-words mb-2">
          {video.title}
        </h1>

        {/* Views, Duration, Rating row */}
        <div className="flex items-center gap-3 text-xs text-white/60 mb-3 flex-wrap">
          <span className="font-bold text-white/80">
            {currentViewsCount.toLocaleString()} {currentViewsCount === 1 ? 'view' : 'views'}
          </span>
          <span className="text-white/30">•</span>
          <span className="font-mono font-bold text-rose-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">schedule</span>
            {video.duration || '05:00'}
          </span>
          {video.rating && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-emerald-400 font-bold">👍 {video.rating}</span>
            </>
          )}
          <span className="ml-auto bg-white/10 text-white/70 text-[10px] font-black px-2 py-0.5 rounded border border-white/10">
            {video.quality || 'HD'}
          </span>
        </div>

        {/* ─────────────────────────────────────────────
            REFERENCE LAYOUT INFO BLOCK
            (White background style like reference image)
        ───────────────────────────────────────────── */}
        <div className="bg-[#0e0e11] border border-white/8 rounded-xl overflow-hidden mb-3">

          {/* Source site — "Watch full video at [Site]" */}
          {sourceSiteDomain && (
            <div className="px-4 py-3 border-b border-white/8 text-sm">
              <span className="text-white/70">Watch full video at </span>
              {video.sourceWebsiteUrl ? (
                <a
                  href={video.sourceWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-400 font-bold hover:underline hover:text-rose-300 transition-colors"
                >
                  {sourceSiteDomain}
                </a>
              ) : (
                <span className="text-rose-400 font-bold">{sourceSiteDomain}</span>
              )}
            </div>
          )}

          {/* Channel by Website */}
          {(video.channelName || video.sourceWebsite) && (
            <div className="px-4 py-3 border-b border-white/8 text-sm">
              {video.channelName && (
                <>
                  <span className="text-white/70">Channel: </span>
                  <span className="text-rose-400 font-bold">{video.channelName}</span>
                </>
              )}
              {video.channelName && video.sourceWebsite && (
                <span className="text-white/70"> by </span>
              )}
              {video.sourceWebsite && (
                video.sourceWebsiteUrl ? (
                  <a
                    href={video.sourceWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-400 font-bold hover:underline hover:text-rose-300 transition-colors"
                  >
                    {video.sourceWebsite}
                  </a>
                ) : (
                  <span className="text-rose-400 font-bold">{video.sourceWebsite}</span>
                )
              )}
            </div>
          )}

          {/* Performers / Stars */}
          {performersList.length > 0 && (
            <div className="px-4 py-3 border-b border-white/8 text-sm flex flex-wrap gap-1 items-center">
              <span className="text-white/70 mr-1 shrink-0">
                {performersList.length === 1 ? 'Pornstar:' : 'Pornstars:'}
              </span>
              {performersList.map((performer, idx) => (
                <span key={idx} className="inline-flex items-center">
                  <span className="text-rose-400 font-bold hover:underline cursor-pointer hover:text-rose-300 transition-colors">
                    {performer}
                  </span>
                  {idx < performersList.length - 1 && (
                    <span className="text-white/40 mr-1">,</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="px-4 py-3 flex flex-wrap gap-2 items-start">
              <span className="text-white/70 text-sm shrink-0 mt-0.5">Tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {video.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-white/70 hover:text-rose-300 px-2.5 py-1 rounded-full cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[11px] text-white/40">label</span>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────
            ACTION BUTTONS ROW
        ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md border ${
              isLiked
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-[#282830] hover:bg-[#32323d] text-white border-white/10'
            }`}
          >
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
            >
              thumb_up
            </span>
            <span>{likeCount.toLocaleString()}</span>
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md border ${
              isSaved
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-[#282830] hover:bg-[#32323d] text-white border-white/10'
            }`}
          >
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
            >
              bookmark
            </span>
            <span>Save</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#282830] hover:bg-[#32323d] text-white border border-white/10 transition-all cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            <span>Share</span>
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-sm">flag</span>
            <span>Report</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════
            BOTTOM AD STRIP — same size as top ad
            Placed right after tags, before recommended
        ═══════════════════════════════════════════════ */}
        <AdBanner position="banner_bottom" title="Featured Partner Sponsor" />

        {/* ─────────────────────────────────────────────
            RECOMMENDED VIDEOS
        ───────────────────────────────────────────── */}
        <div className="mt-4 mb-6">
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
        <div className="mt-4 pt-4 border-t border-white/10">
          <CommentsSection
            videoId={video.id}
            userEmail={userEmail}
            onOpenSoftLogin={onOpenSoftLogin}
          />
        </div>
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
