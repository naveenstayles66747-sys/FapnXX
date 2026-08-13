import React, { useState, useEffect } from 'react';
import { CategoryId, CategoryInfo, Video } from '../types';
import { CATEGORIES } from '../data';
import { videoService } from '../services/videoService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (video: Video) => void;
  isAdminAuthenticated?: boolean;
  onOpenAdminAuth?: () => void;
  categories?: CategoryInfo[];
}

export const smartAutoConvertPreviewUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (url.match(/\.(webp|gif|png|jpe?g)($|\?|#)/i)) {
    url = url.replace(/\.(webp|gif|png|jpe?g)($|\?|#)/i, '.mp4$2');
  }
  return url;
};

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  isAdminAuthenticated = false,
  categories = CATEGORIES,
}) => {
  const [activeTab, setActiveTab] = useState<'embed' | 'file'>('embed');
  const [isPublishing, setIsPublishing] = useState(false);

  // Embed link input & processing state
  const [embedInput, setEmbedInput] = useState('');
  const [isProcessingLink, setIsProcessingLink] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [processedEmbedUrl, setProcessedEmbedUrl] = useState<string>('');
  const [linkError, setLinkError] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Revoke Blob URLs on unmount or filePreviewUrl change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Video metadata form fields
  const [title, setTitle] = useState('');
  const [durationInput, setDurationInput] = useState<string>('05:00');
  const [category, setCategory] = useState<CategoryId>('trending');
  const [isRequestingCategory, setIsRequestingCategory] = useState<boolean>(false);
  const [requestedCategoryName, setRequestedCategoryName] = useState<string>('');
  const [description, setDescription] = useState('');
  const [quality, setQuality] = useState<'4K' | 'HD' | 'UHD'>('HD');
  const [performerName, setPerformerName] = useState(isAdminAuthenticated ? 'Admin' : 'Anonymous');
  const [previewMp4Url, setPreviewMp4Url] = useState('');
  const [previewWebpUrl, setPreviewWebpUrl] = useState('');
  const [modelsActorsInput, setModelsActorsInput] = useState('');
  const [orientationInput, setOrientationInput] = useState<'horizontal' | 'vertical' | 'vr'>('horizontal');
  const [vttUrlInput, setVttUrlInput] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(['trending']);
  const [isUploadingPreview, setIsUploadingPreview] = useState<boolean>(false);
  const [previewUploadStatus, setPreviewUploadStatus] = useState<string | null>(null);
  // Credit & copyright fields
  const [performersInput, setPerformersInput] = useState('');
  const [channelNameInput, setChannelNameInput] = useState('');
  const [sourceWebsiteInput, setSourceWebsiteInput] = useState('');
  const [sourceWebsiteUrlInput, setSourceWebsiteUrlInput] = useState('');

  const handlePreviewFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPreview(true);
      setPreviewUploadStatus('Uploading preview to Firebase Storage...');
      try {
        const storageUrl = await videoService.uploadPreviewToStorage(file);
        if (file.name.toLowerCase().endsWith('.webp') || file.type === 'image/webp') {
          setPreviewWebpUrl(storageUrl);
        } else {
          setPreviewMp4Url(storageUrl);
        }
        setPreviewUploadStatus('Preview uploaded successfully!');
      } catch (err: any) {
        console.error('[UploadModal] Firebase Storage preview upload failed:', err);
        setPreviewUploadStatus('Upload failed. Try again.');
      } finally {
        setIsUploadingPreview(false);
      }
    }
  };

  // Auto-process embed link whenever embedInput changes
  useEffect(() => {
    if (activeTab !== 'embed' || !embedInput.trim()) {
      setProcessingStatus(null);
      setLinkError(null);
      setProcessedEmbedUrl('');
      return;
    }

    const timer = setTimeout(() => {
      processEmbedInput(embedInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [embedInput, activeTab]);

  const processEmbedInput = (input: string) => {
    setIsProcessingLink(true);
    setLinkError(null);
    setProcessingStatus('Processing link...');

    try {
      const trimmed = input.trim();
      let extractedUrl = '';
      let autoTitle = '';

      if (trimmed.includes('<iframe')) {
        const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
        if (srcMatch && srcMatch[1]) {
          extractedUrl = srcMatch[1];
          autoTitle = 'Embedded Video';
        } else {
          throw new Error('Invalid <iframe> tag.');
        }
      } else if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
        let videoId = '';
        if (trimmed.includes('youtu.be/')) videoId = trimmed.split('youtu.be/')[1]?.split('?')[0] || '';
        else if (trimmed.includes('watch?v=')) videoId = trimmed.split('watch?v=')[1]?.split('&')[0] || '';
        else if (trimmed.includes('embed/')) videoId = trimmed.split('embed/')[1]?.split('?')[0] || '';

        if (videoId) {
          extractedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
          autoTitle = 'YouTube Stream';
        } else {
          throw new Error('Invalid YouTube URL.');
        }
      } else if (trimmed.includes('vimeo.com')) {
        const vimeoId = trimmed.split('vimeo.com/')[1]?.split('?')[0] || '';
        if (vimeoId) {
          extractedUrl = `https://player.vimeo.com/video/${vimeoId}`;
          autoTitle = 'Vimeo Stream';
        } else {
          throw new Error('Invalid Vimeo URL.');
        }
      } else if (trimmed.match(/\.(webp)($|\?)/i)) {
        extractedUrl = trimmed;
        autoTitle = 'WebP Animated Preview';
        if (!previewWebpUrl) {
          setPreviewWebpUrl(trimmed);
        }
      } else if (trimmed.match(/\.(mp4|webm|m3u8|mov)($|\?)/i)) {
        extractedUrl = trimmed;
        autoTitle = 'Direct MP4 Stream';
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        extractedUrl = trimmed;
        autoTitle = 'Stream Video';
      } else {
        throw new Error('Please enter a valid URL or iframe embed code.');
      }

      setProcessedEmbedUrl(extractedUrl);
      if (!title && autoTitle) {
        setTitle(autoTitle);
      }
      setProcessingStatus('Link ready!');
    } catch (err: any) {
      setLinkError(err.message || 'Could not parse link.');
      setProcessedEmbedUrl('');
      setProcessingStatus(null);
    } finally {
      setIsProcessingLink(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('Please select a valid video file (MP4, WebM, MOV).');
        return;
      }
      setSelectedFile(file);
      const blobUrl = URL.createObjectURL(file);
      setFilePreviewUrl(blobUrl);
      if (!title) {
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(fileNameWithoutExt);
      }

      // Auto-detect exact video duration from HTML5 video metadata
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        if (tempVideo.duration && !isNaN(tempVideo.duration) && tempVideo.duration > 0) {
          const totalSec = Math.floor(tempVideo.duration);
          const min = Math.floor(totalSec / 60);
          const sec = totalSec % 60;
          const formatted = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
          setDurationInput(formatted);
        }
      };
      tempVideo.src = blobUrl;
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a video title.');
      return;
    }

    if (activeTab === 'embed' && !processedEmbedUrl && !embedInput.trim()) {
      alert('Please paste a valid video link or iframe embed code.');
      return;
    }

    if (activeTab === 'file' && !selectedFile && !filePreviewUrl) {
      alert('Please select a video file to upload.');
      return;
    }

    setIsPublishing(true);

    try {
      let finalEmbedUrl = processedEmbedUrl || embedInput.trim();
      let finalThumbnail =
        previewWebpUrl.trim() ||
        previewMp4Url.trim() ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop';

      if (activeTab === 'file' && selectedFile) {
        setIsUploadingFile(true);
        setUploadProgress(10);
        try {
          const storageVideoUrl = await videoService.uploadVideoFileToStorage(
            selectedFile,
            (percent) => setUploadProgress(percent)
          );
          finalEmbedUrl = storageVideoUrl;
        } catch (storageErr) {
          console.warn('[UploadModal] Firebase Storage video upload fallback to local blob:', storageErr);
          if (filePreviewUrl) {
            finalEmbedUrl = filePreviewUrl;
          }
        }
      }

      if (isRequestingCategory && requestedCategoryName.trim()) {
        try {
          await videoService.saveCategoryRequest({
            id: `cat-req-${Date.now()}`,
            categoryName: requestedCategoryName.trim(),
            createdAt: new Date().toISOString(),
            status: 'pending',
          });
        } catch (catErr) {
          console.warn('Category request saved locally:', catErr);
        }
      }

      const parsedModels = modelsActorsInput
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);

      const generatedId = `vid-user-${Date.now()}`;
      const newVideo: Video = {
        id: generatedId,
        title: title.trim(),
        category: isRequestingCategory ? 'trending' : category,
        categoryLabel:
          categories.find((c) => c.id === category)?.name ||
          (isRequestingCategory ? requestedCategoryName.trim() : 'Trending'),
        categories: selectedCategoryIds.length > 0 ? selectedCategoryIds : [category],
        tags: ['UserUpload', quality, 'Featured', ...parsedModels],
        models_actors: parsedModels.length > 0 ? parsedModels : [performerName.trim() || 'Anonymous'],
        modelsActors: parsedModels.length > 0 ? parsedModels : [performerName.trim() || 'Anonymous'],
        orientation: orientationInput,
        vttUrl: vttUrlInput.trim() || undefined,
        spriteUrl: vttUrlInput.trim() || previewWebpUrl.trim() || undefined,
        thumbnail: finalThumbnail,
        previewMp4Url: previewMp4Url.trim() || (previewWebpUrl.trim() ? smartAutoConvertPreviewUrl(previewWebpUrl.trim()) : undefined),
        previewWebpUrl: previewWebpUrl.trim() || undefined,
        embedUrl: finalEmbedUrl,
        isEmbed: true,
        duration: durationInput.trim() || '05:00',
        quality: quality,
        views: '1 view',
        viewsCount: 1,
        rating: '100%',
        timeAgo: 'Just now',
        createdAt: new Date().toISOString(),
        performerName: performerName.trim() || 'Anonymous',
        performerAvatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
        description: description.trim() || '',
        isNew: true,
        // Credit & copyright attribution fields
        performers: performersInput.trim()
          ? performersInput.split(',').map((p) => p.trim()).filter(Boolean)
          : parsedModels.length > 0 ? parsedModels : undefined,
        channelName: channelNameInput.trim() || undefined,
        sourceWebsite: sourceWebsiteInput.trim() || undefined,
        sourceWebsiteUrl: sourceWebsiteUrlInput.trim() || undefined,
      };

      await videoService.saveVideo(newVideo);
      onUploadSuccess(newVideo);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Publish error:', err);
      alert('Error publishing video. Please try again.');
    } finally {
      setIsPublishing(false);
      setIsUploadingFile(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDurationInput('05:00');
    setEmbedInput('');
    setProcessedEmbedUrl('');
    setLinkError(null);
    setProcessingStatus(null);
    setSelectedFile(null);
    if (filePreviewUrl && filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    setDescription('');
    setPreviewMp4Url('');
    setPreviewWebpUrl('');
    setModelsActorsInput('');
    setOrientationInput('horizontal');
    setVttUrlInput('');
    setSelectedCategoryIds(['trending']);
    setIsRequestingCategory(false);
    setRequestedCategoryName('');
    setPerformersInput('');
    setChannelNameInput('');
    setSourceWebsiteInput('');
    setSourceWebsiteUrlInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      {/* Main Upload Modal Container */}
      <div className="w-full max-w-lg max-h-[88vh] md:max-h-[82vh] flex flex-col upload-modal-card border rounded-2xl shadow-2xl overflow-hidden relative z-[105] transition-all">
        {/* Header */}
        <div className="px-5 py-4 border-b upload-modal-header flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">file_upload</span>
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Upload Video</h2>
              <p className="text-xs opacity-75">Share video with the community</p>
            </div>
          </div>

          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Close Window"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 custom-scrollbar">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border upload-modal-header">
            <button
              type="button"
              onClick={() => setActiveTab('embed')}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'embed'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'upload-modal-tab-unselected'
              }`}
            >
              <span className="material-symbols-outlined text-base">link</span>
              <span>Paste Video Link</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'upload-modal-tab-unselected'
              }`}
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>Upload Video File</span>
            </button>
          </div>

          {/* Embed Link Input */}
          {activeTab === 'embed' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold opacity-80">
                Video Link or Embed Code *
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={embedInput}
                  onChange={(e) => setEmbedInput(e.target.value)}
                  placeholder="Paste YouTube URL, Vimeo link, direct MP4 link, or <iframe src='...'> code..."
                  className="w-full upload-modal-input border rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all resize-none"
                />
                {isProcessingLink && (
                  <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 text-[11px] text-rose-500 font-semibold bg-black/70 px-2 py-0.5 rounded border border-rose-500/20">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                    Processing...
                  </div>
                )}
              </div>

              {processingStatus && !linkError && (
                <p className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>{processingStatus}</span>
                </p>
              )}

              {linkError && (
                <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>{linkError}</span>
                </p>
              )}
            </div>
          )}

          {/* Video File Drag-and-Drop Input */}
          {activeTab === 'file' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold opacity-80">
                Select Video File (MP4, WebM, MOV) *
              </label>
              <div className="border-2 border-dashed border-rose-500/40 hover:border-rose-500 transition-colors rounded-xl p-4 text-center upload-modal-input relative group cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                <span className="material-symbols-outlined text-3xl text-rose-500 mb-1 group-hover:scale-110 transition-transform">
                  cloud_upload
                </span>
                <p className="text-xs font-bold truncate max-w-xs mx-auto">
                  {selectedFile ? selectedFile.name : 'Click or drag video file here'}
                </p>
                <p className="text-[10px] opacity-70 mt-0.5">MP4, WebM up to 2GB</p>
              </div>

              {isUploadingFile && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] opacity-80">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Fields: Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold opacity-80 mb-1">
                Video Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Desi Romance Scene 4K"
                className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold opacity-80">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsRequestingCategory(!isRequestingCategory)}
                  className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-xs">add_circle</span>
                  <span>{isRequestingCategory ? 'Select' : '+ New'}</span>
                </button>
              </div>

              {!isRequestingCategory ? (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === 'request_new') {
                      setIsRequestingCategory(true);
                    } else {
                      setIsRequestingCategory(false);
                      setCategory(e.target.value as CategoryId);
                    }
                  }}
                  className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="request_new">➕ Request New Category</option>
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={requestedCategoryName}
                  onChange={(e) => setRequestedCategoryName(e.target.value)}
                  placeholder="Category name (e.g. Bhabhi)..."
                  className="w-full upload-modal-input border border-rose-500 rounded-xl p-2.5 text-xs focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Form Fields: Quality, Duration & Performer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold opacity-80 mb-1">
                Quality
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as '4K' | 'HD' | 'UHD')}
                className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500"
              >
                <option value="HD">HD 1080p</option>
                <option value="4K">4K Ultra HD</option>
                <option value="UHD">UHD Cinema</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold opacity-80 mb-1">
                Duration (mm:ss) *
              </label>
              <input
                type="text"
                required
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                placeholder="e.g. 10:45 or 05:30"
                className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500 font-mono"
              />
              <p className="text-[10px] text-rose-400 font-mono mt-1">
                ⏱️ Set exact video length (e.g. 12:45) for embed links
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold opacity-80 mb-1">
                Pornstar Name
              </label>
              <input
                type="text"
                value={performerName}
                onChange={(e) => setPerformerName(e.target.value)}
                placeholder="e.g. Creator Name"
                className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Extended Taxonomy: Models/Actors & Orientation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold opacity-80 mb-1">
                Models / Actors (Comma separated)
              </label>
              <input
                type="text"
                value={modelsActorsInput}
                onChange={(e) => setModelsActorsInput(e.target.value)}
                placeholder="e.g. Model A, Actor B"
                className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold opacity-80 mb-1">
                Video Orientation
              </label>
              <select
                value={orientationInput}
                onChange={(e) => setOrientationInput(e.target.value as any)}
                className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500"
              >
                <option value="horizontal">Horizontal (Standard 16:9)</option>
                <option value="vertical">Vertical (Shorts / Reel 9:16)</option>
                <option value="vr">VR (360° / 180°)</option>
              </select>
            </div>
          </div>

          {/* ─── Credit & Copyright Attribution ─── */}
          <div className="border border-rose-500/20 rounded-xl p-3 space-y-3 bg-rose-500/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-rose-400 text-base">verified_user</span>
              <span className="text-xs font-black text-rose-400 uppercase tracking-wider">Credit & Copyright Attribution</span>
            </div>
            <p className="text-[10px] text-white/50">Fill these to give proper credit and reduce copyright claims.</p>

            {/* Performers / Stars */}
            <div>
              <label className="block text-xs font-bold opacity-80 mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-rose-400">star</span>
                Pornstar(s) — Comma separated
              </label>
              <input
                type="text"
                value={performersInput}
                onChange={(e) => setPerformersInput(e.target.value)}
                placeholder="e.g. Reese Rideout, Kasey Kei, Bella Joie"
                className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Channel Name & Source Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold opacity-80 mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-rose-400">subscriptions</span>
                  Channel Name
                </label>
                <input
                  type="text"
                  value={channelNameInput}
                  onChange={(e) => setChannelNameInput(e.target.value)}
                  placeholder="e.g. Transfixed"
                  className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold opacity-80 mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-rose-400">language</span>
                  Source Website
                </label>
                <input
                  type="text"
                  value={sourceWebsiteInput}
                  onChange={(e) => setSourceWebsiteInput(e.target.value)}
                  placeholder="e.g. Adult Time, Brazzers"
                  className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Source Website URL */}
            <div>
              <label className="block text-xs font-bold opacity-80 mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-rose-400">link</span>
                Source Website URL (Optional)
              </label>
              <input
                type="url"
                value={sourceWebsiteUrlInput}
                onChange={(e) => setSourceWebsiteUrlInput(e.target.value)}
                placeholder="https://www.adulttime.com"
                className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          {/* VTT Sprite Sheet URL for Seekbar Hover Scrubbing */}
          <div>
            <label className="block text-xs font-bold opacity-80 mb-1">
              Player Seekbar VTT / Sprite Sheet URL (Optional)
            </label>
            <input
              type="url"
              value={vttUrlInput}
              onChange={(e) => setVttUrlInput(e.target.value)}
              placeholder="https://example.com/thumbnails.vtt or sprite-sheet image URL..."
              className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {/* Preview Asset (URL or Upload) */}
          <div>
            <label className="block text-xs font-bold opacity-80 mb-1 flex items-center justify-between">
              <span>Hover Preview Asset (.webp / .gif / .mp4)</span>
              {isUploadingPreview && (
                <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
                  <span className="w-2.5 h-2.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </span>
              )}
            </label>

            <div className="flex items-center gap-2">
              <input
                type="url"
                value={previewMp4Url || previewWebpUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  const converted = smartAutoConvertPreviewUrl(val);
                  setPreviewMp4Url(converted);
                  setPreviewWebpUrl('');
                }}
                placeholder="Paste preview link (e.g. https://domain.com/preview.webp auto-converts to .mp4) ->"
                className="flex-1 upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500 font-mono"
              />

              <label className="px-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-sm">cloud_upload</span>
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/webp,image/gif,image/png,image/jpeg,video/mp4,video/webm"
                  onChange={handlePreviewFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {previewUploadStatus && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">info</span>
                <span>{previewUploadStatus}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold opacity-80 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description..."
              className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          {/* Hidden Submit Button to allow Enter key submission */}
          <button type="submit" className="hidden" />
        </form>

        {/* Fixed Footer Actions */}
        <div className="px-5 py-3.5 border-t upload-modal-footer flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl border text-xs font-bold opacity-80 hover:opacity-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || (activeTab === 'embed' && !processedEmbedUrl && !embedInput.trim())}
            className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isPublishing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <span>Publish Video</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
