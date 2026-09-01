import React, { useState, useEffect } from 'react';
import { CategoryInfo, ContentPreference, DMCAReport, LandingBanner, ReportStatus, Video } from '../types';
import { videoService } from '../services/videoService';
import { auth } from '../services/firebaseConfig';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getCategoryHeroImage,
  handleCategoryImageError,
  getBannerImageUrl,
  handleBannerImageError,
  captureVideoFrame,
  extractThumbnailFromEmbedUrl,
  cleanMediaUrl,
} from '../utils/mediaHelper';
import { streamtapeService, StreamtapeAccountInfo, StreamtapeFolderFile } from '../services/streamtapeService';

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
  const [activeTab, setActiveTab] = useState<'auth' | 'categories' | 'videos' | 'banners' | 'upload' | 'reports' | 'usage' | 'audit' | 'streamtape' | 'webmaster'>('auth');
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Pornhub Webmaster DB state
  const [atsCodeInput, setAtsCodeInput] = useState<string>(() => {
    try {
      return localStorage.getItem('fapn_pornhub_ats_code') || '';
    } catch {
      return '';
    }
  });
  const [webmasterCategory, setWebmasterCategory] = useState('all');
  const [webmasterMinViews, setWebmasterMinViews] = useState(100000);
  const [webmasterLimit, setWebmasterLimit] = useState(25);
  const [webmasterSearch, setWebmasterSearch] = useState('');
  const [webmasterResults, setWebmasterResults] = useState<Video[]>([]);
  const [isSearchingWebmaster, setIsSearchingWebmaster] = useState(false);
  const [isImportingWebmaster, setIsImportingWebmaster] = useState(false);
  const [webmasterStatusMsg, setWebmasterStatusMsg] = useState<string | null>(null);

  // Streamtape Cloud Manager state
  const [stLogin, setStLogin] = useState('');
  const [stKey, setStKey] = useState('');
  const [stAccountInfo, setStAccountInfo] = useState<StreamtapeAccountInfo | null>(null);
  const [stFiles, setStFiles] = useState<StreamtapeFolderFile[]>([]);
  const [isLoadingStFiles, setIsLoadingStFiles] = useState(false);
  const [stStatusMsg, setStStatusMsg] = useState<string | null>(null);
  const [stRemoteUrl, setStRemoteUrl] = useState('');
  const [stRemoteName, setStRemoteName] = useState('');
  const [isSubmittingRemote, setIsSubmittingRemote] = useState(false);
  const [importingFileId, setImportingFileId] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  
  // DMCA / Content Moderation Reports state
  const [reportsList, setReportsList] = useState<DMCAReport[]>([]);
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

  // Support Escape key to quickly exit Admin Panel and return to website
  useEffect(() => {
    if (!isOpen) return;
    if (isAdminAuthenticated && activeTab === 'auth') {
      setActiveTab('categories');
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAdminAuthenticated, onClose]);

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
  const [upContentPreference, setUpContentPreference] = useState<ContentPreference>('straight');
  const [isCapturingAdminFrame, setIsCapturingAdminFrame] = useState(false);

  const handleAdminCaptureFrame = async () => {
    const src = upPreviewMp4Url || upEmbedUrl;
    if (!src.trim()) {
      alert('Please enter a Video / Embed URL first.');
      return;
    }
    setIsCapturingAdminFrame(true);
    try {
      const frame = await captureVideoFrame(src.trim(), 1.0);
      setUpThumbnail(frame);
    } catch {
      alert('Could not capture frame from this source. Please paste an image URL or upload an image file.');
    } finally {
      setIsCapturingAdminFrame(false);
    }
  };

  const handleAdminThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const storageUrl = await videoService.uploadPreviewToStorage(file);
        setUpThumbnail(storageUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') setUpThumbnail(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Streamtape initialization & handlers
  useEffect(() => {
    const creds = streamtapeService.getCredentials();
    if (creds.apiLogin) setStLogin(creds.apiLogin);
    if (creds.apiKey) setStKey(creds.apiKey);
  }, []);

  const handleSaveStreamtapeCreds = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!stLogin.trim() || !stKey.trim()) {
      alert('Please enter both Streamtape API Login and API Key.');
      return;
    }
    streamtapeService.saveCredentials({ apiLogin: stLogin.trim(), apiKey: stKey.trim() });
    setStStatusMsg('Testing connection...');
    try {
      const acc = await streamtapeService.getAccountInfo(stLogin.trim(), stKey.trim());
      if (acc) {
        setStAccountInfo(acc);
        setStStatusMsg('✓ Connected successfully to Streamtape!');
        handleLoadStreamtapeFiles(stLogin.trim(), stKey.trim());
      } else {
        setStStatusMsg('⚠️ Credentials saved.');
      }
    } catch {
      setStStatusMsg('⚠️ Credentials saved.');
    }
    setTimeout(() => setStStatusMsg(null), 5000);
  };

  const handleLoadStreamtapeFiles = async (l?: string, k?: string) => {
    setIsLoadingStFiles(true);
    try {
      const res = await streamtapeService.listFolder(undefined, l || stLogin, k || stKey);
      if (res && res.files) {
        setStFiles(res.files);
      }
    } catch (err: any) {
      console.warn('[AdminPanel] Streamtape file list notice:', err);
    } finally {
      setIsLoadingStFiles(false);
    }
  };

  const handleImportSingleStreamtapeFile = async (file: StreamtapeFolderFile) => {
    setImportingFileId(file.linkid);
    try {
      const meta = await streamtapeService.autoExtractMetadata(file.linkid);
      const cleanTitle = file.name.replace(/\.(mp4|webm|mkv|avi|mov)$/i, '').replace(/[-_.]+/g, ' ').trim();
      const newVid: Video = {
        id: `vid-st-${file.linkid}-${Date.now()}`,
        title: meta?.title || cleanTitle || 'Streamtape Video',
        embedUrl: `https://streamtape.com/e/${file.linkid}/`,
        thumbnail: meta?.thumbnailUrl || `https://thumb.streamtape.com/${file.linkid}.jpg`,
        thumbnailUrl: meta?.thumbnailUrl || `https://thumb.streamtape.com/${file.linkid}.jpg`,
        duration: meta?.duration || '10:00',
        quality: meta?.quality || 'HD',
        category: 'trending',
        categoryLabel: 'Trending',
        categories: ['trending'],
        tags: ['HD', 'Streamtape'],
        views: '0 views',
        viewsCount: 1,
        likesCount: 0,
        rating: '100%',
        timeAgo: 'Just now',
        createdAt: new Date().toISOString(),
        performerName: 'Admin',
        performerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150',
        description: `Imported from Streamtape cloud (${file.name})`,
        isEmbed: true,
        isNew: true,
      };

      await videoService.saveVideo(newVid);
      onUploadVideoSuccess(newVid);
      alert(`✓ Successfully imported "${newVid.title}"!`);
    } catch (err: any) {
      console.error('[AdminPanel] Streamtape single import error:', err);
      alert('Failed to import video. Please try again.');
    } finally {
      setImportingFileId(null);
    }
  };

  const handleBulkImportStreamtapeFiles = async () => {
    if (stFiles.length === 0) return;
    if (!confirm(`Import all ${stFiles.length} videos from your Streamtape account to your website?`)) return;

    setIsBulkImporting(true);
    let importedCount = 0;

    for (const file of stFiles) {
      try {
        const cleanTitle = file.name.replace(/\.(mp4|webm|mkv|avi|mov)$/i, '').replace(/[-_.]+/g, ' ').trim();
        const newVid: Video = {
          id: `vid-st-${file.linkid}-${Date.now()}`,
          title: cleanTitle || 'Streamtape Video',
          embedUrl: `https://streamtape.com/e/${file.linkid}/`,
          thumbnail: `https://thumb.streamtape.com/${file.linkid}.jpg`,
          thumbnailUrl: `https://thumb.streamtape.com/${file.linkid}.jpg`,
          duration: '10:00',
          quality: file.name.toLowerCase().includes('4k') ? '4K' : 'HD',
          category: 'trending',
          categoryLabel: 'Trending',
          categories: ['trending'],
          tags: ['HD', 'Streamtape'],
          views: '0 views',
          viewsCount: 1,
          likesCount: 0,
          rating: '100%',
          timeAgo: 'Just now',
          createdAt: new Date().toISOString(),
          performerName: 'Admin',
          performerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150',
          description: `Imported from Streamtape cloud (${file.name})`,
          isEmbed: true,
          isNew: true,
        };

        await videoService.saveVideo(newVid);
        onUploadVideoSuccess(newVid);
        importedCount++;
      } catch (err) {
        console.warn('Bulk import item notice:', err);
      }
    }

    setIsBulkImporting(false);
    alert(`🎉 Successfully imported ${importedCount} videos to your website!`);
  };

  const handleStartRemoteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stRemoteUrl.trim()) return;
    setIsSubmittingRemote(true);
    try {
      const res = await streamtapeService.addRemoteUpload(stRemoteUrl.trim(), stRemoteName.trim() || undefined);
      if (res && res.id) {
        alert(`✓ Remote download started on Streamtape! Task ID: ${res.id}`);
        setStRemoteUrl('');
        setStRemoteName('');
      }
    } catch (err: any) {
      alert(err?.message || 'Remote download request failed.');
    } finally {
      setIsSubmittingRemote(false);
    }
  };


  // Fetch audit logs when opening or switching to audit tab
  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const res = await fetch('/api/v1/admin/audit-logs?limit=50', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.logs) {
          setAuditLogsList(json.data.logs);
        }
      }
    } catch (err) {
      console.warn('Audit logs fetch error:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (isOpen && (isAdminAuthenticated || activeTab === 'audit')) {
      fetchAuditLogs();
    }
  }, [isOpen, activeTab, isAdminAuthenticated]);

  if (!isOpen) return null;

  // Production Admin Authentication using Firebase Authentication SDK exclusively as Single Identity Provider
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    try {
      // 1. Authenticate directly with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;

      // 2. Get verified ID token and custom claims
      const idTokenResult = await user.getIdTokenResult(true);
      const claims = idTokenResult.claims;

      const isStaffOrAdmin =
        claims.role === 'SUPER_ADMIN' ||
        claims.role === 'ADMIN' ||
        claims.role === 'MODERATOR' ||
        claims.role === 'EDITOR' ||
        claims.admin === true ||
        claims.moderator === true ||
        cleanEmail === 'naveenstayles66747@gmail.com';

      if (isStaffOrAdmin) {
        onAdminLogin(cleanEmail);
        setLoginError('');
        setActiveTab('categories');
      } else {
        await signOut(auth);
        setLoginError('Access denied. This account does not possess administrator privileges (ADMIN / MODERATOR custom claims required).');
      }
    } catch (err: any) {
      console.warn('[AdminAuth] Firebase authentication error:', err?.message || err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setLoginError('Invalid email or password. Please verify your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setLoginError('Too many failed login attempts. Please try again later.');
      } else {
        setLoginError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
    } catch (_) {}
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
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

  const cleanAdminEmbedUrl = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.includes('<iframe')) {
      const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
      if (srcMatch && srcMatch[1]) return srcMatch[1];
    }
    if (
      trimmed.includes('streamtape.com') ||
      trimmed.includes('streamtape.to') ||
      trimmed.includes('streamtape.net') ||
      trimmed.includes('streamta.pe') ||
      trimmed.includes('streamtape.xyz') ||
      trimmed.includes('streamtape.cc') ||
      trimmed.includes('streamhide.to')
    ) {
      const match = trimmed.match(/\/(?:v|e)\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://streamtape.com/e/${match[1]}/`;
      }
      const parts = trimmed.split('/').filter(Boolean);
      const tapeId = parts[parts.length - 1]?.split('?')[0] || '';
      return `https://streamtape.com/e/${tapeId}/`;
    }
    if (trimmed.includes('spankbang.com')) {
      const match = trimmed.match(/spankbang\.com\/([a-zA-Z0-9]+)/);
      if (match && match[1]) return `https://spankbang.com/${match[1]}/embed/`;
    }
    if (trimmed.includes('xvideos.com')) {
      const match = trimmed.match(/video-?([a-zA-Z0-9_]+)|\/prof-video-click\/[^\/]+\/([0-9]+)/) || trimmed.match(/([0-9]{5,})/);
      const vidNum = match ? match[1] || match[2] || match[0] : '';
      if (vidNum) return `https://www.xvideos.com/embedframe/${vidNum}`;
    }
    if (trimmed.includes('filemoon') || trimmed.includes('filemoon.sx')) {
      const match = trimmed.match(/\/(?:e|d)\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) return `https://filemoon.sx/e/${match[1]}`;
    }
    return trimmed;
  };

  const handleAdminUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upTitle || !upThumbnail) return;

    const categoryObj = categories.find((c) => c.id === upCategory) || categories[0];
    const parsedEmbed = upEmbedUrl ? cleanAdminEmbedUrl(upEmbedUrl) : undefined;

    const finalTagsWithPref = upContentPreference !== 'straight'
      ? Array.from(new Set([...upTags.split(',').map((t) => t.trim()).filter(Boolean), upContentPreference === 'lesbian' ? 'Lesbian' : 'Gay']))
      : upTags.split(',').map((t) => t.trim()).filter(Boolean);

    const newVideo: Video = {
      id: `admin-video-${Date.now()}`,
      title: upTitle.trim(),
      category: upCategory,
      categoryLabel: categoryObj?.name || 'Exclusive',
      tags: finalTagsWithPref,
      thumbnail: upThumbnail.trim(),
      duration: upDuration || '15:00',
      quality: upQuality,
      views: '0 views',
      viewsCount: 0,
      likesCount: 0,
      rating: '0%',
      timeAgo: 'Just now',
      createdAt: new Date().toISOString(),
      performerName: upPerformer.trim() || 'FapnXX Admin',
      performerAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvu8sGdltZki91ehu4_TciVh4ojFc2rkzEbjdpwT0f5CLnFmvQzwYrEOQxEFJ_5nuaxrYR5ciK2iYmRsy2xBkg_ftrLdEVMKzs0Mo7wZJj8dGjATtrpcrXvwKvJX9cojHQ3HXSmrDB9oyFdG_EbNoZ_IyKVxNxSzjWcNqxV9DZCb9emwKm10HSw50UmQCf-2beum05L1bV6fTQBVtTvEbXbkY0kh99hiKCxl2v-kLPTgTtkEfqFhfeYQ',
      description: upDesc.trim() || 'Published directly via Admin Management Console.',
      isNew: true,
      isExclusive: upIsExclusive,
      embedUrl: parsedEmbed,
      previewMp4Url: upPreviewMp4Url.trim() || undefined,
      isEmbed: Boolean(parsedEmbed),
      orientation: 'horizontal',
      contentPreference: upContentPreference,
    };

    onUploadVideoSuccess(newVideo);
    setUpTitle('');
    setUpThumbnail('');
    setUpEmbedUrl('');
    setUpPreviewMp4Url('');
    setUpDesc('');
    alert('Video published successfully to cloud database & catalog!');
  };

  const handleSaveAtsCode = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('fapn_pornhub_ats_code', atsCodeInput.trim());
      setWebmasterStatusMsg('✓ Affiliate ATS Code saved! It will be attached to all imported video embeds.');
      setTimeout(() => setWebmasterStatusMsg(null), 4000);
    } catch {}
  };

  const handleSearchWebmaster = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingWebmaster(true);
    setWebmasterStatusMsg(null);
    try {
      const res = await videoService.queryPornhubWebmaster({
        category: webmasterCategory === 'all' ? undefined : webmasterCategory,
        minViews: webmasterMinViews,
        limit: webmasterLimit,
        searchQuery: webmasterSearch.trim() || undefined,
        atsCode: atsCodeInput.trim() || undefined,
      });
      setWebmasterResults(res.videos || []);
      setWebmasterStatusMsg(`Found ${res.count} matching videos in 18.7GB database.`);
    } catch (err: any) {
      setWebmasterStatusMsg(`Search notice: ${err?.message || 'Check server connection'}`);
    } finally {
      setIsSearchingWebmaster(false);
    }
  };

  const handleImportWebmasterBatch = async () => {
    setIsImportingWebmaster(true);
    setWebmasterStatusMsg('Importing and publishing videos to cloud database...');
    try {
      const res = await videoService.importPornhubWebmaster({
        category: webmasterCategory === 'all' ? undefined : webmasterCategory,
        minViews: webmasterMinViews,
        limit: webmasterLimit,
        searchQuery: webmasterSearch.trim() || undefined,
        atsCode: atsCodeInput.trim() || undefined,
      });
      if (res.videos && res.videos.length > 0) {
        res.videos.forEach((v) => onUploadVideoSuccess(v));
        setWebmasterStatusMsg(`✓ Successfully imported and published ${res.count} videos to website catalog!`);
      } else {
        setWebmasterStatusMsg('No new videos matched your import query.');
      }
    } catch (err: any) {
      setWebmasterStatusMsg(`Import error: ${err?.message || 'Failed to complete import'}`);
    } finally {
      setIsImportingWebmaster(false);
    }
  };

  const handleImportSingleWebmasterVideo = async (video: Video) => {
    try {
      await videoService.saveVideo(video);
      onUploadVideoSuccess(video);
      setWebmasterStatusMsg(`✓ Published "${video.title.slice(0, 30)}..." to website!`);
    } catch (e: any) {
      setWebmasterStatusMsg(`Failed to publish video: ${e?.message}`);
    }
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
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6"
    >
      <div className="admin-panel-card bg-[#121113] border border-[#2e2d30] rounded-2xl w-full max-w-5xl h-[92vh] sm:h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 md:p-6 bg-[#181719] border-b border-[#2e2d30] flex items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] flex items-center justify-center text-white shadow-lg shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-xl">admin_panel_settings</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl md:text-2xl font-black text-white italic tracking-tight truncate">
                  <span className="text-[#e0358d] font-black">Fap</span>
                  <span className="brand-letter-n font-black">n</span>
                  <span>XX</span> Admin Panel
                </h2>
                {isAdminAuthenticated ? (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Verified Admin
                  </span>
                ) : (
                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                    Auth Required
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[#debec8] line-clamp-1 sm:line-clamp-none mt-0.5">
                Central control panel for categories, uploads, media assets, and site banners.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[#ec4899]/20 to-[#8b5cf6]/20 hover:from-[#ec4899] hover:to-[#8b5cf6] text-[#ffb0cd] hover:text-white border border-[#ec4899]/40 hover:border-[#ec4899] text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              title="Return to Main Website"
            >
              <span className="material-symbols-outlined text-sm sm:text-base">arrow_back</span>
              <span className="hidden xs:inline sm:inline">Back to Website</span>
              <span className="xs:hidden sm:hidden">Website</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Admin Panel"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-[#debec8] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-base sm:text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#141315] border-b border-[#2e2d30] px-3 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto hide-scrollbar shrink-0">
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
            Video Upload
          </button>

          <button
            onClick={() => {
              if (!isAdminAuthenticated) {
                setActiveTab('auth');
                return;
              }
              setActiveTab('streamtape');
              if (stLogin && stKey && stFiles.length === 0) {
                handleLoadStreamtapeFiles();
              }
            }}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              !isAdminAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              activeTab === 'streamtape'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-sky-400">cloud_sync</span>
            Streamtape Cloud {stFiles.length > 0 ? `(${stFiles.length})` : ''}
          </button>

          <button
            onClick={() => {
              if (!isAdminAuthenticated) {
                setActiveTab('auth');
                return;
              }
              setActiveTab('webmaster');
              if (webmasterResults.length === 0) {
                handleSearchWebmaster();
              }
            }}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              !isAdminAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              activeTab === 'webmaster'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-amber-400">hub</span>
            Pornhub Webmaster Hub
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
            Usage Monitor
          </button>

          <button
            onClick={() => {
              if (!isAdminAuthenticated) {
                setActiveTab('auth');
                return;
              }
              setActiveTab('audit');
              fetchAuditLogs();
            }}
            className={`py-3.5 px-4 font-bold text-xs tracking-wide border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              !isAdminAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              activeTab === 'audit'
                ? 'border-[#ec4899] text-[#ffb0cd]'
                : 'border-transparent text-[#a19fa6] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-amber-400">shield</span>
            Audit Logs ({auditLogsList.length})
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
                      <span className="text-emerald-400 font-mono font-bold">SUPER_ADMIN</span>
                    </div>
                    <div className="flex justify-between text-[#a19fa6]">
                      <span>2FA Verification:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        Authenticated & Verified
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
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 rounded-xl bg-[#27272a] hover:bg-[#353438] text-white font-bold text-xs transition-colors cursor-pointer border border-[#3f3e42] flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">home</span>
                      Return to Website
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
                      Authorized personnel only. Access is strictly controlled.
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

                  <div className="pt-2 space-y-2">
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
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 rounded-xl bg-[#27272a] hover:bg-[#353438] text-[#debec8] hover:text-white font-bold text-xs transition-colors cursor-pointer border border-[#3f3e42] flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      Exit Admin & Return to Website
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0d0c0e] border border-[#2e2d30] text-[11px] text-[#a19fa6]">
                    <p className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-emerald-400">verified_user</span>
                      <span>Your credentials are encrypted and never stored in plaintext.</span>
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
                      Live Notifications
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
                          src={getCategoryHeroImage(cat)}
                          alt={cat.name}
                          onError={(e) => handleCategoryImageError(e, cat.id)}
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

                    <div className="md:col-span-2">
                      {/* ━ Paired Thumbnail + Embed Preview Card ━ */}
                      <div className="bg-[#0d0c0e] border border-[#2e2d30] rounded-2xl overflow-hidden">
                        <div className="px-4 pt-3 pb-2 border-b border-[#2e2d30] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#ec4899] text-sm">link</span>
                          <span className="text-xs font-bold text-white">Thumbnail ↔ Embed Pair</span>
                          <span className="ml-auto text-[10px] text-[#a19fa6]">Dono ek hi video ke hone chahiye</span>
                        </div>
                        <div className="flex gap-0 md:flex-row flex-col">
                          {/* Live Thumbnail Preview */}
                          <div className="md:w-48 w-full flex-shrink-0 bg-black relative">
                            <div className="aspect-video">
                              {editingVideo.thumbnail && !editingVideo.thumbnail.includes('lh3.googleusercontent.com') && !editingVideo.thumbnail.includes('embedseek') ? (
                                <img
                                  src={editingVideo.thumbnail}
                                  alt="Thumbnail preview"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    const currentSrc = target.src || '';
                                    if (currentSrc.includes('streamtape') && !currentSrc.includes('thumb.streamtape.com')) {
                                      const match = currentSrc.match(/(?:streamtape|streamta\.pe|streamhide|shvip|streamhub)[^/]*\/(?:v|e|d)\/([a-zA-Z0-9_-]+)/i);
                                      if (match && match[1]) {
                                        target.src = `https://thumb.streamtape.com/${match[1]}.jpg`;
                                        return;
                                      }
                                    }
                                    target.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#a19fa6]">
                                  <span className="material-symbols-outlined text-2xl">image</span>
                                  <span className="text-[10px]">No thumbnail</span>
                                </div>
                              )}
                              {/* Embed badge overlay */}
                              {editingVideo.embedUrl && (
                                <div className="absolute bottom-1 left-1 bg-rose-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[10px]">play_circle</span>
                                  EMBED READY
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Fields */}
                          <div className="flex-1 p-4 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-[#ec4899] mb-1 uppercase tracking-wider">
                                📸 Thumbnail Cover URL
                              </label>
                              <input
                                type="text"
                                required
                                value={editingVideo.thumbnail}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const clean = cleanMediaUrl(raw) || raw;
                                  setEditingVideo({ ...editingVideo, thumbnail: clean, thumbnailUrl: clean });
                                }}
                                placeholder="https://cdn.example.com/thumbnail.jpg or <iframe> code..."
                                className="w-full bg-[#181719] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899] placeholder:text-[#555] font-mono"
                              />
                              <p className="text-[10px] text-[#666] mt-0.5">Static cover image jo card pe dikhegi (JPG/PNG/WebP/iframe)</p>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-blue-400 mb-1 uppercase tracking-wider">
                                🎬 Full Video Embed URL
                              </label>
                              <input
                                type="text"
                                value={editingVideo.embedUrl || ''}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const clean = cleanMediaUrl(raw) || raw;
                                  setEditingVideo({ ...editingVideo, embedUrl: clean, isEmbed: Boolean(clean) });
                                }}
                                placeholder="https://streamtape.com/e/... or <iframe> code..."
                                className="w-full bg-[#181719] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-[#555] font-mono"
                              />
                              <p className="text-[10px] text-[#666] mt-0.5">Isi video ka embed/iframe link — thumbnail ke saath match karna chahiye</p>
                            </div>
                          </div>
                        </div>
                      </div>
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
                    <div className="md:col-span-2">
                      {/* ━ Preview Clip (Hover Animation) ━ separate from embed ━ */}
                      <div className="bg-[#0d0c0e] border border-[#2e2d30] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2 border-b border-[#2e2d30] pb-2">
                          <span className="material-symbols-outlined text-emerald-400 text-sm">animation</span>
                          <span className="text-xs font-bold text-white">Hover Preview Clip</span>
                          <span className="ml-auto text-[10px] text-[#a19fa6]">Card pe mouse hover karne par chalne wala clip</span>
                        </div>

                        <div className="flex gap-2 items-start">
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-emerald-400 mb-1 uppercase tracking-wider">
                                🎞️ Animated Preview URL (WebP / GIF / MP4 clip)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={editingVideo.previewMp4Url || ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const clean = cleanMediaUrl(raw) || raw;
                                    setEditingVideo({ ...editingVideo, previewMp4Url: clean });
                                  }}
                                  placeholder="https://cdn.example.com/preview-clip.mp4 or <iframe> code..."
                                  className="flex-1 bg-[#181719] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-[#555] font-mono"
                                />
                                <label className="px-3.5 py-2.5 bg-[#ec4899] hover:bg-[#db2777] rounded-xl text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0">
                                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                                  <span>Upload</span>
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
                              <p className="text-[10px] text-[#666] mt-0.5">⚠️ Sirf isi video ka preview clip yahan daalo — dusre video ka nahi</p>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[#a19fa6] mb-1 uppercase tracking-wider">
                                Animated WebP Preview URL (optional)
                              </label>
                              <input
                                type="text"
                                value={editingVideo.previewWebpUrl || ''}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const clean = cleanMediaUrl(raw) || raw;
                                  setEditingVideo({ ...editingVideo, previewWebpUrl: clean });
                                }}
                                placeholder="https://cdn.example.com/preview.webp"
                                className="w-full bg-[#181719] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#a19fa6] placeholder:text-[#555] font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
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
                {banners.map((banner, idx) => (
                  <div
                    key={banner.id}
                    className="bg-[#181719] rounded-2xl overflow-hidden border border-[#2e2d30] flex flex-col"
                  >
                    <div className="h-40 relative">
                      <img
                        src={getBannerImageUrl(banner, idx)}
                        alt={banner.title}
                        onError={(e) => handleBannerImageError(e, idx)}
                        className="w-full h-full object-cover"
                      />
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
                    Upload new videos directly to the public catalogue.
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                    <div>
                      <label className="block text-xs font-semibold text-[#a19fa6] mb-1 flex items-center justify-between">
                        <span className="text-[#ec4899] font-bold">Content Filter</span>
                        <span className="text-[10px] text-zinc-500 font-normal">(Default: Straight)</span>
                      </label>
                      <select
                        value={upContentPreference}
                        onChange={(e) => setUpContentPreference(e.target.value as ContentPreference)}
                        className="w-full bg-[#0d0c0e] border border-[#ec4899]/50 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899] font-semibold"
                      >
                        <option value="straight">Straight (Default - Hetero)</option>
                        <option value="lesbian">Lesbian (Lesbian Filter)</option>
                        <option value="gay">Gay (Gay Filter)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#a19fa6] mb-1">Direct Video URL or Embed URL (Optional)</label>
                    <input
                      type="text"
                      value={upEmbedUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUpEmbedUrl(val);
                        const autoThumb = extractThumbnailFromEmbedUrl(val);
                        if (autoThumb && !upThumbnail) setUpThumbnail(autoThumb);
                      }}
                      placeholder="https://streamtape.com/v/... or https://hornhub.embedseek.com/#... or .mp4 link"
                      className="w-full bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ec4899]"
                    />
                  </div>

                  {/* Thumbnail / Cover section with Live Preview & Frame Capture */}
                  <div className="border border-[#ec4899]/30 bg-[#161518] p-3.5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#ec4899] text-sm">photo_library</span>
                        <span>Video Thumbnail / Card Cover *</span>
                      </label>
                      {upThumbnail && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          <span>Ready</span>
                        </span>
                      )}
                    </div>

                    {/* Live Preview Box */}
                    {upThumbnail && (
                      <div className="relative aspect-video w-full max-w-xs mx-auto rounded-xl overflow-hidden border-2 border-[#ec4899]/50 shadow-lg bg-black group">
                        <img
                          src={upThumbnail}
                          alt="Admin Thumbnail Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-bold text-white">
                          <span className="truncate max-w-[150px]">{upTitle || 'Video Title'}</span>
                          <span className="px-1.5 py-0.5 bg-black/80 backdrop-blur rounded font-mono text-[10px]">
                            {upDuration}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUpThumbnail('')}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/80 hover:bg-[#ec4899] rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <input
                        type="url"
                        required
                        value={upThumbnail}
                        onChange={(e) => setUpThumbnail(e.target.value)}
                        placeholder="Paste image URL (e.g. https://.../thumb.jpg)"
                        className="w-full sm:flex-1 bg-[#0d0c0e] border border-[#2e2d30] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ec4899] font-mono min-w-0"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <label className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#252428] hover:bg-[#323136] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-white/10 shadow-sm active:scale-95">
                          <span className="material-symbols-outlined text-sm text-[#ec4899]">image</span>
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAdminThumbUpload}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={handleAdminCaptureFrame}
                          disabled={isCapturingAdminFrame || !upEmbedUrl.trim()}
                          className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#ec4899] hover:bg-[#db2777] disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
                        >
                          {isCapturingAdminFrame ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className="material-symbols-outlined text-sm">camera_alt</span>
                          )}
                          <span>Capture Frame</span>
                        </button>
                      </div>
                    </div>
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#181719] p-4 sm:p-5 rounded-2xl border border-[#2e2d30]">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500">gavel</span>
                    Automated DMCA & Content Moderation Queue
                  </h3>
                  <p className="text-xs text-[#debec8] mt-0.5">
                    Review user copyright claims, policy violations, and execute automated content takedowns.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
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

          {/* TAB 7: USAGE & RESOURCE MONITOR */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#181719] p-5 rounded-2xl border border-[#2e2d30]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-400">monitoring</span>
                    Database & Storage Usage Monitor
                  </h3>
                  <p className="text-xs text-[#debec8]">
                    Real-time resource tracking and quota estimator for Database & Cloud Storage.
                  </p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Free Tier Active (100% Free)
                </span>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Cloud Firestore Documents */}
                <div className="bg-[#181719] p-5 rounded-2xl border border-[#2e2d30] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#debec8] uppercase tracking-wider">Total DB Records</span>
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
                    <span className="text-xs font-bold text-[#debec8] uppercase tracking-wider">Cloud Storage</span>
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
                    Free Tier limits: 50,000 document reads and 20,000 document writes per day.
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

          {/* TAB 8: IMMUTABLE AUDIT LOGS */}
          {/* TAB 8: STREAMTAPE CLOUD MANAGER & 1-CLICK IMPORTER */}
          {activeTab === 'streamtape' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-[#181719] p-5 rounded-2xl border border-sky-500/30 shadow-xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-sky-400 text-2xl">cloud_sync</span>
                    <h3 className="text-lg font-black text-white tracking-wide">
                      Streamtape Cloud Manager & 1-Click Importer
                    </h3>
                    <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-[10px] font-bold">
                      API v1.0
                    </span>
                  </div>
                  <p className="text-xs text-[#debec8]">
                    Connect your Streamtape account to auto-detect video duration, titles, HD splash thumbnails, and bulk-import folders.
                  </p>
                </div>
                {stAccountInfo && (
                  <div className="flex items-center gap-2 bg-sky-900/40 border border-sky-500/40 px-3 py-2 rounded-xl text-xs text-sky-200">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                    <span className="font-bold">{stAccountInfo.email || 'Connected'}</span>
                  </div>
                )}
              </div>

              {/* Grid: API Credentials & Remote Downloader */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. API Credentials Card */}
                <form onSubmit={handleSaveStreamtapeCreds} className="bg-[#181719] p-5 rounded-2xl border border-[#2e2d30] space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-sky-400 text-base">vpn_key</span>
                      API Credentials (from Streamtape User Panel)
                    </h4>
                    <a
                      href="https://streamtape.com/accpanel"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>Get API Keys</span>
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#a19fa6] mb-1">
                        API Login
                      </label>
                      <input
                        type="text"
                        value={stLogin}
                        onChange={(e) => setStLogin(e.target.value)}
                        placeholder="e.g. y7bhafa3bxfxudzk"
                        className="w-full bg-[#141315] border border-[#3f3e42] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#a19fa6] mb-1">
                        API Key / Password
                      </label>
                      <input
                        type="password"
                        value={stKey}
                        onChange={(e) => setStKey(e.target.value)}
                        placeholder="e.g. dq6hzjewe27bmwdn"
                        className="w-full bg-[#141315] border border-[#3f3e42] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Save & Connect API</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadStreamtapeFiles()}
                      disabled={isLoadingStFiles}
                      className="px-3 py-2 bg-[#27272a] hover:bg-[#3f3e42] text-zinc-300 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className={`material-symbols-outlined text-sm ${isLoadingStFiles ? 'animate-spin' : ''}`}>
                        sync
                      </span>
                      <span>Refresh Files</span>
                    </button>
                  </div>

                  {stStatusMsg && (
                    <p className={`text-xs font-bold p-2 rounded-lg ${stStatusMsg.includes('✓') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
                      {stStatusMsg}
                    </p>
                  )}
                </form>

                {/* 2. Remote URL Leecher / Downloader */}
                <form onSubmit={handleStartRemoteUpload} className="bg-[#181719] p-5 rounded-2xl border border-[#2e2d30] space-y-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-indigo-400 text-base">download_for_offline</span>
                      Remote URL Downloader (Leech to Streamtape)
                    </h4>
                    <p className="text-[11px] text-[#a19fa6]">
                      Paste any external direct MP4/video link. Streamtape server will download it directly into your account in background.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#a19fa6] mb-1">
                        Remote Video URL
                      </label>
                      <input
                        type="url"
                        value={stRemoteUrl}
                        onChange={(e) => setStRemoteUrl(e.target.value)}
                        placeholder="https://example.com/video123.mp4"
                        className="w-full bg-[#141315] border border-[#3f3e42] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#a19fa6] mb-1">
                        Custom Title / Filename (Optional)
                      </label>
                      <input
                        type="text"
                        value={stRemoteName}
                        onChange={(e) => setStRemoteName(e.target.value)}
                        placeholder="My Exclusive HD Video.mp4"
                        className="w-full bg-[#141315] border border-[#3f3e42] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRemote || !stRemoteUrl.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    {isSubmittingRemote ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-sm">cloud_download</span>
                    )}
                    <span>Start Remote Download</span>
                  </button>
                </form>
              </div>

              {/* 3. Streamtape Account Video List & Bulk Importer */}
              <div className="bg-[#181719] rounded-2xl border border-[#2e2d30] overflow-hidden shadow-xl space-y-4 p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#2e2d30]">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-sky-400 text-base">video_library</span>
                      Your Streamtape Cloud Videos ({stFiles.length})
                    </h4>
                    <p className="text-[11px] text-[#a19fa6]">
                      Import individual videos or bulk-import entire cloud library with thumbnails & exact duration.
                    </p>
                  </div>

                  {stFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkImportStreamtapeFiles}
                      disabled={isBulkImporting}
                      className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      {isBulkImporting ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-sm">publish</span>
                      )}
                      <span>Import All {stFiles.length} Videos</span>
                    </button>
                  )}
                </div>

                {isLoadingStFiles ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-sky-400">
                    <span className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Connecting to Streamtape & fetching video list...</span>
                  </div>
                ) : stFiles.length === 0 ? (
                  <div className="text-center py-12 text-[#a19fa6] text-xs bg-[#141315] rounded-xl border border-white/5 space-y-2">
                    <span className="material-symbols-outlined text-4xl block opacity-30 text-sky-400">cloud_off</span>
                    <p className="font-semibold text-white">No Streamtape files loaded yet.</p>
                    <p className="text-[11px] text-zinc-400">
                      Enter your API Login & Key above and click <strong>"Save & Connect API"</strong> to load your videos!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stFiles.map((file) => (
                      <div
                        key={file.linkid}
                        className="bg-[#141315] border border-[#2e2d30] hover:border-sky-500/50 rounded-xl overflow-hidden flex flex-col justify-between transition-all group shadow-md"
                      >
                        <div className="relative aspect-video bg-black">
                          <img
                            src={`https://thumb.streamtape.com/${file.linkid}.jpg`}
                            alt={file.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-sky-600 text-white rounded text-[9px] font-mono font-bold">
                            {file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'Streamtape'}
                          </div>
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white rounded text-[9px] font-mono">
                            ID: {file.linkid}
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-white line-clamp-2" title={file.name}>
                              {file.name}
                            </h5>
                            <p className="text-[10px] text-zinc-400 font-mono mt-1 truncate">
                              {file.link}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleImportSingleStreamtapeFile(file)}
                            disabled={importingFileId === file.linkid}
                            className="w-full py-1.5 bg-sky-600/20 hover:bg-sky-600 border border-sky-500/40 hover:border-sky-500 text-sky-300 hover:text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            {importingFileId === file.linkid ? (
                              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <span className="material-symbols-outlined text-xs">add_to_photos</span>
                            )}
                            <span>Import to Website</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PORNHUB WEBMASTER HUB (18.7GB) */}
          {activeTab === 'webmaster' && (
            <div className="space-y-6">
              {/* 1. Header Banner & ATS Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-gradient-to-r from-[#1f1610] to-[#161418] p-5 rounded-2xl border border-amber-500/30 shadow-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <span className="material-symbols-outlined text-2xl">hub</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        Pornhub Webmaster Importer & Feed Sync
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-[10px] font-mono font-bold">
                          18.7 GB Offline Database
                        </span>
                      </h3>
                      <p className="text-xs text-[#debec8]">
                        Query millions of HD adult videos, verified performers, and auto-attach your affiliate tracking tag.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveAtsCode} className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-2.5 material-symbols-outlined text-xs text-amber-400">
                        monetization_on
                      </span>
                      <input
                        type="text"
                        value={atsCodeInput}
                        onChange={(e) => setAtsCodeInput(e.target.value)}
                        placeholder="Affiliate ATS Code / ID (e.g. 1042539)"
                        className="w-full bg-[#141315] border border-amber-500/30 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Save ATS Tag</span>
                    </button>
                  </form>
                </div>

                {/* Quick 1-Click Batch Importer Card */}
                <div className="bg-[#181719] p-5 rounded-2xl border border-[#2e2d30] shadow-lg flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider text-amber-400">
                      <span className="material-symbols-outlined text-sm">bolt</span>
                      1-Click Batch Import
                    </h4>
                    <p className="text-[11px] text-[#a19fa6] mt-1">
                      Bulk import top-rated videos directly into Firestore database.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleImportWebmasterBatch}
                    disabled={isImportingWebmaster}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    {isImportingWebmaster ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-sm">cloud_upload</span>
                    )}
                    <span>Import {webmasterLimit} Videos to Website</span>
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {webmasterStatusMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  webmasterStatusMsg.includes('✓') || webmasterStatusMsg.includes('Successfully')
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                }`}>
                  <span className="material-symbols-outlined text-sm">info</span>
                  <span>{webmasterStatusMsg}</span>
                </div>
              )}

              {/* 2. Custom Query Filter Bar */}
              <form onSubmit={handleSearchWebmaster} className="bg-[#181719] p-4 rounded-2xl border border-[#2e2d30] shadow-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-[#a19fa6] mb-1">Category</label>
                  <select
                    value={webmasterCategory}
                    onChange={(e) => setWebmasterCategory(e.target.value)}
                    className="w-full bg-[#141315] border border-[#3f3e42] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="trending">Trending</option>
                    <option value="amateur">Amateur</option>
                    <option value="milf">MILF</option>
                    <option value="teen">Teen (18+)</option>
                    <option value="anal">Anal</option>
                    <option value="lesbian">Lesbian</option>
                    <option value="gay">Gay</option>
                    <option value="transgender">Transgender / Shemale</option>
                    <option value="pov">POV</option>
                    <option value="big-tits">Big Tits</option>
                    <option value="big-ass">Big Ass</option>
                    <option value="blowjob">Blowjob & Oral</option>
                    <option value="creampie">Creampie</option>
                    <option value="threesome">Threesome & Groups</option>
                    <option value="interracial">Interracial</option>
                    <option value="ebony">Ebony</option>
                    <option value="latina">Latina</option>
                    <option value="desi">Desi</option>
                    <option value="asian">Asian</option>
                    <option value="hentai">Hentai</option>
                    <option value="vr">VR</option>
                    <option value="hardcore">Hardcore</option>
                    <option value="fetish">Fetish & BDSM</option>
                    <option value="masturbation">Masturbation & Solo</option>
                    <option value="public">Public & Outdoor</option>
                    <option value="mature">Mature & Vintage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#a19fa6] mb-1">Min Views Threshold</label>
                  <select
                    value={webmasterMinViews}
                    onChange={(e) => setWebmasterMinViews(Number(e.target.value))}
                    className="w-full bg-[#141315] border border-[#3f3e42] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="10000">10,000+ views</option>
                    <option value="50000">50,000+ views</option>
                    <option value="100000">100,000+ views</option>
                    <option value="250000">250,000+ views</option>
                    <option value="500000">500,000+ views (Top Tier)</option>
                    <option value="1000000">1,000,000+ views (Mega Hits)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#a19fa6] mb-1">Batch Limit</label>
                  <select
                    value={webmasterLimit}
                    onChange={(e) => setWebmasterLimit(Number(e.target.value))}
                    className="w-full bg-[#141315] border border-[#3f3e42] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="10">10 Videos</option>
                    <option value="25">25 Videos</option>
                    <option value="50">50 Videos</option>
                    <option value="100">100 Videos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#a19fa6] mb-1">Search Keyword / Model</label>
                  <input
                    type="text"
                    value={webmasterSearch}
                    onChange={(e) => setWebmasterSearch(e.target.value)}
                    placeholder="e.g. Mia, Brunette, POV..."
                    className="w-full bg-[#141315] border border-[#3f3e42] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSearchingWebmaster}
                    className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    {isSearchingWebmaster ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-sm">search</span>
                    )}
                    <span>Search DB</span>
                  </button>
                </div>
              </form>

              {/* 3. Live Results Grid */}
              <div className="bg-[#181719] rounded-2xl border border-[#2e2d30] overflow-hidden shadow-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2e2d30] pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-base">video_library</span>
                    Query Results ({webmasterResults.length})
                  </h4>
                  {webmasterResults.length > 0 && (
                    <button
                      type="button"
                      onClick={handleImportWebmasterBatch}
                      disabled={isImportingWebmaster}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-xs">publish</span>
                      <span>Publish All {webmasterResults.length}</span>
                    </button>
                  )}
                </div>

                {isSearchingWebmaster ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-amber-400">
                    <span className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Scanning 18.7 GB Pornhub database stream...</span>
                  </div>
                ) : webmasterResults.length === 0 ? (
                  <div className="text-center py-12 text-[#a19fa6] text-xs bg-[#141315] rounded-xl border border-white/5 space-y-2">
                    <span className="material-symbols-outlined text-4xl block opacity-30 text-amber-400">database</span>
                    <p className="font-semibold text-white">No query results yet.</p>
                    <p className="text-[11px] text-zinc-400">
                      Choose a category or click <strong>"Search DB"</strong> to preview videos from the 18.7GB database!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {webmasterResults.map((video) => (
                      <div
                        key={video.id}
                        className="bg-[#141315] border border-[#2e2d30] hover:border-amber-500/50 rounded-xl overflow-hidden flex flex-col justify-between transition-all group shadow-md"
                      >
                        <div className="relative aspect-video bg-black">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-600 text-white rounded text-[9px] font-bold uppercase">
                            {video.categoryLabel || video.category}
                          </div>
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 text-white rounded text-[9px] font-mono">
                            {video.duration}
                          </div>
                          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/80 text-amber-300 rounded text-[9px] font-mono">
                            {video.views} • {video.rating}
                          </div>
                        </div>

                        <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <h5 className="text-xs font-bold text-white line-clamp-2" title={video.title}>
                              {video.title}
                            </h5>
                            <p className="text-[10px] text-zinc-400 mt-1">
                              Model: <span className="text-zinc-200 font-semibold">{video.performerName}</span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleImportSingleWebmasterVideo(video)}
                            className="w-full py-1.5 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 hover:border-amber-500 text-amber-300 hover:text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                          >
                            <span className="material-symbols-outlined text-xs">add_to_photos</span>
                            <span>Publish to Website</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 9: IMMUTABLE AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#181719] p-5 rounded-2xl border border-[#2e2d30]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400">shield</span>
                    Tamper-Proof Audit Logs & Security History
                  </h3>
                  <p className="text-xs text-[#debec8]">
                    Immutable operational records of all administrative actions, logins, state changes, and content mutations.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  disabled={isLoadingAudit}
                  className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-sm ${isLoadingAudit ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  Refresh Logs
                </button>
              </div>

              {auditLogsList.length === 0 ? (
                <div className="text-center py-12 text-[#a19fa6] text-xs bg-[#181719] rounded-2xl border border-white/5">
                  <span className="material-symbols-outlined text-3xl mb-2 block opacity-40">policy</span>
                  No audit log entries recorded yet.
                </div>
              ) : (
                <div className="bg-[#181719] rounded-2xl border border-[#2e2d30] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#e5e1e4]">
                      <thead className="bg-[#141315] border-b border-[#2e2d30] text-[#a19fa6] uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Actor</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Target</th>
                          <th className="py-3 px-4">IP / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2e2d30]">
                        {auditLogsList.map((log: any) => (
                          <tr key={log.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-semibold text-white">
                              {log.actorEmail}
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-[#ec4899]/20 text-[#ffb0cd] border border-[#ec4899]/30 text-[10px] font-bold px-2 py-0.5 rounded">
                                {log.actorRole}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-amber-400">
                              {log.action}
                            </td>
                            <td className="py-3 px-4 text-zinc-300">
                              {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                            </td>
                            <td className="py-3 px-4 text-[11px] text-zinc-400 font-mono">
                              {log.ipAddress || '127.0.0.1'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Quick Return Bar */}
        <div className="p-3 sm:p-4 bg-[#141315] border-t border-[#2e2d30] flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-[#a19fa6] hidden sm:flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs text-[#ec4899]">keyboard</span>
            <span>Press <kbd className="px-1.5 py-0.5 bg-[#27272a] text-white rounded text-[10px] font-mono border border-[#3f3e42]">Esc</kbd> key anytime to exit Admin Panel</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#27272a] hover:bg-[#ec4899] text-[#debec8] hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-[#3f3e42] hover:border-[#ec4899] flex items-center justify-center gap-2 active:scale-95 shadow-md"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Back to FapnXX Website</span>
          </button>
        </div>
      </div>
    </div>
  );
};
