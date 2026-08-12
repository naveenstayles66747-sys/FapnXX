import { useState, useEffect, useCallback } from 'react';
import { CategoryId, CategoryInfo, ContentPreference, LandingBanner, ScreenId, Video } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { MobileDrawer } from './components/MobileDrawer';
import { AgeGateModal } from './components/AgeGateModal';
import { BrowseScreen } from './components/BrowseScreen';
import { CategoriesScreen } from './components/CategoriesScreen';
import { CategoryDetailScreen } from './components/CategoryDetailScreen';
import { PerformersScreen } from './components/PerformersScreen';
import { VideoDetailScreen } from './components/VideoDetailScreen';
import { SignInScreen } from './components/SignInScreen';
import { UploadModal } from './components/UploadModal';
import { AdManagementModal } from './components/AdManagementModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { SoftLoginModal } from './components/SoftLoginModal';
import { VIDEOS } from './data';
import { videoService } from './services/videoService';
import {
  getStoredAgeVerified,
  getStoredBanners,
  getStoredCategories,
  getStoredVideos,
  setStoredBanners,
  setStoredCategories,
  setStoredVideos,
  ThemeMode,
  getInitialThemeMode,
  setStoredThemeMode,
  getStoredContentPreference,
  setStoredContentPreference,
} from './utils/storage';
import { usePrivacyStorage } from './hooks/usePrivacyStorage';

export default function App() {
  const { isAgeVerified, confirmAge, declineAge } = usePrivacyStorage();
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('browse');
  const [selectedCategoryId, setSelectedCategoryId] = useState<CategoryId>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  // System Core Dynamic Data State (Loaded from Service Layer / Firestore DB)
  const [categories, setCategories] = useState<CategoryInfo[]>(() => getStoredCategories());
  const [videosList, setVideosList] = useState<Video[]>(() => getStoredVideos());
  const [banners, setBanners] = useState<LandingBanner[]>(() => getStoredBanners());

  // Filtered videos based on content preference
  // Videos without an explicit orientation tag or if filter returns empty fallback to full list
  const preferredVideos = videosList.filter((v) => {
    if (!v) return false;
    if (!v.orientation) return true;
    return v.orientation === contentPreference;
  });
  const filteredVideosList = preferredVideos.length > 0 ? preferredVideos : videosList;

  // Admin Authentication & Modal State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Upload and Ad Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState<boolean>(false);

  // Initial load & real-time subscription from Video Service (Firestore / API Layer)
  useEffect(() => {
    if (!isAgeVerified) return;

    videoService.fetchVideos().then((v) => {
      if (v && Array.isArray(v) && v.length > 0) {
        setVideosList(v);
      } else {
        setVideosList(VIDEOS);
      }
    });

    // Real-time listener for views, likes, and video updates
    const unsubscribe = videoService.subscribeToVideos((updatedVideos) => {
      if (updatedVideos && updatedVideos.length > 0) {
        setVideosList(updatedVideos);
      }
    });

    videoService.fetchCategories().then((c) => {
      if (c && c.length > 0) setCategories(c);
    });
    videoService.fetchBanners().then((b) => {
      if (b && b.length > 0) setBanners(b);
    });

    return () => unsubscribe();
  }, [isAgeVerified]);

  // Synchronize localStorage when state changes
  useEffect(() => {
    setStoredCategories(categories);
  }, [categories]);

  useEffect(() => {
    setStoredVideos(videosList);
  }, [videosList]);

  useEffect(() => {
    setStoredBanners(banners);
  }, [banners]);

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

  // Parse URL search params on mount and on window popstate
  const parseUrlRoute = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const vId = params.get('v');
      const catId = params.get('cat');
      const screenParam = params.get('s') as ScreenId | null;

      if (vId) {
        const found = videosList.find((v) => v.id === vId);
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
  }, [videosList, syncUrlWithState]);

  // On Initial Mount & Popstate Listener
  useEffect(() => {
    parseUrlRoute();

    const handlePopState = () => {
      parseUrlRoute();
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
  };

  const handleUploadSuccess = (newVideo: Video) => {
    setVideosList((prev) => [newVideo, ...prev]);
    videoService.saveVideo(newVideo);
    setSelectedVideo(newVideo);
    setCurrentScreen('video-detail');
    syncUrlWithState('video-detail', newVideo.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
    setCurrentScreen('video-detail');
    syncUrlWithState('video-detail', video.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (id: CategoryId) => {
    setSelectedCategoryId(id);
    if (id === 'all') {
      setCurrentScreen('browse');
      syncUrlWithState('browse');
    } else {
      setCurrentScreen('category-detail');
      syncUrlWithState('category-detail', undefined, id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (screen: ScreenId) => {
    if (screen === 'browse') {
      setSelectedCategoryId('all');
      setSearchQuery('');
    }
    setCurrentScreen(screen);
    syncUrlWithState(screen);
    // Instant scroll to top — like a fresh page load
    window.scrollTo(0, 0);
  };

  if (!isAgeVerified) {
    return (
      <AgeGateModal
        onConfirm={confirmAge}
        onDecline={declineAge}
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#09090b] text-[#e5e1e4] flex flex-col font-['Inter',sans-serif] relative">

      {/* Admin Panel Modal */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogin={(email) => {
          setIsAdminAuthenticated(true);
          setUserEmail(email);
        }}
        onAdminLogout={() => setIsAdminAuthenticated(false)}
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

      {/* Upload Modal with RBAC Protection */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        isAdminAuthenticated={isAdminAuthenticated}
        onOpenAdminAuth={() => setIsAdminModalOpen(true)}
        categories={categories}
      />

      {/* Ad Management Modal */}
      <AdManagementModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
      />

      {/* Soft Optional Login Modal for Guest Feature Discovery */}
      <SoftLoginModal
        isOpen={isSoftLoginModalOpen}
        onClose={() => setIsSoftLoginModalOpen(false)}
        onSignIn={() => handleNavigate('signin')}
        featureName={softLoginFeatureName}
      />

      {/* Main App Layout - Open Access without Forced Auth */}
      {currentScreen !== 'signin' && (
        <>
          <Header
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            onToggleMobileDrawer={() => setIsMobileDrawerOpen(true)}
            onOpenSearch={() => handleNavigate('browse')}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onOpenAds={() => setIsAdModalOpen(true)}
            onOpenAdminPanel={() => setIsAdminModalOpen(true)}
            isAdminAuthenticated={isAdminAuthenticated}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            userEmail={userEmail}
            onSignOut={() => setUserEmail(null)}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            contentPreference={contentPreference}
            onChangeContentPreference={handleChangeContentPreference}
          />

          <MobileDrawer
            isOpen={isMobileDrawerOpen}
            onClose={() => setIsMobileDrawerOpen(false)}
            onSelectCategory={handleSelectCategory}
            onNavigate={handleNavigate}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onOpenAds={() => setIsAdModalOpen(true)}
            onOpenAdminPanel={() => setIsAdminModalOpen(true)}
            isAdminAuthenticated={isAdminAuthenticated}
            categories={categories}
            userEmail={userEmail}
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

            {/* Screen Router */}
            {currentScreen === 'browse' && (
              <BrowseScreen
                onSelectVideo={handleSelectVideo}
                onSelectCategory={handleSelectCategory}
                selectedCategory={selectedCategoryId}
                videos={filteredVideosList}
                categories={categories}
                banners={banners}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            )}

            {currentScreen === 'categories' && (
              <CategoriesScreen
                onSelectCategory={handleSelectCategory}
                onNavigate={handleNavigate}
                categories={categories}
              />
            )}

            {currentScreen === 'category-detail' && (
              <CategoryDetailScreen
                categoryId={selectedCategoryId}
                onSelectVideo={handleSelectVideo}
                onSelectCategory={handleSelectCategory}
                videos={filteredVideosList}
                categories={categories}
                userEmail={userEmail}
              />
            )}

            {currentScreen === 'performers' && <PerformersScreen />}

            {currentScreen === 'video-detail' && selectedVideo && (
              <VideoDetailScreen
                video={selectedVideo}
                onBack={() => handleNavigate('browse')}
                onSelectVideo={handleSelectVideo}
                userEmail={userEmail}
                onOpenSoftLogin={handleOpenSoftLogin}
                videos={filteredVideosList}
                onVideoUpdated={(vId, updates) => {
                  setVideosList((prev) =>
                    prev.map((v) => (v.id === vId ? { ...v, ...updates } : v))
                  );
                  setSelectedVideo((prev) => (prev && prev.id === vId ? { ...prev, ...updates } : prev));
                }}
              />
            )}
          </div>

          <BottomNav
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
          />
        </>
      )}

      {currentScreen === 'signin' && (
        <SignInScreen
          onSuccess={(email) => {
            setUserEmail(email);
            if (email.trim().toLowerCase() === 'naveenstayles66747@gmail.com') {
              setIsAdminModalOpen(true);
            }
            handleNavigate('browse');
          }}
          onBack={() => handleNavigate('browse')}
        />
      )}
    </div>
  );
}
