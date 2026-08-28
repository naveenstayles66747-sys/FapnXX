import React, { useState, useEffect, useRef } from 'react';
import { DMCAReport, Video } from '../types';
import { VIDEOS } from '../data';
import { VideoCard } from './VideoCard';
import { ReportModal } from './ReportModal';
import { FluidPlayerWrapper } from './FluidPlayerWrapper';
import { OnStreamVideoBanner, OutstreamVideoCardAd, UnderPlayerBanner, NativeRecommendationAd } from './AdSpaces';
import { CommentsSection } from './CommentsSection';
import { useLanguage } from '../i18n/LanguageContext';
import { videoService } from '../services/videoService';
import { stopAllBackgroundMedia } from '../utils/mediaHelper';
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
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(() =>
    typeof video.likesCount === 'number' ? video.likesCount : 0
  );
  const [showShareNotification, setShowShareNotification] = useState(false);

  // DMCA Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState(false);

  // In-Video Player Overlay Banner State
  const [showOnStreamBanner, setShowOnStreamBanner] = useState(true);

  // Real-time Views Counter
  const [currentViewsCount, setCurrentViewsCount] = useState<number>(() => video.viewsCount || 1);
  const [watchSeconds, setWatchSeconds] = useState<number>(0);
  const hasCountedRef = useRef<boolean>(false);

  // Hard media killer when user leaves VideoDetailScreen (navigates back)
  useEffect(() => {
    return () => {
      stopAllBackgroundMedia();
    };
  }, []);

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

  // Keep latest onVideoUpdated callback in a ref to prevent infinite re-render loops
  const onVideoUpdatedRef = useRef(onVideoUpdated);
  useEffect(() => {
    onVideoUpdatedRef.current = onVideoUpdated;
  }, [onVideoUpdated]);

  // Real-time Firestore document listener for live view & like updates
  useEffect(() => {
    if (!video.id) return;
    const unsub = videoService.subscribeToSingleVideo(video.id, (fresh) => {
      if (typeof fresh.viewsCount === 'number') {
        setCurrentViewsCount(fresh.viewsCount);
      }
      if (typeof fresh.likesCount === 'number') {
        setLikeCount(fresh.likesCount);
      }
    });
    return () => unsub();
  }, [video.id]);

  // Logical YouTube-style View Increment Engine:
  // Requires 5 seconds of active watch time + 30-minute session cooldown per video
  useEffect(() => {
    hasCountedRef.current = false;
    setWatchSeconds(0);

    const checkAlreadyViewedInSession = (vId: string): boolean => {
      try {
        const key = `fapnxx_viewed_${vId}`;
        const val = sessionStorage.getItem(key);
        if (!val) return false;
        const timestamp = parseInt(val, 10);
        // 30-minute cooldown per video view
        return Date.now() - timestamp < 30 * 60 * 1000;
      } catch {
        return false;
      }
    };

    const markViewedInSession = (vId: string) => {
      try {
        sessionStorage.setItem(`fapnxx_viewed_${vId}`, Date.now().toString());
      } catch {}
    };

    // If already viewed recently in this session, don't count duplicate views
    if (checkAlreadyViewedInSession(video.id)) {
      hasCountedRef.current = true;
      return;
    }

    const timer = setInterval(() => {
      setWatchSeconds((prev) => {
        const next = prev + 1;
        // Count 1 view after 5 seconds of active viewing
        if (next >= 5 && !hasCountedRef.current) {
          hasCountedRef.current = true;
          markViewedInSession(video.id);

          videoService.incrementVideoViews(video.id).then((newViewsCount) => {
            setCurrentViewsCount(newViewsCount);
            if (onVideoUpdatedRef.current) {
              onVideoUpdatedRef.current(video.id, {
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

  const [likeToastMsg, setLikeToastMsg] = useState<string | null>(null);

  const handleLike = async () => {
    const nextLikedState = !isLiked;
    setIsLiked(nextLikedState);
    const newCount = Math.max(0, likeCount + (nextLikedState ? 1 : -1));
    setLikeCount(newCount);
    toggleStoredLikedVideo(video.id);

    setLikeToastMsg(nextLikedState ? 'Added to Liked Videos' : 'Removed from Liked Videos');
    setTimeout(() => setLikeToastMsg(null), 2500);

    const updatedLikes = await videoService.incrementVideoLikes(video.id, nextLikedState);
    if (typeof updatedLikes === 'number') {
      setLikeCount(updatedLikes);
      if (onVideoUpdated) {
        onVideoUpdated(video.id, { likesCount: updatedLikes });
      }
    }
    if (userEmail) {
      videoService.syncUserInteractionsToFirestore({ likedVideos: getStoredLikedVideos() });
    }
  };

  const handleSave = () => {
    toggleStoredSavedVideo(video.id);
    setIsSaved(!isSaved);
    if (userEmail) {
      videoService.syncUserInteractionsToFirestore({ savedVideos: getStoredSavedVideos() });
    }
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

  // Derive categories list
  const categoriesList: string[] = (() => {
    const list: string[] = [];
    if (video.category) {
      list.push(...video.category.split(',').map((c) => c.trim()).filter(Boolean));
    }
    if (Array.isArray((video as any).categories)) {
      list.push(...(video as any).categories);
    }
    return Array.from(new Set(list));
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
          <FluidPlayerWrapper key={`fluid-player-${video.id}`} video={video} autoPlay={true} />

          {/* On-Stream In-Video Player Overlay Banner (Zone ID: 6003172) */}
          <OnStreamVideoBanner
            isVisible={showOnStreamBanner}
            onClose={() => setShowOnStreamBanner(false)}
          />
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

        {/* 2. Stats & Actions Row: (Schedule) 05:00  [ThumbUp Rating %]  (Visibility) Views ... Actions */}
        <div className="flex items-center justify-between gap-3 text-xs font-semibold flex-wrap">
          {/* Left Stats Group */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Duration */}
            <span className="flex items-center gap-1.5 font-medium text-xs text-zinc-600 dark:text-zinc-400">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span>{video.duration || '05:00'}</span>
            </span>

            {/* Interactive Real Rating % & Like Button */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer select-none active:scale-95 border ${
                isLiked
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}
              title={isLiked ? 'Unlike video' : 'Like video'}
              aria-label={isLiked ? 'Unlike video' : 'Like video'}
            >
              <span
                className={`material-symbols-outlined text-base transition-transform duration-200 ${isLiked ? 'scale-110' : ''}`}
                style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
              >
                thumb_up
              </span>
              <span className="font-extrabold">
                {(() => {
                  if (likeCount === 0 && !isLiked) return '100%';
                  const views = currentViewsCount || 1;
                  const percent = Math.min(100, Math.max(1, Math.round((likeCount / views) * 100)));
                  return percent >= 5 ? `${percent}%` : isLiked ? '100%' : '98%';
                })()}
              </span>
              {likeCount > 0 && (
                <span className={`text-[10px] font-semibold opacity-90 ${isLiked ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  ({likeCount.toLocaleString()})
                </span>
              )}
            </button>

            {/* Views with eye icon */}
            <span className="flex items-center gap-1.5 font-medium text-xs text-zinc-600 dark:text-zinc-400">
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>{currentViewsCount.toLocaleString()}</span>
            </span>
          </div>

          {/* Right Action Icons (Share, Report) - removed duplicate right thumb */}
          <div className="flex items-center gap-3 sm:gap-4 text-zinc-700 dark:text-zinc-300 ml-auto">
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

        {/* 3. Unified Pornktube-Style Collapsible Info & Comments Card (Slim & Compact) */}
        {isInfoExpanded ? (
          <div className="rounded-2xl p-3.5 sm:p-4 border border-zinc-200 dark:border-white/10 bg-[#f8fafc] dark:bg-[#131217] text-zinc-900 dark:text-zinc-100 space-y-3.5 shadow-sm transition-all animate-fadeIn">
            {/* Categories Row */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Categories:</span>
              {categoriesList.length > 0 ? (
                categoriesList.map((cat, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onNavigateToSearch && onNavigateToSearch(cat)}
                    className="px-2.5 py-0.5 rounded-lg bg-zinc-200/80 hover:bg-[#ec4899] hover:text-white dark:bg-zinc-800 dark:hover:bg-[#ec4899] dark:hover:text-white text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    {cat}
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateToSearch && onNavigateToSearch(video.category || 'Featured')}
                  className="px-2.5 py-0.5 rounded-lg bg-zinc-200/80 hover:bg-[#ec4899] hover:text-white dark:bg-zinc-800 dark:hover:bg-[#ec4899] dark:hover:text-white text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-all cursor-pointer"
                >
                  {video.category || 'Featured'}
                </button>
              )}
            </div>

            {/* Pornstar Row */}
            {performersList.length > 0 && (
              <div className="text-xs font-medium flex items-center gap-2 flex-wrap">
                <span className="text-zinc-500 dark:text-zinc-400">Pornstar:</span>
                {performersList.map((p, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => onNavigateToSearch && onNavigateToSearch(p)}
                    className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold hover:underline hover:text-rose-500 transition-colors cursor-pointer bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20 active:scale-95 text-xs"
                    title={`View all videos of ${p}`}
                  >
                    <span className="material-symbols-outlined text-xs">star</span>
                    <span>{p}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Tags Row */}
            {video.tags && video.tags.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Tags:</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {video.tags.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onNavigateToSearch && onNavigateToSearch(tag)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-[#1a233a] hover:bg-[#ec4899] hover:text-white dark:hover:bg-[#ec4899] dark:hover:text-white text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-white/10 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xs text-zinc-400">tag</span>
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {video.description && (
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                {video.description}
              </p>
            )}

            {/* Source website attribution if present */}
            {sourceSiteDomain && (
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>Source: </span>
                <span className="text-rose-500 font-semibold">{sourceSiteDomain}</span>
              </div>
            )}

            {/* Integrated Simple Live Comments Section inside Show More */}
            <CommentsSection
              videoId={video.id}
              userEmail={userEmail}
              onOpenSoftLogin={onOpenSoftLogin}
            />

            {/* Slim Show Less Button */}
            <button
              type="button"
              onClick={() => setIsInfoExpanded(false)}
              className="w-full py-1.5 rounded-xl bg-zinc-200/80 hover:bg-zinc-300 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-98"
            >
              <span>Show less</span>
              <span className="material-symbols-outlined text-sm">expand_less</span>
            </button>
          </div>
        ) : (
          /* Slim Show More Button when collapsed */
          <button
            type="button"
            onClick={() => setIsInfoExpanded(true)}
            className="w-full py-1.5 sm:py-2 px-3 rounded-xl bg-zinc-200/70 hover:bg-zinc-300 dark:bg-[#1a191f] dark:hover:bg-[#25242b] border border-zinc-300/60 dark:border-white/10 text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
          >
            <span>Show more</span>
            <span className="material-symbols-outlined text-base">expand_more</span>
          </button>
        )}

        {/* Under-Player Responsive Ad Banner (Desktop 728x90: Zone 6010076 | Mobile 300x250: Zone 6010078) */}
        <UnderPlayerBanner key={`under-player-${video.id}`} reloadKey={video.id} />
      </div>

      {/* ─────────────────────────────────────────────
          RECOMMENDED VIDEOS — Direct Focus Below Player
      ───────────────────────────────────────────── */}
      <div className="px-3 sm:px-4 md:px-6 mt-3 mb-6">
        <h3 className="text-sm md:text-base font-extrabold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-500 text-lg">grid_view</span>
          <span>Recommended Videos</span>
        </h3>

        {/* Guaranteed Native Recommendation Widget (Zone: 6010176) */}
        <div className="w-full my-3">
          <NativeRecommendationAd key={`detail-native-rec-top-${video.id}`} reloadKey={video.id} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-5 gap-x-4 sm:gap-5">
          {(topRelatedVideos || []).map((relatedVideo, idx) => (
            <React.Fragment key={relatedVideo.id}>
              <div className="relative group">
                <VideoCard
                  video={relatedVideo}
                  onClick={() => onSelectVideo(relatedVideo)}
                />
              </div>

              {/* Native Recommendation Widget in-between related videos grid (After 4th video) */}
              {idx === 3 && (
                <div key={`detail-native-recommended-in-grid-${video.id}`} className="col-span-full my-3">
                  <NativeRecommendationAd key={`native-rec-grid-${video.id}`} reloadKey={video.id} />
                </div>
              )}

              {/* Outstream Video Card Ad (After 7th video) */}
              {idx === 7 && (
                <div key={`detail-outstream-in-grid-${video.id}`} className="col-span-1">
                  <OutstreamVideoCardAd key={`outstream-rec-${video.id}`} reloadKey={video.id} />
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Guaranteed Outstream Video placement if between 4 and 8 related videos */}
          {topRelatedVideos && topRelatedVideos.length >= 4 && topRelatedVideos.length < 8 && (
            <div key={`detail-outstream-fallback-${video.id}`} className="col-span-1">
              <OutstreamVideoCardAd key={`outstream-fallback-${video.id}`} reloadKey={video.id} />
            </div>
          )}
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
      {likeToastMsg && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2.5 bg-rose-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-rose-400/40 font-bold text-xs tracking-wide animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span
            className="material-symbols-outlined text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            thumb_up
          </span>
          <span>{likeToastMsg}</span>
        </div>
      )}

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
