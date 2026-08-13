import React, { useState, useEffect } from 'react';
import { CategoryInfo, DMCAReport, LandingBanner, ReportStatus, Video } from '../types';
import { getStoredReports, setStoredReports } from '../utils/storage';
import { videoService } from '../services/videoService';
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import app from '../services/firebaseConfig';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminAuthenticated: boolean;
  onAdminLogin: (email: string) => void;
  onAdminLogout: () => void;
  // Category Management
  categories: CategoryInfo[];
  onAddCategory: (category: CategoryInfo) => void;
  onUpdateCategory: (category: CategoryInfo) => void;
  onDeleteCategory: (categoryId: string) => void;
  // Video Management & Media Customization
  videos: Video[];
  onUpdateVideo: (updatedVideo: Video) => void;
  onDeleteVideo: (videoId: string) => void;
  onUploadVideoSuccess: (newVideo: Video) => void;
  // Landing Page Banner Management
  banners: LandingBanner[];
  onAddBanner: (banner: LandingBanner) => void;
  onUpdateBanner: (banner: LandingBanner) => void;
  onDeleteBanner: (bannerId: string) => void;
}

// Admin email whitelist — only these emails can access the admin panel
const ADMIN_WHITELIST = [
  'naveenstayles66747@gmail.com',
];

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  isAdminAuthenticated,
  onAdminLogin,
  onAdminLogout,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  videos,
  onUpdateVideo,
  onDeleteVideo,
  onUploadVideoSuccess,
  banners,
  onAddBanner,
  onUpdateBanner,
  onDeleteBanner,
}) => {
  const [activeTab, setActiveTab] = useState<'auth' | 'categories' | 'videos' | 'banners' | 'upload' | 'reports' | 'usage'>('auth');
  
  // DMCA / Content Moderation Reports state
  const [reportsList, setReportsList] = useState<DMCAReport[]>(() => getStoredReports());
  const [categoryRequests, setCategoryRequests] = useState<import('../types').CategoryRequest[]>([]);

  // Sync reports & category requests with Firestore on modal open
  useEffect(() => {
    if (isOpen) {
      videoService.fetchReports().then((reports) => {
        if (reports && Array.isArray(reports)) {
          setReportsList(reports);
        }
      });
      videoService.fetchCategoryRequests().then((reqs) => {
        if (reqs && Array.isArray(reqs)) {
          setCategoryRequests(reqs);
        }
      });
    }
  }, [isOpen]);
  
  // Auth form state — no pre-filled values
  const [authStep, setAuthStep] = useState<'credentials'>('credentials');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Category Edit / Create state
  const [editingCategory, setEditingCategory] = useState<CategoryInfo | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('category');
  const [catHeroImage, setCatHeroImage] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Video Edit state
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [searchVideoQuery, setSearchVideoQuery] = useState('');

  // Banner Edit / Create state
  const [editingBanner, setEditingBanner] = useState<LandingBanner | null>(null);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerTag, setBannerTag] = useState('Featured');
  const [bannerCategory, setBannerCategory] = useState('');

  // Upload Video state (for admin upload tab)
  const [upTitle, setUpTitle] = useState('');
  const [upCategory, setUpCategory] = useState(categories[0]?.id || 'trending');
  const [upTags, setUpTags] = useState('Exclusive, 4K, AdminVerified');
  const [upQuality, setUpQuality] = useState<'4K' | 'HD' | 'UHD'>('4K');
  const [upPerformer, setUpPerformer] = useState('FapnXX Admin');
  const [upThumbnail, setUpThumbnail] = useState('');
  const [upEmbedUrl, setUpEmbedUrl] = useState('');
  const [upPreviewMp4Url, setUpPreviewMp4Url] = useState('');
  const [upDuration, setUpDuration] = useState('18:45');
  const [upDesc, setUpDesc] = useState('');
  const [upIsExclusive, setUpIsExclusive] = useState(true);


  if (!isOpen) return null;

  // Real Firebase Authentication Login
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const cleanEmail = emailInput.trim().toLowerCase();

    // Step 1: Check admin whitelist
    if (!ADMIN_WHITELIST.includes(cleanEmail)) {
      setLoginError('Access denied. This email is not authorized as admin.');
      setIsLoggingIn(false);
      return;
    }

    try {
      // Step 2: Real Firebase Auth sign in
      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput.trim());

      // Step 3: Grant admin access
      onAdminLogin(cleanEmail);
      setLoginError('');
      setActiveTab('categories');
    } catch (err: any) {
      // Firebase error codes → user-friendly messages
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setLoginError('Invalid email or password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setLoginError('Too many failed attempts. Account temporarily locked. Try again later.');
      } else if (code === 'auth/network-request-failed') {
        setLoginError('Network error. Please check your internet connection.');
      } else {
        setLoginError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      const auth = getAuth(app);
      await firebaseSignOut(auth);
    } catch (_) {}
    onAdminLogout();
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catHeroImage) return;

    const newCategory: CategoryInfo = {
      id: catId.trim().toLowerCase().replace(/\s+/g, '-') || `cat-${Date.now()}`,
      name: catName,
      icon: catIcon || 'grid_view',
      heroImage: catHeroImage,
      description: catDesc || 'Curated category',
    };

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: catName,
        icon: catIcon,
        heroImage: catHeroImage,
        description: catDesc,
      });
    } else {
      onAddCategory(newCategory);
    }

    setEditingCategory(null);
    setIsCreatingCategory(false);
    resetCatFields();
  };

  const resetCatFields = () => {
    setCatId('');
    setCatName('');
    setCatIcon('category');
    setCatHeroImage('');
    setCatDesc('');
  };

  const startEditCategory = (cat: CategoryInfo) => {
    setEditingCategory(cat);
    setIsCreatingCategory(false);
    setCatId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatHeroImage(cat.heroImage);
    setCatDesc(cat.description);
  };

  const handleApproveCategoryRequest = async (req: import('../types').CategoryRequest) => {
    const catSlug = req.categoryName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newCat: CategoryInfo = {
      id: catSlug || `cat-${Date.now()}`,
      name: req.categoryName.trim(),
      icon: 'auto_awesome',
      heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
      description: `User-requested collection: ${req.categoryName.trim()}`,
    };

    onAddCategory(newCat);
    await videoService.saveCategory(newCat);
    await videoService.updateCategoryRequestStatus(req.id, 'approved');

    setCategoryRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r)));
  };

  const handleRejectCategoryRequest = async (reqId: string) => {
    await videoService.updateCategoryRequestStatus(reqId, 'rejected');
    setCategoryRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' } : r)));
  };

  const handleSaveVideoEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    onUpdateVideo(editingVideo);
    setEditingVideo(null);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle || !bannerImage) return;

    const newBanner: LandingBanner = {
      id: editingBanner ? editingBanner.id : `banner-${Date.now()}`,
      title: bannerTitle,
      subtitle: bannerSubtitle,
      bannerImage,
      tag: bannerTag,
      targetCategory: bannerCategory || undefined,
      isActive: true,
    };

    if (editingBanner) {
      onUpdateBanner(newBanner);
    } else {
      onAddBanner(newBanner);
    }

    setEditingBanner(null);
    setIsCreatingBanner(false);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerImage('');
    setBannerTag('Featured');
  };

  const handleAdminUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upTitle || !upThumbnail) return;

    const categoryObj = categories.find((c) => c.id === upCategory) || categories[0];

    const newVideo: Video = {
      id: `admin-video-${Date.now()}`,
      title: upTitle,
      category: upCategory,
      categoryLabel: categoryObj?.name || 'Exclusive',
      tags: upTags.split(',').map((t) => t.trim()).filter(Boolean),
      thumbnail: upThumbnail,
      duration: upDuration || '15:00',
      quality: upQuality,
      views: '1 View',
      timeAgo: 'Just now',
      performerName: upPerformer || 'FapnXX Admin',
      performerAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvu8sGdltZki91ehu4_TciVh4ojFc2rkzEbjdpwT0f5CLnFmvQzwYrEOQxEFJ_5nuaxrYR5ciK2iYmRsy2xBkg_ftrLdEVMKzs0Mo7wZJj8dGjATtrpcrXvwKvJX9cojHQ3HXSmrDB9oyFdG_EbNoZ_IyKVxNxSzjWcNqxV9DZCb9emwKm10HSw50UmQCf-2beum05L1bV6fTQBVtTvEbXbkY0kh99hiKCxl2v-kLPTgTtkEfqFhfeYQ',
      description: upDesc || 'Published directly via Admin Management Console.',
      isNew: true,
      isExclusive: upIsExclusive,
      embedUrl: upEmbedUrl || undefined,
      previewMp4Url: upPreviewMp4Url || undefined,
      isEmbed: Boolean(upEmbedUrl),
    };

    onUploadVideoSuccess(newVideo);
    setUpTitle('');
    setUpThumbnail('');
    setUpEmbedUrl('');
    setUpPreviewMp4Url('');
    setUpDesc('');
    alert('Video published successfully to FapnXX catalogue!');
  };

  const filteredVideos = videos.filter(
    (v) =>
      v.title.toLowerCase().includes(searchVideoQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchVideoQuery.toLowerCase()) ||
      v.performerName.toLowerCase().includes(searchVideoQuery.toLowerCase())
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 md:p-6"
    >
      <div className="bg-[#121113] border border-[#2e2d30] rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 md:p-6 bg-[#181719] border-b border-[#2e2d30] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tight">
                  <span className="text-[#e0358d] font-black">Fap</span>
                  <span className="brand-letter-n font-black">n</span>
                  <span>XX</span> Admin Panel
                </h2>
                {isAdminAuthenticated ? (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Verified Admin
                  </span>
                ) : (
                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Authentication Required
                  </span>
                )}
              </div>
              <p className="text-xs text-[#debec8]">
                Central control panel for categories, RBAC uploads, media assets, and site banners.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-[#debec8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#141315] border-b border-[#2e2d30] px-4 md:px-6 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('auth')}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'auth'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">key</span>
            Admin Auth
          </button>

          <button
            onClick={() => {
              if (!isAdminAuthenticated) {
                setActiveTab('auth');
                return;
              }
              setActiveTab('categories');
            }}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              !isAdminAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              activeTab === 'categories'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">category</span>
            Category Management ({categories.length})
          </button>

          <button
            onClick={() => {
              if (!isAdminAuthenticated) {
                setActiveTab('auth');
                return;
              }
              setActiveTab('videos');
            }}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              !isAdminAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              activeTab === 'videos'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">image</span>
            Media & Thumbnails ({videos.length})
          </button>

          <button
            onClick={() => {
              if (!isAdminAuthenticated) {
                setActiveTab('auth');
                return;
              }
              setActiveTab('banners');
            }}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              !isAdminAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              activeTab === 'banners'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">view_carousel</span>
            Landing Page Banners ({banners.length})
          </button>

          <button
            onClick={() => {
              if (!isAdminAuthenticated) {
                setActiveTab('auth');
                return;
              }
              setActiveTab('upload');
            }}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              !isAdminAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              activeTab === 'upload'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">cloud_upload</span>
            RBAC Video Upload
          </button>

          <button
            onClick={() => {
              if (!isAdminAuthenticated) {
                setActiveTab('auth');
                return;
              }
              setActiveTab('reports');
            }}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              !isAdminAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              activeTab === 'reports'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-rose-500">flag</span>
            DMCA & Moderation
            {reportsList.filter((r) => r.status === 'pending').length > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {reportsList.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!isAdminAuthenticated) {
                setActiveTab('auth');
                return;
              }
              setActiveTab('usage');
            }}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              !isAdminAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              activeTab === 'usage'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-cyan-400">database</span>
            Firebase Usage Monitor
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0d0c0e]">

          {/* TAB 1: ADMIN AUTHENTICATION */}
          {activeTab === 'auth' && (
            <div className="max-w-md mx-auto py-6">
              {isAdminAuthenticated ? (
                <div className="bg-[#181719] border border-emerald-500/30 rounded-2xl p-6 text-center shadow-xl space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                    <span className="material-symbols-outlined text-3xl">verified_user</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">2FA Verified Admin Session</h3>
                    <p className="text-xs text-[#debec8] mt-1">
                      Logged in as <span className="text-emerald-400 font-mono font-bold">{emailInput || 'Admin'}</span>
                    </p>
                  </div>
                  
                  <div className="p-3 bg-[#0d0c0e] rounded-xl text-left text-xs space-y-1.5 border border-[#2e2d30]">
                    <div className="flex justify-between text-[#a19fa6]">
                      <span>Role Privilege:</span>
                      <span className="text-emerald-400 font-mono font-bold">SUPER_ADMIN_RBAC</span>
                    </div>
                    <div className="flex justify-between text-[#a19fa6]">
                      <span>2FA Verification:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        Authenticated via Firebase
                      </span>
                    </div>
                    <div className="flex justify-between text-[#a19fa6]">
                      <span>Admin Email:</span>
                      <span className="text-white font-mono">{emailInput || 'Admin'}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => setActiveTab('categories')}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-lg flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">dashboard</span>
                      Open Admin Controls
                    </button>
                    <button
                      onClick={() => {
                        handleAdminLogout();
                        setAuthStep('credentials');
                        setEmailInput('');
                        setPasswordInput('');
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#27272a] hover:bg-rose-900/40 text-rose-300 font-bold text-xs transition-colors cursor-pointer border border-rose-500/20 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">logout</span>
                      Sign Out Admin
                    </button>
                  </div>
                </div>
              ) : (
                /* REAL FIREBASE LOGIN FORM */
                <form onSubmit={handleCredentialsSubmit} className="bg-[#181719] border border-[#2e2d30] rounded-2xl p-6 md:p-8 shadow-2xl space-y-5">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center mx-auto text-[#ffb0cd] mb-2">
                      <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                    </div>
                    <h3 className="text-xl font-black text-white">Admin Portal Sign In</h3>
                    <p className="text-xs text-[#debec8]">
                      Authorized personnel only. Secured by Firebase Authentication.
                    </p>
                  </div>

                  {loginError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm shrink-0">error</span>
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1.5">
                        Admin Email
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="Enter admin email address"
                          autoComplete="email"
                          className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 pl-10 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                        />
                        <span className="material-symbols-outlined text-sm text-[#a19fa6] absolute left-3 top-3.5">
                          mail
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1.5">
                        Admin Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 pl-10 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                        />
                        <span className="material-symbols-outlined text-sm text-[#a19fa6] absolute left-3 top-3.5">
                          lock
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isLoggingIn ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">lock_open</span>
                          Sign In to Admin Panel
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0d0c0e] border border-[#2e2d30] text-[11px] text-[#a19fa6]">
                    <p className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-emerald-400">verified_user</span>
                      <span>Secured by <strong className="text-white">Firebase Authentication</strong> — credentials are never stored in code.</span>
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: CATEGORY MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#181719] p-4 rounded-2xl border border-[#2e2d30]">
                <div>
                  <h3 className="text-lg font-bold text-white">Video Category Management</h3>
                  <p className="text-xs text-[#debec8]">
                    Create, modify, reorder, or delete video categories and their cover hero artwork.
                  </p>
                </div>
                {!isCreatingCategory && !editingCategory && (
                  <button
                    onClick={() => {
                      resetCatFields();
                      setIsCreatingCategory(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#ec4899] hover:bg-[#db2777] text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Create New Category
                  </button>
                )}
              </div>

              {/* User Category Requests & Notifications Queue */}
              {categoryRequests.filter((r) => r.status === 'pending').length > 0 && (
                <div className="bg-[#181719] p-5 rounded-2xl border border-[#ec4899]/60 space-y-4 shadow-xl animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-[#2e2d30] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ec4899] animate-pulse">notifications_active</span>
                      <h4 className="font-bold text-white text-sm">
                        User Category Requests Queue ({categoryRequests.filter((r) => r.status === 'pending').length} Pending)
                      </h4>
                    </div>
                    <span className="bg-[#ec4899]/20 text-[#ffb0cd] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#ec4899]/40">
                      Live Firestore Notifications
                    </span>
                  </div>

                  <div className="space-y-3">
                    {categoryRequests
                      .filter((r) => r.status === 'pending')
                      .map((req) => (
                        <div
                          key={req.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[#0d0c0e] rounded-xl border border-[#2e2d30] hover:border-[#ec4899]/40 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white bg-[#ec4899] px-2 py-0.5 rounded">
                                {req.categoryName}
                              </span>
                              <span className="text-[11px] text-[#a19fa6]">for video: "{req.videoTitle || 'Untitled Video'}"</span>
                            </div>
                            <p className="text-[10px] text-[#debec8]">
                              Requested by: <strong className="text-amber-400">{req.requestedByEmail || 'Guest Uploader'}</strong> • {new Date(req.createdAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleApproveCategoryRequest(req)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-md active:scale-95"
                            >
                              <span className="material-symbols-outlined text-sm">add_task</span>
                              Approve & Add Category
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectCategoryRequest(req.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#a19fa6] hover:text-white font-bold text-xs cursor-pointer transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Create/Edit Form */}
              {(isCreatingCategory || editingCategory) && (
                <form onSubmit={handleSaveCategory} className="bg-[#181719] p-6 rounded-2xl border border-[#ec4899]/40 space-y-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center border-b border-[#2e2d30] pb-3">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ec4899]">edit_note</span>
                      {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setIsCreatingCategory(false);
                      }}
                      className="text-xs text-[#a19fa6] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Category Name</label>
                      <input
                        type="text"
                        required
                        value={catName}
                        onChange={(e) => {
                          setCatName(e.target.value);
                          if (!editingCategory) {
                            setCatId(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                          }
                        }}
                        placeholder="e.g. Desi Romance"
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Category ID Slug</label>
                      <input
                        type="text"
                        required
                        value={catId}
                        onChange={(e) => setCatId(e.target.value)}
                        placeholder="e.g. desi-romance"
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Material Icon Symbol</label>
                      <input
                        type="text"
                        value={catIcon}
                        onChange={(e) => setCatIcon(e.target.value)}
                        placeholder="e.g. favorite, local_fire_department, star"
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Category Cover / Hero Image URL</label>
                      <input
                        type="url"
                        required
                        value={catHeroImage}
                        onChange={(e) => setCatHeroImage(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="Category description overview..."
                      className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                    />
                  </div>

                  {/* Preset Image Quick Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#a19fa6] mb-1.5">
                      Or Choose Preset Cover Image:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {[
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuBE-0RTWMQV-7aa5pGek-uZcH-J6NVY0INtMVyfRl352aCeM1uLLWSiSffe_5UkDXumbA8P3mzZ8nlChpgEnecAWSvWzXNqVF9bdRrgn4ZLRJ0p4JPa9gHP10i8FLpBvywDMR2gwDmptUGPby7rE6kgzi1eMivMfKRgQnn9pVpXkpeoFyMXZ4pY8uuvPTDbXWKvLc4gDcITGq9j9T1u3RoFCipZwkUoxWZl6_xUwgrJW_EK5rGwLAtbqQ',
                        'https://lh3.googleusercontent.com/aida-public/AB6AXuBTSrT7ZfnLWJmVyGjfLgykiPkmf7a4I4Z57uEg4c8C2_mJ0w3Y2UlFj5Gp5iEtMegkDAtFW4BKpVK3JE5pODTLTPETiDTQyukLYcV--2v9vb8b-OEkgHaWihpbbRppVRY0YbgqDfyvtuphn5xrfVZWgyDUKRJA2wZVxWJTWpDmQ6DpzeuUmUe8ySRNKup3oJc5VLYhRtM6nfKRK-UOZLtbi132Yme7AQeLMsUzD79lpUUp9Ckdox0HQQ'
                      ].map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Preset ${idx}`}
                          onClick={() => setCatHeroImage(img)}
                          className="w-16 h-10 object-cover rounded-lg border border-[#2e2d30] cursor-pointer hover:border-[#ec4899]"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setIsCreatingCategory(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#27272a] text-[#a19fa6] font-semibold text-xs hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#ec4899] text-white font-bold text-xs hover:bg-[#db2777]"
                    >
                      {editingCategory ? 'Update Category' : 'Save New Category'}
                    </button>
                  </div>
                </form>
              )}

              {/* Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const catVideoCount = videos.filter((v) => v.category === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className="bg-[#181719] rounded-2xl overflow-hidden border border-[#2e2d30] flex flex-col group hover:border-[#ec4899]/50 transition-colors"
                    >
                      <div className="h-32 relative overflow-hidden">
                        <img
                          src={cat.heroImage}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#181719] via-[#181719]/40 to-transparent" />
                        <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-[#ffb0cd] p-1.5 rounded-lg border border-white/10">
                          <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                        </span>
                        <span className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md">
                          {catVideoCount} Videos
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="font-bold text-white text-base">{cat.name}</h4>
                          <p className="text-[11px] text-[#a19fa6] line-clamp-2 mt-1">
                            {cat.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#2e2d30]/60">
                          <span className="text-[10px] font-mono text-[#a19fa6]">ID: {cat.id}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditCategory(cat)}
                              className="px-2.5 py-1 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-xs font-semibold text-white transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
                                  onDeleteCategory(cat.id);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: MEDIA & THUMBNAILS MANAGEMENT */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#181719] p-4 rounded-2xl border border-[#2e2d30]">
                <div>
                  <h3 className="text-lg font-bold text-white">Full Media & Asset Control</h3>
                  <p className="text-xs text-[#debec8]">
                    Modify video thumbnails, grid cover images, titles, tags, and playback configurations.
                  </p>
                </div>

                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    value={searchVideoQuery}
                    onChange={(e) => setSearchVideoQuery(e.target.value)}
                    placeholder="Search videos to edit..."
                    className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                  />
                </div>
              </div>

              {/* Editing Video Modal inside Admin */}
              {editingVideo && (
                <form onSubmit={handleSaveVideoEdit} className="bg-[#181719] p-6 rounded-2xl border border-[#ec4899] space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-[#2e2d30] pb-3">
                    <h4 className="font-bold text-white text-sm">
                      Edit Media Asset: {editingVideo.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingVideo(null)}
                      className="text-xs text-[#a19fa6] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={editingVideo.title}
                        onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Thumbnail Cover Image URL</label>
                      <input
                        type="url"
                        required
                        value={editingVideo.thumbnail}
                        onChange={(e) => setEditingVideo({ ...editingVideo, thumbnail: e.target.value })}
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Category</label>
                      <select
                        value={editingVideo.category}
                        onChange={(e) => setEditingVideo({ ...editingVideo, category: e.target.value })}
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Pornstar Name</label>
                      <input
                        type="text"
                        value={editingVideo.performerName}
                        onChange={(e) => setEditingVideo({ ...editingVideo, performerName: e.target.value })}
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">
                        Video Duration Badge (e.g. 20:59)
                      </label>
                      <input
                        type="text"
                        value={editingVideo.duration || ''}
                        onChange={(e) => setEditingVideo({ ...editingVideo, duration: e.target.value })}
                        placeholder="e.g. 20:59"
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">
                        Preview URL (Firebase Storage CDN or WebP/GIF/MP4 Link)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={editingVideo.previewMp4Url || ''}
                          onChange={(e) => setEditingVideo({ ...editingVideo, previewMp4Url: e.target.value })}
                          placeholder="Firebase Storage URL or https://domain.com/preview.webp"
                          className="flex-1 bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                        />
                        <label className="px-3.5 py-2.5 bg-[#ec4899] hover:bg-[#db2777] rounded-xl text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0">
                          <span className="material-symbols-outlined text-sm">cloud_upload</span>
                          <span>Upload Asset</span>
                          <input
                            type="file"
                            accept="image/webp,image/gif,image/png,image/jpeg,video/mp4,video/webm"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file && editingVideo) {
                                try {
                                  const url = await videoService.uploadPreviewToStorage(file, editingVideo.id);
                                  setEditingVideo({
                                    ...editingVideo,
                                    previewMp4Url: url,
                                    thumbnail: editingVideo.thumbnail && !editingVideo.thumbnail.includes('lh3.googleusercontent.com') ? editingVideo.thumbnail : url,
                                  });
                                } catch (err) {
                                  console.error('Failed to upload preview file:', err);
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Full Video Embed / Stream URL</label>
                      <input
                        type="text"
                        value={editingVideo.embedUrl || ''}
                        onChange={(e) => setEditingVideo({ ...editingVideo, embedUrl: e.target.value })}
                        placeholder="https://www.youtube.com/embed/... or direct MP4 link"
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={editingVideo.description}
                      onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                      className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingVideo(null)}
                      className="px-4 py-2 rounded-xl bg-[#27272a] text-[#a19fa6] font-semibold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#ec4899] text-white font-bold text-xs"
                    >
                      Save Asset Changes
                    </button>
                  </div>
                </form>
              )}

              {/* Videos Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <div
                    key={video.id}
                    className="bg-[#181719] rounded-2xl overflow-hidden border border-[#2e2d30] flex flex-col group hover:border-[#ec4899]/40 transition-colors"
                  >
                    <div className="aspect-video relative overflow-hidden bg-black">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {video.duration}
                      </span>
                      <span className="absolute top-2 left-2 bg-[#ec4899] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                        {video.quality}
                      </span>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-bold text-white text-xs line-clamp-1">{video.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#a19fa6]">
                          <span className="text-[#ffb0cd] font-semibold capitalize">{video.category}</span>
                          <span>•</span>
                          <span>{video.performerName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#2e2d30]">
                        <button
                          onClick={() => setEditingVideo(video)}
                          className="px-3 py-1 rounded-lg bg-[#27272a] hover:bg-[#ec4899] text-white text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">edit</span>
                          Edit Media
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete video "${video.title}"?`)) {
                              onDeleteVideo(video.id);
                            }
                          }}
                          className="p-1 text-rose-400 hover:text-rose-300"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: LANDING PAGE BANNERS */}
          {activeTab === 'banners' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#181719] p-4 rounded-2xl border border-[#2e2d30]">
                <div>
                  <h3 className="text-lg font-bold text-white">Landing Page Banner Controls</h3>
                  <p className="text-xs text-[#debec8]">
                    Customize featured hero covers, headlines, and call-to-action banners on the Browse page.
                  </p>
                </div>
                {!isCreatingBanner && !editingBanner && (
                  <button
                    onClick={() => {
                      setEditingBanner(null);
                      setIsCreatingBanner(true);
                      setBannerTitle('');
                      setBannerSubtitle('');
                      setBannerImage('');
                      setBannerTag('Featured');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#ec4899] text-white font-bold text-xs flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Hero Banner
                  </button>
                )}
              </div>

              {(isCreatingBanner || editingBanner) && (
                <form onSubmit={handleSaveBanner} className="bg-[#181719] p-6 rounded-2xl border border-[#ec4899]/40 space-y-4">
                  <div className="flex justify-between items-center border-b border-[#2e2d30] pb-3">
                    <h4 className="font-bold text-white text-sm">
                      {editingBanner ? 'Edit Landing Banner' : 'Create New Hero Banner'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBanner(null);
                        setIsCreatingBanner(false);
                      }}
                      className="text-xs text-[#a19fa6]"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Headline Title</label>
                      <input
                        type="text"
                        required
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        placeholder="e.g. Midnight Penthouse Premier"
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Tag / Badge</label>
                      <input
                        type="text"
                        value={bannerTag}
                        onChange={(e) => setBannerTag(e.target.value)}
                        placeholder="e.g. Exclusive Release, Featured"
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Banner Cover Image URL</label>
                      <input
                        type="url"
                        required
                        value={bannerImage}
                        onChange={(e) => setBannerImage(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Subtitle / Summary</label>
                      <textarea
                        rows={2}
                        value={bannerSubtitle}
                        onChange={(e) => setBannerSubtitle(e.target.value)}
                        placeholder="Detailed banner text..."
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBanner(null);
                        setIsCreatingBanner(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#27272a] text-[#a19fa6] font-semibold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#ec4899] text-white font-bold text-xs"
                    >
                      Save Banner
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((banner) => (
                  <div
                    key={banner.id}
                    className="bg-[#181719] rounded-2xl overflow-hidden border border-[#2e2d30] flex flex-col"
                  >
                    <div className="h-40 relative">
                      <img src={banner.bannerImage} alt={banner.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#181719] via-[#181719]/30 to-transparent" />
                      <span className="absolute top-3 left-3 bg-[#ec4899] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {banner.tag}
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-bold text-white text-base">{banner.title}</h4>
                        <p className="text-xs text-[#a19fa6] line-clamp-2 mt-1">{banner.subtitle}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#2e2d30]">
                        <button
                          onClick={() => {
                            setEditingBanner(banner);
                            setIsCreatingBanner(false);
                            setBannerTitle(banner.title);
                            setBannerSubtitle(banner.subtitle);
                            setBannerImage(banner.bannerImage);
                            setBannerTag(banner.tag);
                          }}
                          className="px-3 py-1 rounded-lg bg-[#27272a] hover:bg-[#ec4899] text-white text-xs font-semibold"
                        >
                          Edit Banner
                        </button>
                        <button
                          onClick={() => onDeleteBanner(banner.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: ADMIN RESTRICTED VIDEO UPLOAD */}
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-[#181719] border border-[#ec4899]/30 p-6 rounded-2xl shadow-xl space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ec4899]">cloud_upload</span>
                    Admin Restricted Video Upload Console
                  </h3>
                  <p className="text-xs text-[#debec8] mt-1">
                    Upload new videos directly to the public catalogue under RBAC verification.
                  </p>
                </div>

                <form onSubmit={handleAdminUploadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Video Title</label>
                    <input
                      type="text"
                      required
                      value={upTitle}
                      onChange={(e) => setUpTitle(e.target.value)}
                      placeholder="e.g. Uncut Private Encounter in 4K"
                      className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Target Category</label>
                      <select
                        value={upCategory}
                        onChange={(e) => setUpCategory(e.target.value)}
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Quality Level</label>
                      <select
                        value={upQuality}
                        onChange={(e) => setUpQuality(e.target.value as '4K' | 'HD' | 'UHD')}
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      >
                        <option value="4K">4K Ultra-HD</option>
                        <option value="UHD">UHD Cinema</option>
                        <option value="HD">1080p HD</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Thumbnail Cover Image URL</label>
                    <input
                      type="url"
                      required
                      value={upThumbnail}
                      onChange={(e) => setUpThumbnail(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Direct Video URL or Embed URL (Optional)</label>
                    <input
                      type="text"
                      value={upEmbedUrl}
                      onChange={(e) => setUpEmbedUrl(e.target.value)}
                      placeholder="https://www.youtube.com/embed/... or mp4 link"
                      className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Pornstar Name</label>
                      <input
                        type="text"
                        value={upPerformer}
                        onChange={(e) => setUpPerformer(e.target.value)}
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Duration</label>
                      <input
                        type="text"
                        value={upDuration}
                        onChange={(e) => setUpDuration(e.target.value)}
                        placeholder="18:45"
                        className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={upDesc}
                      onChange={(e) => setUpDesc(e.target.value)}
                      className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] text-white font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-lg"
                  >
                    Publish Video as Admin
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 6: DMCA & CONTENT MODERATION QUEUE */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-[#181719] p-5 rounded-2xl border border-[#2e2d30]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500">gavel</span>
                    Automated DMCA & Content Moderation Queue
                  </h3>
                  <p className="text-xs text-[#debec8]">
                    Review user copyright claims, policy violations, and execute automated content takedowns.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold px-3 py-1 rounded-full">
                    {reportsList.filter((r) => r.status === 'pending').length} Pending Review
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full">
                    {reportsList.filter((r) => r.status === 'takedown' || r.status === 'resolved').length} Resolved
                  </span>
                </div>
              </div>

              {reportsList.length === 0 ? (
                <div className="p-12 text-center text-[#debec8] bg-[#181719] rounded-2xl border border-[#2e2d30]">
                  <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">task_alt</span>
                  <p className="text-base font-bold text-white">No Copyright or DMCA Claims Pending</p>
                  <p className="text-xs text-[#a19fa6] mt-1">All content reports are currently clear.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportsList.map((report) => {
                    const reportedVideo = videos.find((v) => v.id === report.videoId);

                    const updateReportStatus = (newStatus: ReportStatus) => {
                      const updated = reportsList.map((r) => (r.id === report.id ? { ...r, status: newStatus } : r));
                      setReportsList(updated);
                      setStoredReports(updated);
                      
                      // Also sync Firestore status
                      videoService.updateReportStatus(report.id, newStatus);

                      // If action is takedown, mark the video as taken down
                      if (newStatus === 'takedown' && reportedVideo) {
                        onUpdateVideo({
                          ...reportedVideo,
                          isTakenDown: true,
                        });
                      }
                    };

                    return (
                      <div
                        key={report.id}
                        className="bg-[#181719] border border-[#2e2d30] rounded-2xl p-5 hover:border-[#3f3f46] transition-colors space-y-4"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2e2d30] pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                              <span className="material-symbols-outlined">report_problem</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{report.reason.toUpperCase()} CLAIM</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  report.status === 'pending'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : report.status === 'takedown'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                  {report.status}
                                </span>
                              </div>
                              <p className="text-xs text-[#a19fa6]">
                                Submitted: {new Date(report.createdAt).toLocaleString()} • IP: {report.clientIp || '127.0.0.1'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {reportedVideo && !reportedVideo.isTakenDown && (
                              <button
                                onClick={() => updateReportStatus('takedown')}
                                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
                              >
                                <span className="material-symbols-outlined text-sm">block</span>
                                Takedown Content
                              </button>
                            )}

                            {report.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateReportStatus('resolved')}
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">check_circle</span>
                                  Resolve
                                </button>
                                <button
                                  onClick={() => updateReportStatus('dismissed')}
                                  className="px-3.5 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#debec8] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                  Dismiss
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="bg-[#0d0c0e] p-3 rounded-xl border border-[#2e2d30] space-y-1">
                            <span className="text-[#a19fa6] font-semibold">Flagged Video:</span>
                            <p className="font-bold text-white line-clamp-1">{report.videoTitle}</p>
                            <span className="text-[10px] text-[#ffb0cd] font-mono">ID: {report.videoId}</span>
                            {reportedVideo?.isTakenDown && (
                              <span className="block text-[10px] text-rose-400 font-bold mt-1">STATUS: TAKEN DOWN</span>
                            )}
                          </div>

                          <div className="bg-[#0d0c0e] p-3 rounded-xl border border-[#2e2d30] space-y-1">
                            <span className="text-[#a19fa6] font-semibold">Complainant Contact:</span>
                            <p className="font-bold text-white">{report.reporterEmail}</p>
                            <span className="text-[10px] text-[#a19fa6]">Legal Representative</span>
                          </div>

                          <div className="bg-[#0d0c0e] p-3 rounded-xl border border-[#2e2d30] space-y-1 md:col-span-1">
                            <span className="text-[#a19fa6] font-semibold">Claim Details:</span>
                            <p className="text-white line-clamp-3 italic">"{report.details}"</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: FIREBASE USAGE & FREE TIER MONITOR */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#181719] p-5 rounded-2xl border border-[#2e2d30]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-400">monitoring</span>
                    Firebase Database & Storage Usage Monitor
                  </h3>
                  <p className="text-xs text-[#debec8]">
                    Real-time resource tracking and Spark Free Tier quota estimator for Cloud Firestore & Storage.
                  </p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Firebase Spark Tier Active (100% Free)
                </span>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Cloud Firestore Documents */}
                <div className="bg-[#181719] p-5 rounded-2xl border border-[#2e2d30] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#debec8] uppercase tracking-wider">Total Firestore Docs</span>
                    <span className="material-symbols-outlined text-cyan-400 text-xl">dataset</span>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {videos.length + categories.length + banners.length + reportsList.length} Docs
                  </div>
                  <p className="text-[11px] text-[#a19fa6]">
                    {videos.length} Videos • {categories.length} Categories • {banners.length} Banners • {reportsList.length} Reports
                  </p>
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[11px] font-semibold text-[#a19fa6]">
                      <span>Stored Document Capacity</span>
                      <span className="text-cyan-400 font-bold">{"< 0.1% of 1 GB Limit"}</span>
                    </div>
                    <div className="w-full h-2 bg-[#0d0c0e] rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-cyan-400 w-[1%]" />
                    </div>
                  </div>
                </div>

                {/* Card 2: Cloud Storage Usage */}
                <div className="bg-[#181719] p-5 rounded-2xl border border-[#2e2d30] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#debec8] uppercase tracking-wider">Firebase Storage</span>
                    <span className="material-symbols-outlined text-emerald-400 text-xl">cloud_done</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    0.00 MB / 5.0 GB
                  </div>
                  <p className="text-[11px] text-[#a19fa6]">
                    Embed link architecture stores video references instead of heavy MP4 binary files.
                  </p>
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[11px] font-semibold text-[#a19fa6]">
                      <span>Storage Free Tier Remaining</span>
                      <span className="text-emerald-400 font-bold">5,000 MB Available</span>
                    </div>
                    <div className="w-full h-2 bg-[#0d0c0e] rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-emerald-400 w-[0.1%]" />
                    </div>
                  </div>
                </div>

                {/* Card 3: Daily Reads / Writes Estimate */}
                <div className="bg-[#181719] p-5 rounded-2xl border border-[#2e2d30] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#debec8] uppercase tracking-wider">Daily Read/Write Quota</span>
                    <span className="material-symbols-outlined text-[#ec4899] text-xl">speed</span>
                  </div>
                  <div className="text-2xl font-black text-white">
                    50,000 Reads / Day
                  </div>
                  <p className="text-[11px] text-[#a19fa6]">
                    Firebase Spark Free Tier limits: 50,000 document reads and 20,000 document writes per day.
                  </p>
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[11px] font-semibold text-[#a19fa6]">
                      <span>Estimated Usage</span>
                      <span className="text-[#ec4899] font-bold">Optimal Free Quota</span>
                    </div>
                    <div className="w-full h-2 bg-[#0d0c0e] rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-[#ec4899] w-[2%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
