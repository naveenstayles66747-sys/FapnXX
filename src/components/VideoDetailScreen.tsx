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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(() =>
    typeof video.likesCount === 'number' ? video.likesCount : 1200
  );
  const [showShareNotification, setShowShareNotification] = useState(false);
  const [progressPercent, setProgressPercent] = useState(35);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // DRM & Tokenized playback state
  const [streamToken, setStreamToken] = useState<string | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  // DMCA Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState(false);

  // Real-time Views & Watch Time Counter
  const [currentViewsCount, setCurrentViewsCount] = useState<number>(() => video.viewsCount || 1);
  const [watchSeconds, setWatchSeconds] = useState<number>(0);
  const [hasIncrementedView, setHasIncrementedView] = useState<boolean>(false);
  const hasCountedRef = useRef<boolean>(false);

  // Initialize stream session token & liked/saved status
  useEffect(() => {
    setIsVerifyingToken(true);
    setStreamError(null);
    setStreamToken(`firebase_stream_${video.id}`);
    setIsVerifyingToken(false);

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

  // 5-second watch threshold timer to trigger real-time Firestore view increment
  useEffect(() => {
    hasCountedRef.current = false;
    setWatchSeconds(0);
    setHasIncrementedView(false);

    const timer = setInterval(() => {
      setWatchSeconds((prev) => {
        const next = prev + 1;
        if (next >= 5 && !hasCountedRef.current) {
          hasCountedRef.current = true;
          setHasIncrementedView(true);

          // Atomic Cloud Firestore + Local Cache View Count Increment
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
      if (onOpenSoftLogin) {
        onOpenSoftLogin('Cloud Bookmarks & Sync');
      }
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
    setTimeout(() => {
      setShowShareNotification(false);
    }, 3000);
  };

  const handleReportSubmitted = (report: DMCAReport) => {
    addStoredReport(report);
    setReportSuccessToast(true);
    setTimeout(() => setReportSuccessToast(false), 4000);
  };

  // Advanced Recommendation Engine - Calculate relevance score for related videos
  const relatedVideosWithScore = (videos || VIDEOS || [])
    .filter((v) => v && v.id !== video.id && !v.isTakenDown)
    .map((candidate) => {
      let matchScore = 50; // base match

      if (candidate.category === video.category) matchScore += 35;
      if (candidate.performerName === video.performerName) matchScore += 30;

      // Overlapping tags
      const candidateTags = candidate.tags || [];
      const videoTags = video.tags || [];
      const sharedTags = candidateTags.filter((tag) => videoTags.includes(tag));
      matchScore += sharedTags.length * 10;

      return {
        ...candidate,
        relevanceScore: Math.min(matchScore, 99),
      };
    });

  relatedVideosWithScore.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topRelatedVideos = relatedVideosWithScore.slice(0, 4);

  // Stream Loading & Buffering Simulation State (1 to 4 seconds)
  const [isBufferingStream, setIsBufferingStream] = useState<boolean>(true);
  const [bufferProgress, setBufferProgress] = useState<number>(0);
  const [bufferStatusText, setBufferStatusText] = useState<string>('Initializing Stream Request...');

  // Simulate 1 to 4 second stream initialization whenever selected video changes
  useEffect(() => {
    setIsBufferingStream(true);
    setBufferProgress(10);
    setBufferStatusText('Connecting to Encrypted CDN...');

    const step1 = setTimeout(() => {
      setBufferProgress(45);
      setBufferStatusText('Connecting to High-Speed CDN...');
    }, 800);

    const step2 = setTimeout(() => {
      setBufferProgress(85);
      setBufferStatusText('Buffering Stream Segments...');
    }, 1600);

    const finish = setTimeout(() => {
      setBufferProgress(100);
      setIsBufferingStream(false);
    }, 2400);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(finish);
    };
  }, [video.id]);

  return (
    <main className="flex-grow lg:pl-64 pb-12 w-full max-w-6xl mx-auto px-3 md:px-6 pt-2 overflow-x-hidden">
      {/* Video Player Theater Container: Responsive Iframe & Video Player Wrapper */}
      <section className="player-wrapper video-player-container relative flex items-center justify-center border border-white/10 overflow-hidden">
        {/* Stream Buffering Loader: Classic Dotted Circle Spinner on Pure Black Screen */}
        {isBufferingStream ? (
          <div className="absolute inset-0 bg-black video-loading-screen z-30 flex items-center justify-center">
            <svg
              className="w-12 h-12 animate-spin text-white"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
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

        {!isBufferingStream && (
          <FluidPlayerWrapper video={video} autoPlay={true} />
        )}
      </section>

      {/* Compact Video Details & Meta Section */}
      <div className="py-3 flex flex-col gap-2.5 overflow-hidden">
        {/* Title Heading */}
        <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight leading-snug break-words">
          {video.title}
        </h1>

        {/* Sub-row: Views & Creator Info on Left, Action Pill Buttons on Right */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-white/10">
          {/* Views, Duration & Creator Avatar Pill */}
          <div className="flex items-center gap-2.5 text-xs font-medium text-white/80 flex-wrap">
            <span className="font-bold text-white">
              {currentViewsCount.toLocaleString()} {currentViewsCount === 1 ? 'view' : 'views'}
            </span>
            <span className="text-white/30">|</span>
            <span className="font-mono font-bold text-rose-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              {video.duration || '05:00'}
            </span>
            <span className="text-white/30">|</span>
            <div className="flex items-center gap-2 bg-[#232328] px-3 py-1 rounded-full border border-white/10">
              <img
                src={video.performerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'}
                alt={video.performerName}
                className="w-4 h-4 rounded-full object-cover"
              />
              <span className="font-bold text-white text-xs">{video.performerName}</span>
              <span className="material-symbols-outlined text-rose-500 text-xs fill-1">check_circle</span>
            </div>
          </div>

          {/* Sleek Action Pill Buttons (Like, Save, Share) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
              <span>Like</span>
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
              title="Copy link to clipboard"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              <span>Share</span>
            </button>

            {/* Dedicated Report / Flag Video Button directly below player */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-md"
              title="Report broken stream, DMCA, or policy issue"
            >
              <span className="material-symbols-outlined text-sm">flag</span>
              <span>Report</span>
            </button>
          </div>
        </div>

        {/* Active Ad Space (Only renders when real ad campaign image/script is configured) */}
        <AdBanner position="banner_bottom" title="Featured Partner Sponsor" />

        {/* Recommended / More Like This Section (Immediately under Video Player) */}
        <div className="mt-4 mb-6">
          <h3 className="text-sm md:text-base font-extrabold text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-500 text-lg">grid_view</span>
            <span>Recommended Videos</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-3">
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

        {/* Real-Time Community Comments Section (Positioned at the Absolute Bottom above footer) */}
        <div className="mt-8 pt-4 border-t border-white/10">
          <CommentsSection
            videoId={video.id}
            userEmail={userEmail}
            onOpenSoftLogin={onOpenSoftLogin}
          />
        </div>
      </div>

      {/* DMCA / Content Moderation Report Modal */}
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
