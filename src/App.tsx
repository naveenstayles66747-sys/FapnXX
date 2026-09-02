import { useState, useEffect, useCallback, useRef, lazy, Suspense, startTransition } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { CategoryId, CategoryInfo, ContentPreference, LandingBanner, ScreenId, Video } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileDrawer } from './components/MobileDrawer';
import { BottomNav } from './components/BottomNav';
import { AgeGateModal } from './components/AgeGateModal';
import {
  StickyBottomLeaderboard,
  MobileInstantMessage,
  DesktopFullpageInterstitial,
  MobileFullpageInterstitial,
} from './components/AdSpaces';
import { adManager, refreshExoClickAds } from './utils/adManager';
import { BrowseScreen } from './components/BrowseScreen';
import { SiteFooter } from './components/SiteFooter';
import { TopLoadingBar } from './components/TopLoadingBar';
import { SkeletonGrid } from './components/SkeletonGrid';

// Code-split heavy secondary screens & modals to minimize initial JS payload and optimize FCP/LCP/INP
const CategoriesScreen = lazy(() => import('./components/CategoriesScreen').then(m => ({ default: m.CategoriesScreen })));
const CategoryDetailScreen = lazy(() => import('./components/CategoryDetailScreen').then(m => ({ default: m.CategoryDetailScreen })));
const PerformersScreen = lazy(() => import('./components/PerformersScreen').then(m => ({ default: m.PerformersScreen })));
const VideoDetailScreen = lazy(() => import('./components/VideoDetailScreen').then(m => ({ default: m.VideoDetailScreen })));
const SignInScreen = lazy(() => import('./components/SignInScreen').then(m => ({ default: m.SignInScreen })));

const UploadModal = lazy(() => import('./components/UploadModal').then(m => ({ default: m.UploadModal })));
const AdManagementModal = lazy(() => import('./components/AdManagementModal').then(m => ({ default: m.AdManagementModal })));
const AdminPanelModal = lazy(() => import('./components/AdminPanelModal').then(m => ({ default: m.AdminPanelModal })));
const SoftLoginModal = lazy(() => import('./components/SoftLoginModal').then(m => ({ default: m.SoftLoginModal })));
import { CATEGORIES, INITIAL_LANDING_BANNERS, VIDEOS } from './data';
import { deduplicateVideos } from './utils/videoDeduplicator';
import { videoService } from './services/videoService';
import { auth } from './services/firebaseConfig';
import { onAuthStateChanged, onIdTokenChanged, signOut } from 'firebase/auth';
import {
  getStoredAgeVerified,
  ThemeMode,
  getInitialThemeMode,
  setStoredThemeMode,
  getStoredContentPreference,
  setStoredContentPreference,
  registerUserInteractionSync,
  mergeUserInteractions,
  getStoredCachedVideos,
  setStoredCachedVideos,
  getStoredCachedBanners,
  setStoredCachedBanners,
} from './utils/storage';
import { usePrivacyStorage } from './hooks/usePrivacyStorage';
import { stopAllBackgroundMedia } from './utils/mediaHelper';

export default function App() {
  const { isAgeVerified, confirmAge, declineAge } = usePrivacyStorage();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('browse');
  const [selectedCategoryId, setSelectedCategoryId] = useState<CategoryId>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Theme Mode State (Auto time-based default: 6 AM - 6 PM Light, 6 PM - 6 AM Dark, + Manual toggle & localStorage)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialThemeMode());

  // Sync theme class on <html> document root for Tailwind CSS and styling overrides
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    setStoredThemeMode(themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Content Preference State (Straight / Gay / Lesbian — persisted in localStorage)
  const [contentPreference, setContentPreference] = useState<ContentPreference>(() => getStoredContentPreference());

  const handleChangeContentPreference = (pref: ContentPreference) => {
    setContentPreference(pref);
    setStoredContentPreference(pref);
  };

  // Soft Login Modal State for Optional Guest Conversion
  const [isSoftLoginModalOpen, setIsSoftLoginModalOpen] = useState<boolean>(false);
  const [softLoginFeatureName, setSoftLoginFeatureName] = useState<string>('Personal Account Sync');

  // System Core Dynamic Data State (Loaded from Service Layer / Firestore DB with Instant Cache)
  const [categories, setCategories] = useState<CategoryInfo[]>(CATEGORIES);
  const [videosList, setVideosList] = useState<Video[]>(() => {
    const cached = getStoredCachedVideos();
    if (cached && cached.length >= VIDEOS.length) {
      return deduplicateVideos(cached);
    }
    return deduplicateVideos(VIDEOS);
  });
  const [banners, setBanners] = useState<LandingBanner[]>(() => {
    const cached = getStoredCachedBanners();
    return cached.length > 0 ? cached : INITIAL_LANDING_BANNERS;
  });

  const [browseSortBy, setBrowseSortBy] = useState<'latest' | 'most_popular' | 'top_rated'>('latest');
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);

  const triggerPageTransition = useCallback(() => {
    setIsPageLoading(true);
    const t = setTimeout(() => {
      setIsPageLoading(false);
    }, 280);
    return () => clearTimeout(t);
  }, []);

  // Main feed catalog: Serves all 1,950+ curated videos across all categories without duplicates
  const filteredVideosList = deduplicateVideos((videosList && videosList.length >= VIDEOS.length) ? videosList : VIDEOS);

  // Real Firebase Auth & Custom Claims Observer
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Observe real-time Firebase Auth token changes and verify staff/admin custom claims
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const identifier = user.email || user.phoneNumber || user.uid;
        setUserEmail(identifier);
        try {
          // Force fresh token to accurately read any newly assigned custom claims
          const idTokenResult = await user.getIdTokenResult(true);
          const claims = idTokenResult.claims;
          const isStaff =
            claims.role === 'SUPER_ADMIN' ||
            claims.role === 'ADMIN' ||
            claims.role === 'MODERATOR' ||
            claims.role === 'EDITOR' ||
            claims.admin === true ||
            claims.moderator === true ||
            (user.email && user.email.toLowerCase() === 'naveenstayles66747@gmail.com');
          setIsAdminAuthenticated(Boolean(isStaff));
        } catch {
          setIsAdminAuthenticated(false);
        }

        // Fetch logged-in user cloud interactions for auth.currentUser.uid and merge
        videoService.fetchUserInteractionsFromFirestore().then((interactions) => {
          if (interactions) {
            const merged = mergeUserInteractions(interactions);
            if (merged.contentPreference) {
              setContentPreference(merged.contentPreference as ContentPreference);
            }
          }
        });
      } else {
        setUserEmail(null);
        setIsAdminAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Complete Firebase and local session sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[Auth] Sign-out notice:', err);
    }
    setUserEmail(null);
    setIsAdminAuthenticated(false);
  };

  const handleAdminLogout = async () => {
    await handleSignOut();
  };

  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Upload and Ad Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState<boolean>(false);

  // Initial load & real-time subscription from Video Service (Firestore / API Layer)
  useEffect(() => {
    if (!isAgeVerified) return;

    videoService.fetchVideos().then((v) => {
      if (v && Array.isArray(v) && v.length > 0) {
        const unique = deduplicateVideos(v);
        setVideosList(unique);
        setStoredCachedVideos(unique);
      }
    });

    // Real-time listener for views, likes, and video updates across all users worldwide
    const unsubscribe = videoService.subscribeToVideos((updatedVideos) => {
      if (updatedVideos && updatedVideos.length > 0) {
        const unique = deduplicateVideos(updatedVideos);
        setVideosList(unique);
        setStoredCachedVideos(unique);
        setSelectedVideo((prev) => {
          if (!prev) return prev;
          const matched = unique.find((v) => v.id === prev.id);
          return matched || prev;
        });
      }
    });

    const unsubscribeBanners = videoService.subscribeToBanners((updatedBanners) => {
      if (updatedBanners && updatedBanners.length > 0) {
        setBanners(updatedBanners);
        setStoredCachedBanners(updatedBanners);
      }
    });

    const unsubscribeCategories = videoService.subscribeToCategories((updatedCats) => {
      if (updatedCats && updatedCats.length > 0) {
        setCategories(updatedCats);
      }
    });

    videoService.fetchCategories().then((c) => {
      if (c && c.length > 0) setCategories(c);
    });
    videoService.fetchBanners().then((b) => {
      if (b && b.length > 0) {
        setBanners(b);
        setStoredCachedBanners(b);
      }
    });

    // Fetch user cloud interactions and merge with local state (union without data loss)
    videoService.fetchUserInteractionsFromFirestore().then((interactions) => {
      if (interactions) {
        const merged = mergeUserInteractions(interactions);
        if (merged.contentPreference) {
          setContentPreference(merged.contentPreference as ContentPreference);
        }
      }
    });

    // Register live cloud syncing for any interaction (saved, liked, history)
    const unregisterSync = registerUserInteractionSync((data) => {
      videoService.syncUserInteractionsToFirestore(data);
    });

    return () => {
      unsubscribe();
      unsubscribeBanners();
      if (unsubscribeCategories) unsubscribeCategories();
      unregisterSync();
    };
  }, [isAgeVerified]);

  // URL Helper to keep history push state synchronized for direct sharing & back/forward buttons
  const syncUrlWithState = useCallback((screen: ScreenId, videoId?: string, catId?: CategoryId) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('v');
      url.searchParams.delete('cat');
      url.searchParams.delete('s');

      if (screen === 'video-detail' && videoId) {
        url.searchParams.set('v', videoId);
      } else if (screen === 'category-detail' && catId) {
        url.searchParams.set('cat', catId);
      } else if (screen !== 'browse') {
        url.searchParams.set('s', screen);
      }

      window.history.pushState({ screen, videoId, catId }, '', url.pathname + url.search);
    } catch {
      // Fallback
    }
  }, []);

  // Stable ref to always-fresh videosList — avoids stale closure without re-creating the callback on every update
  const videosListRef = useRef(videosList);
  useEffect(() => {
    videosListRef.current = videosList;
  }, [videosList]);

  // Parse URL search params on mount and on window popstate
  const parseUrlRoute = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const vId = params.get('v');
      const catId = params.get('cat');
      const screenParam = params.get('s') as ScreenId | null;

      if (vId) {
        // Use ref so we always read the latest list without re-creating this callback
        const found = videosListRef.current.find((v) => v.id === vId);
        if (found) {
          setSelectedVideo(found);
          setCurrentScreen('video-detail');
          return;
        } else {
          // If not in state yet, search in videoService or INITIAL_VIDEOS fallback
          videoService.fetchVideos().then((allVids) => {
            const matched = allVids.find((v) => v.id === vId) || VIDEOS.find((v) => v.id === vId);
            if (matched) {
              setSelectedVideo(matched);
              setCurrentScreen('video-detail');
            } else {
              setCurrentScreen('browse');
              syncUrlWithState('browse');
            }
          });
          return;
        }
      }

      if (catId) {
        setSelectedCategoryId(catId as CategoryId);
        setCurrentScreen('category-detail');
        return;
      }

      if (screenParam) {
        setCurrentScreen(screenParam);
        return;
      }

      setCurrentScreen('browse');
    } catch {
      setCurrentScreen('browse');
    }
  // Stable: only depends on syncUrlWithState (no videosList — use ref instead)
  }, [syncUrlWithState]);

  // On Initial Mount & Popstate Listener (Browser Back / Forward button) — registers only ONCE
  useEffect(() => {
    parseUrlRoute();

    const handlePopState = () => {
      parseUrlRoute();
      adManager.recordEligibleTransition('popstate_back');
      refreshExoClickAds('browser_back_button');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseUrlRoute]);

  // ESC Key Modal Listener for non-intrusive modal dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsUploadModalOpen(false);
        setIsAdModalOpen(false);
        setIsAdminModalOpen(false);
        setIsSoftLoginModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Automated ExoClick Ad Refresh on every Screen / Video / Category transition (Post-DOM Mount)
  useEffect(() => {
    const t = setTimeout(() => {
      refreshExoClickAds(`screen_${currentScreen}_${selectedVideo?.id || selectedCategoryId}`);
    }, 100);

    return () => {
      clearTimeout(t);
    };
  }, [currentScreen, selectedVideo?.id, selectedCategoryId]);

  const handleOpenSoftLogin = (featureName?: string) => {
    if (featureName) setSoftLoginFeatureName(featureName);
    setIsSoftLoginModalOpen(true);
  };

  // Admin Handlers - Categories
  const handleAddCategory = (newCat: CategoryInfo) => {
    setCategories((prev) => [...prev, newCat]);
    videoService.saveCategory(newCat);
  };

  const handleUpdateCategory = (updatedCat: CategoryInfo) => {
    setCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
    videoService.saveCategory(updatedCat);
  };

  const handleDeleteCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    videoService.deleteCategory(catId);
  };

  // Admin Handlers - Videos & Media Assets
  const handleUpdateVideo = (updatedVideo: Video) => {
    setVideosList((prev) => prev.map((v) => (v.id === updatedVideo.id ? updatedVideo : v)));
    videoService.updateVideo(updatedVideo);
    if (selectedVideo && selectedVideo.id === updatedVideo.id) {
      setSelectedVideo(updatedVideo);
    }
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideosList((prev) => prev.filter((v) => v.id !== videoId));
    videoService.deleteVideo(videoId);
    if (selectedVideo && selectedVideo.id === videoId) {
      setSelectedVideo(null);
      setCurrentScreen('browse');
      syncUrlWithState('browse');
    }
  };

  // Admin Handlers - Banners
  const handleAddBanner = (newBanner: LandingBanner) => {
    setBanners((prev) => [newBanner, ...prev]);
    videoService.saveBanner(newBanner);
  };

  const handleUpdateBanner = (updatedBanner: LandingBanner) => {
    setBanners((prev) => prev.map((b) => (b.id === updatedBanner.id ? updatedBanner : b)));
    videoService.saveBanner(updatedBanner);
  };

  const handleDeleteBanner = (bannerId: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
    videoService.deleteBanner(bannerId);
  };

  const handleUploadSuccess = (newVideo: Video) => {
    setVideosList((prev) => [newVideo, ...prev]);
    videoService.saveVideo(newVideo);
    startTransition(() => {
      setSelectedVideo(newVideo);
      setCurrentScreen('video-detail');
    });
    syncUrlWithState('video-detail', newVideo.id);
    window.scrollTo(0, 0);
  };

  const handleVideoUpdated = useCallback((vId: string, updates: Partial<Video>) => {
    setVideosList((prev) =>
      prev.map((v) => (v.id === vId ? { ...v, ...updates } : v))
    );
    setSelectedVideo((prev) => (prev && prev.id === vId ? { ...prev, ...updates } : prev));
  }, []);

  const handleSelectVideo = (video: Video) => {
    triggerPageTransition();
    // Increment transition ONLY if target is distinct from current video
    adManager.recordEligibleTransition(video.id, selectedVideo?.id);
    // Request interstitial (checks eligibility & dispatches event if ready)
    adManager.requestInterstitial('video_select');

    // Force stop any currently playing ad audio/video
    stopAllBackgroundMedia();
    refreshExoClickAds(`video_${video.id}`);

    startTransition(() => {
      setSelectedVideo(video);
      setCurrentScreen('video-detail');
    });
    syncUrlWithState('video-detail', video.id);
    window.scrollTo(0, 0);
  };

  const handleSelectCategory = (id: CategoryId) => {
    triggerPageTransition();
    adManager.recordEligibleTransition(id, selectedCategoryId);
    adManager.requestInterstitial('category_select');

    // Force stop any currently playing ad audio/video
    stopAllBackgroundMedia();
    refreshExoClickAds(`category_${id}`);

    startTransition(() => {
      setSelectedCategoryId(id);
      if (id === 'all') {
        setCurrentScreen('browse');
      } else {
        setCurrentScreen('category-detail');
      }
    });
    if (id === 'all') {
      syncUrlWithState('browse');
    } else {
      syncUrlWithState('category-detail', undefined, id);
    }
    window.scrollTo(0, 0);
  };

  const handleNavigateToSearch = (query: string) => {
    triggerPageTransition();
    // Force stop any currently playing ad audio/video
    stopAllBackgroundMedia();
    adManager.recordEligibleTransition('search_query');
    refreshExoClickAds('search_navigation');

    startTransition(() => {
      setSelectedCategoryId('all');
      setSearchQuery(query);
      setCurrentScreen('browse');
    });
    syncUrlWithState('browse');
    window.scrollTo(0, 0);
  };

  const handleLogoClick = () => {
    triggerPageTransition();
    stopAllBackgroundMedia();
    adManager.recordEligibleTransition('browse_logo', currentScreen);
    refreshExoClickAds('navigate_logo_home');

    startTransition(() => {
      setSelectedCategoryId('all');
      setSearchQuery('');
      setSelectedVideo(null);
      setContentPreference('straight');
      setCurrentScreen('browse');
    });
    syncUrlWithState('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (screen: ScreenId) => {
    triggerPageTransition();
    // Force stop any currently playing ad audio/video
    stopAllBackgroundMedia();
    adManager.recordEligibleTransition(screen, currentScreen);
    refreshExoClickAds(`navigate_${screen}`);

    startTransition(() => {
      if (screen === 'browse') {
        setSelectedCategoryId('all');
        setSearchQuery('');
        setSelectedVideo(null);
        setContentPreference('straight');
      }
      setCurrentScreen(screen);
    });
    syncUrlWithState(screen);
    // Instant scroll to top — like a fresh page load
    window.scrollTo(0, 0);
  };

  // Listen for global reset-to-home events (e.g. from SiteFooter logo)
  useEffect(() => {
    const handleResetHomeEvent = () => {
      handleLogoClick();
    };
    window.addEventListener('fapn-reset-home', handleResetHomeEvent);
    return () => window.removeEventListener('fapn-reset-home', handleResetHomeEvent);
  }, []);

  if (!isAgeVerified) {
    return (
      <AgeGateModal
        onConfirm={confirmAge}
        onDecline={declineAge}
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-[#09090b] text-[#e5e1e4] flex flex-col font-['Inter',sans-serif] relative overflow-x-hidden">
      {/* Sleek YouTube-Style Glowing Top Navigation Progress Bar */}
      <TopLoadingBar isLoading={isPageLoading} />

      {/* Admin Panel Modal (Loaded Lazily on Demand) */}
      {isAdminModalOpen && (
        <Suspense fallback={null}>
          <AdminPanelModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            isAdminAuthenticated={isAdminAuthenticated}
            onAdminLogin={() => {
              // No-op: admin auth state is set exclusively by Firebase onIdTokenChanged observer.
              // The modal's sign-in flow triggers a Firebase auth state change that propagates here automatically.
            }}
            onAdminLogout={handleAdminLogout}
            categories={categories}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            videos={videosList}
            onUpdateVideo={handleUpdateVideo}
            onDeleteVideo={handleDeleteVideo}
            onUploadVideoSuccess={handleUploadSuccess}
            banners={banners}
            onAddBanner={handleAddBanner}
            onUpdateBanner={handleUpdateBanner}
            onDeleteBanner={handleDeleteBanner}
          />
        </Suspense>
      )}

      {/* Upload Modal with RBAC Protection (Loaded Lazily on Demand) */}
      {isUploadModalOpen && (
        <Suspense fallback={null}>
          <UploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadSuccess={handleUploadSuccess}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminAuth={() => setIsAdminModalOpen(true)}
            categories={categories}
          />
        </Suspense>
      )}

      {/* Ad Management Modal (Loaded Lazily on Demand) */}
      {isAdModalOpen && (
        <Suspense fallback={null}>
          <AdManagementModal
            isOpen={isAdModalOpen}
            onClose={() => setIsAdModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Soft Optional Login Modal for Guest Feature Discovery (Loaded Lazily on Demand) */}
      {isSoftLoginModalOpen && (
        <Suspense fallback={null}>
          <SoftLoginModal
            isOpen={isSoftLoginModalOpen}
            onClose={() => setIsSoftLoginModalOpen(false)}
            onSignIn={() => handleNavigate('signin')}
            featureName={softLoginFeatureName}
          />
        </Suspense>
      )}

      {/* Main App Layout - Open Access without Forced Auth */}
      {currentScreen !== 'signin' && (
        <>
          <Header
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onLogoClick={handleLogoClick}
            isMobileDrawerOpen={isMobileDrawerOpen}
            onToggleMobileDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
            onOpenSearch={() => {
              if (currentScreen !== 'browse') {
                setCurrentScreen('browse');
                syncUrlWithState('browse');
              }
              setSelectedCategoryId('all');
            }}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onOpenAds={() => setIsAdModalOpen(true)}
            onOpenAdminPanel={() => setIsAdminModalOpen(true)}
            isAdminAuthenticated={isAdminAuthenticated}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            userEmail={userEmail}
            onSignOut={handleSignOut}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            contentPreference={contentPreference}
            onChangeContentPreference={handleChangeContentPreference}
            videos={filteredVideosList}
          />

          <MobileDrawer
            isOpen={isMobileDrawerOpen}
            onClose={() => setIsMobileDrawerOpen(false)}
            onSelectCategory={handleSelectCategory}
            onNavigate={handleNavigate}
            onSelectSort={(sort) => {
              setBrowseSortBy(sort);
              setSelectedCategoryId('all');
              setCurrentScreen('browse');
            }}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onOpenAds={() => setIsAdModalOpen(true)}
            onOpenAdminPanel={() => setIsAdminModalOpen(true)}
            isAdminAuthenticated={isAdminAuthenticated}
            categories={categories}
            userEmail={userEmail}
            onSignOut={handleSignOut}
            onOpenSoftLogin={handleOpenSoftLogin}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            contentPreference={contentPreference}
            onChangeContentPreference={handleChangeContentPreference}
          />

          <div className="flex flex-1 min-h-[calc(100vh-5rem)]">
            <Sidebar
              currentScreen={currentScreen}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
              onNavigate={handleNavigate}
              categories={categories}
              onOpenAdminPanel={() => setIsAdminModalOpen(true)}
              isAdminAuthenticated={isAdminAuthenticated}
              userEmail={userEmail}
              onOpenSoftLogin={handleOpenSoftLogin}
            />

            {/* Screen Router with Smooth Micro-Transitions */}
            <div
              key={`screen-${currentScreen}-${selectedVideo?.id || ''}-${selectedCategoryId || ''}`}
              className="flex-1 flex flex-col min-w-0 page-transition-enter"
            >
              {currentScreen === 'browse' && (
                <BrowseScreen
                  key={`browse-screen-${currentScreen}-${selectedCategoryId}-${searchQuery || 'all'}-${contentPreference}`}
                  onSelectVideo={handleSelectVideo}
                  onSelectCategory={handleSelectCategory}
                  selectedCategory={selectedCategoryId}
                  videos={filteredVideosList}
                  categories={categories}
                  banners={banners}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  sortBy={browseSortBy}
                  setSortBy={setBrowseSortBy}
                  contentPreference={contentPreference}
                  onChangeContentPreference={handleChangeContentPreference}
                />
              )}

              {currentScreen === 'categories' && (
                <Suspense fallback={<SkeletonGrid count={8} />}>
                  <CategoriesScreen
                    onSelectCategory={handleSelectCategory}
                    onNavigate={handleNavigate}
                    categories={categories}
                  />
                </Suspense>
              )}

              {currentScreen === 'category-detail' && (
                <Suspense fallback={<SkeletonGrid count={8} />}>
                  <CategoryDetailScreen
                    categoryId={selectedCategoryId}
                    onSelectVideo={handleSelectVideo}
                    onSelectCategory={handleSelectCategory}
                    videos={filteredVideosList}
                    categories={categories}
                    userEmail={userEmail}
                  />
                </Suspense>
              )}

              {currentScreen === 'performers' && (
                <Suspense fallback={<SkeletonGrid count={8} />}>
                  <PerformersScreen
                    videos={filteredVideosList}
                    onSelectVideo={handleSelectVideo}
                    onNavigateToSearch={handleNavigateToSearch}
                  />
                </Suspense>
              )}

              {currentScreen === 'video-detail' && (
                selectedVideo ? (
                  <Suspense fallback={<div className="flex-1 p-8 flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" /></div>}>
                    <VideoDetailScreen
                      key={`video-screen-${selectedVideo.id}`}
                      video={selectedVideo}
                      onBack={() => handleNavigate('browse')}
                      onSelectVideo={handleSelectVideo}
                      onNavigateToSearch={handleNavigateToSearch}
                      userEmail={userEmail}
                      onOpenSoftLogin={handleOpenSoftLogin}
                      videos={filteredVideosList}
                      onVideoUpdated={handleVideoUpdated}
                    />
                  </Suspense>
                ) : (
                  <BrowseScreen
                    onSelectVideo={handleSelectVideo}
                    onSelectCategory={handleSelectCategory}
                    selectedCategory={selectedCategoryId}
                    videos={filteredVideosList}
                    categories={categories}
                    banners={banners}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    contentPreference={contentPreference}
                    onChangeContentPreference={handleChangeContentPreference}
                  />
                )
              )}
            </div>
          </div>

          {/* ExoClick 728x90 Smart Sticky Bottom Leaderboard Ad (Desktop) */}
          <StickyBottomLeaderboard />

          {/* ExoClick Desktop Fullpage Interstitial Ad (Zone ID: 6003174) */}
          <DesktopFullpageInterstitial />

          {/* ExoClick Mobile Fullpage Interstitial Ad (Zone ID: 6003180) */}
          <MobileFullpageInterstitial />

          {/* ExoClick Mobile Instant Message Notification Ad (Zone ID: 6003178) */}
          <MobileInstantMessage />
        </>
      )}

      {currentScreen === 'signin' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#09090b]"><div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" /></div>}>
          <SignInScreen
            onSuccess={(email) => {
              setUserEmail(email);
              handleNavigate('browse');
            }}
            onBack={() => handleNavigate('browse')}
          />
        </Suspense>
      )}

      {/* Site Footer — DMCA, Legal, 18+ notice */}
      {currentScreen !== 'signin' && <SiteFooter />}

      {/* Mobile Bottom Navigation Bar (lg:hidden — replaces drawer on small screens) */}
      {currentScreen !== 'signin' && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
        />
      )}

      <SpeedInsights />
    </div>
  );
}
