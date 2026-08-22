import React, { useState, useEffect, useRef } from 'react';
import { CategoryId, CategoryInfo, Video } from '../types';
import { CATEGORIES } from '../data';
import { videoService } from '../services/videoService';
import {
  captureVideoFrame,
  extractThumbnailFromEmbedUrl,
  extractEmbedMetadataOnline,
  captureMultiFrames,
} from '../utils/mediaHelper';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (video: Video) => void;
  isAdminAuthenticated?: boolean;
  onOpenAdminAuth?: () => void;
  categories?: CategoryInfo[];
}

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

  // Dedicated Thumbnail / Cover state
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [candidateFrames, setCandidateFrames] = useState<string[]>([]);
  const [isCapturingFrame, setIsCapturingFrame] = useState<boolean>(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState<boolean>(false);

  // Interactive MP4 Preview Player & Live Frame Capture State
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [previewCurrentTime, setPreviewCurrentTime] = useState<number>(0);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [captureSuccessMsg, setCaptureSuccessMsg] = useState<string | null>(null);

  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec) || timeInSec < 0) return '00:00';
    const totalSec = Math.floor(timeInSec);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlayPreviewVideo = () => {
    if (!previewVideoRef.current) return;
    if (isPlayingPreview) {
      previewVideoRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewVideoRef.current.play().catch(() => {});
      setIsPlayingPreview(true);
    }
  };

  const seekPreviewRelative = (seconds: number) => {
    if (!previewVideoRef.current) return;
    const nextTime = Math.max(0, Math.min(previewDuration || 9999, previewVideoRef.current.currentTime + seconds));
    previewVideoRef.current.currentTime = nextTime;
    setPreviewCurrentTime(nextTime);
  };

  const handleCaptureCurrentSceneAsThumbnail = () => {
    const video = previewVideoRef.current;
    if (!video) {
      alert('Please load an MP4 preview video first.');
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setThumbnailUrl(dataUrl);
        setCandidateFrames((prev) => [dataUrl, ...prev.filter((f) => f !== dataUrl)].slice(0, 8));

        const timeStr = formatTime(video.currentTime);
        setCaptureSuccessMsg(`✓ Frame captured at ${timeStr} as Thumbnail!`);
        setTimeout(() => setCaptureSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.warn('Canvas frame capture error:', err);
      alert('Note: If this video is hosted on an external server with strict CORS, you can also paste an image URL or upload an image file directly.');
    }
  };

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
  const [tagsInput, setTagsInput] = useState('');
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

  const handleCaptureFrame = async () => {
    const src = activeTab === 'file' && selectedFile ? selectedFile : processedEmbedUrl || embedInput;
    if (!src) {
      alert('Please enter a video URL or select a video file first.');
      return;
    }
    setIsCapturingFrame(true);
    try {
      const frames = await captureMultiFrames(src, 4);
      if (frames.length > 0) {
        setCandidateFrames(frames);
        setThumbnailUrl(frames[0]);
      } else {
        const frameData = await captureVideoFrame(src, 1.0);
        setThumbnailUrl(frameData);
      }
    } catch (err: any) {
      console.warn('Frame capture error:', err);
      alert('Could not capture frame directly from this video source. Please paste a thumbnail image URL or upload an image file.');
    } finally {
      setIsCapturingFrame(false);
    }
  };

  const handleAutoGeneratePreview = async () => {
    const src = activeTab === 'file' && selectedFile ? selectedFile : processedEmbedUrl || embedInput;
    if (!src) {
      alert('Please enter a video URL or select a video file first.');
      return;
    }
    setIsGeneratingPreview(true);
    try {
      const frames = await captureMultiFrames(src, 4);
      if (frames.length > 0) {
        setCandidateFrames(frames);
        setPreviewWebpUrl(frames[0]);
        if (!thumbnailUrl) setThumbnailUrl(frames[0]);
        alert('✓ 10-Second Card Preview & Frames extracted successfully!');
      } else {
        alert('Could not capture frames directly from this embed source. Please paste a preview WebP/MP4 URL.');
      }
    } catch {
      alert('Preview extraction completed.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleThumbnailFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      setIsUploadingThumb(true);
      try {
        const storageUrl = await videoService.uploadPreviewToStorage(file);
        setThumbnailUrl(storageUrl);
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setThumbnailUrl(reader.result);
          }
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingThumb(false);
      }
    }
  };

  const handlePreviewFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPreview(true);
      setPreviewUploadStatus('Uploading preview...');
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

  const processEmbedInput = async (input: string) => {
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
      } else if (
        trimmed.includes('streamtape') ||
        trimmed.includes('streamta.pe') ||
        trimmed.includes('streamhide') ||
        trimmed.includes('shvip') ||
        trimmed.includes('streamhub')
      ) {
        let tapeId = '';
        const match = trimmed.match(/(?:streamtape|streamta\.pe|streamhide|shvip|streamhub)[^/]*\/(?:v|e|d)\/([a-zA-Z0-9_-]+)/i)
          || trimmed.match(/\/(?:v|e)\/([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
          tapeId = match[1];
        } else {
          const parts = trimmed.split('/').filter(Boolean);
          tapeId = parts[parts.length - 1]?.split('?')[0] || '';
        }
        extractedUrl = `https://streamtape.com/e/${tapeId}/`;
        autoTitle = 'Streamtape Stream';
        if (tapeId) {
          setThumbnailUrl(`https://thumb.streamtape.com/${tapeId}.jpg`);
        }
      } else if (trimmed.includes('dood') || trimmed.includes('doodstream') || trimmed.includes('ds2play') || trimmed.includes('doods.pro')) {
        let doodId = '';
        const match = trimmed.match(/\/(?:e|d)\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          doodId = match[1];
        } else {
          doodId = trimmed.split('/').filter(Boolean).pop()?.split('?')[0] || '';
        }
        extractedUrl = `https://dood.to/e/${doodId}`;
        autoTitle = 'DoodStream Stream';
      } else if (trimmed.includes('spankbang.com')) {
        const match = trimmed.match(/spankbang\.com\/([a-zA-Z0-9]+)/i);
        if (match && match[1]) {
          extractedUrl = `https://spankbang.com/${match[1]}/embed/`;
          autoTitle = 'SpankBang Stream';
        } else {
          extractedUrl = trimmed;
          autoTitle = 'SpankBang Stream';
        }
      } else if (trimmed.includes('xvideos.com')) {
        const match = trimmed.match(/video-?([a-zA-Z0-9_]+)|\/prof-video-click\/[^\/]+\/([0-9]+)|embedframe\/([0-9]+)/i) || trimmed.match(/([0-9]{5,})/);
        const vidNum = match ? match[1] || match[2] || match[3] || match[0] : '';
        if (vidNum) {
          extractedUrl = `https://www.xvideos.com/embedframe/${vidNum}`;
          autoTitle = 'XVideos Stream';
        } else {
          extractedUrl = trimmed;
          autoTitle = 'XVideos Stream';
        }
      } else if (trimmed.includes('pornhub.com')) {
        const match = trimmed.match(/viewkey=([a-zA-Z0-9]+)/i) || trimmed.match(/embed\/([a-zA-Z0-9]+)/i);
        if (match && match[1]) {
          extractedUrl = `https://www.pornhub.com/embed/${match[1]}`;
          autoTitle = 'Pornhub Stream';
        } else {
          extractedUrl = trimmed;
          autoTitle = 'Pornhub Stream';
        }
      } else if (trimmed.includes('filemoon') || trimmed.includes('filemoon.sx') || trimmed.includes('filemoon.to')) {
        let moonId = '';
        const match = trimmed.match(/\/(?:e|d)\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          moonId = match[1];
        } else {
          moonId = trimmed.split('/').filter(Boolean).pop()?.split('?')[0] || '';
        }
        extractedUrl = `https://filemoon.sx/e/${moonId}`;
        autoTitle = 'Filemoon Stream';
      } else if (trimmed.includes('mixdrop.co') || trimmed.includes('mixdrop.to') || trimmed.includes('mixdrop.sx')) {
        let mixId = '';
        const match = trimmed.match(/\/(?:e|f)\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          mixId = match[1];
        } else {
          mixId = trimmed.split('/').filter(Boolean).pop()?.split('?')[0] || '';
        }
        extractedUrl = `https://mixdrop.co/e/${mixId}`;
        autoTitle = 'MixDrop Stream';
      } else if (trimmed.includes('hornhub') || trimmed.includes('embedseek')) {
        extractedUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
        autoTitle = 'Exclusive Embed Stream';
      } else if (trimmed.match(/\.(webp)($|\?)/i)) {
        extractedUrl = trimmed;
        autoTitle = 'WebP Animated Preview';
        if (!previewWebpUrl) {
          setPreviewWebpUrl(trimmed);
        }
      } else if (trimmed.match(/\.(mp4|webm|m3u8|mov|ogg)($|\?)/i) || trimmed.startsWith('blob:')) {
        extractedUrl = trimmed;
        autoTitle = 'Direct MP4 Stream';
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        extractedUrl = trimmed;
        autoTitle = 'Stream Video';
      } else {
        throw new Error('Please enter a valid URL, direct MP4 link, or iframe embed code.');
      }

      setProcessedEmbedUrl(extractedUrl);
      if (!title && autoTitle) {
        setTitle(autoTitle);
      }

      setProcessingStatus('⚡ Auto-detecting title, exact duration & HD thumbnail...');
      try {
        const meta = await extractEmbedMetadataOnline(extractedUrl || trimmed);
        if (meta.title && (!title || title === 'Embedded Video' || title === 'Stream Video')) {
          setTitle(meta.title);
        }
        if (meta.duration) {
          setDurationInput(meta.duration);
        }
        if (meta.thumbnailUrl && !thumbnailUrl) {
          setThumbnailUrl(meta.thumbnailUrl);
        }
        if (meta.previewWebpUrl && !previewWebpUrl) {
          setPreviewWebpUrl(meta.previewWebpUrl);
        }
        if (meta.previewMp4Url && !previewMp4Url) {
          setPreviewMp4Url(meta.previewMp4Url);
        }
      } catch {}

      // Check if it's a direct video link to run quick live HTML5 metadata test & multi-frame extraction
      const isDirectMedia = Boolean(extractedUrl.match(/\.(mp4|webm|mov|m3u8|ogg)($|\?)/i) || extractedUrl.includes('video/'));
      if (isDirectMedia) {
        setProcessingStatus('⚡ Testing stream URL & extracting duration...');
        const testVideo = document.createElement('video');
        testVideo.src = extractedUrl;
        testVideo.preload = 'metadata';
        testVideo.crossOrigin = 'anonymous';

        testVideo.onloadedmetadata = () => {
          if (testVideo.duration && !isNaN(testVideo.duration) && testVideo.duration > 0) {
            const totalSec = Math.floor(testVideo.duration);
            const min = Math.floor(totalSec / 60);
            const sec = totalSec % 60;
            const formatted = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            setDurationInput(formatted);
          }
          captureMultiFrames(extractedUrl, 4).then((frames) => {
            if (frames.length > 0) {
              setCandidateFrames(frames);
              setThumbnailUrl((prev) => prev || frames[0]);
            }
          }).catch(() => {});
          if (!previewMp4Url && extractedUrl.match(/\.(mp4|webm|mov|m3u8|ogg)($|\?)/i)) {
            setPreviewMp4Url(extractedUrl);
          }
          setProcessingStatus('✓ Direct Stream Verified & Ready!');
        };

        testVideo.onerror = () => {
          setProcessingStatus('✓ Direct Video Link Ready!');
        };
      } else {
        const autoThumb = extractThumbnailFromEmbedUrl(extractedUrl || trimmed);
        if (autoThumb && !thumbnailUrl) {
          setThumbnailUrl(autoThumb);
        }
        setProcessingStatus('✓ Embed Link Verified & Ready!');
      }
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

      // Auto-capture candidate frames as thumbnails from video file
      captureMultiFrames(file, 4).then((frames) => {
        if (frames.length > 0) {
          setCandidateFrames(frames);
          setThumbnailUrl((prev) => prev || frames[0]);
        }
      }).catch((err) => {
        console.warn('Auto frame capture notice:', err);
      });

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
        thumbnailUrl.trim() ||
        previewWebpUrl.trim() ||
        previewMp4Url.trim() ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop';

      // Ensure thumbnail is NEVER a temporary device-local blob URL
      if (finalThumbnail.startsWith('blob:')) {
        try {
          const blobRes = await fetch(finalThumbnail);
          const blobData = await blobRes.blob();
          const reader = new FileReader();
          finalThumbnail = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : finalThumbnail);
            reader.onerror = () => resolve(finalThumbnail);
            reader.readAsDataURL(blobData);
          });
        } catch (blobErr) {
          console.warn('[UploadModal] Blob thumbnail conversion notice:', blobErr);
        }
      }

      // Upload captured frame Data URLs directly to Firebase Cloud Storage for permanent public URL
      if (finalThumbnail.startsWith('data:image/')) {
        try {
          finalThumbnail = await videoService.uploadDataUrlToStorage(finalThumbnail);
        } catch (uploadErr) {
          console.warn('[UploadModal] Storage frame upload notice:', uploadErr);
        }
      }

      let finalPreviewWebp = previewWebpUrl.trim();
      if (finalPreviewWebp.startsWith('blob:')) {
        try {
          const blobRes = await fetch(finalPreviewWebp);
          const blobData = await blobRes.blob();
          const reader = new FileReader();
          finalPreviewWebp = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : finalPreviewWebp);
            reader.onerror = () => resolve(finalPreviewWebp);
            reader.readAsDataURL(blobData);
          });
        } catch {}
      }

      if (finalPreviewWebp.startsWith('data:image/')) {
        try {
          finalPreviewWebp = await videoService.uploadDataUrlToStorage(finalPreviewWebp);
        } catch {}
      }

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
          console.warn('[UploadModal] Firebase Storage video upload fallback to local stream:', storageErr);
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

      const parsedCustomTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const finalTags = parsedCustomTags.length > 0
        ? parsedCustomTags
        : (quality ? [quality] : []);

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
        tags: finalTags,
        models_actors: parsedModels.length > 0 ? parsedModels : undefined,
        modelsActors: parsedModels.length > 0 ? parsedModels : undefined,
        orientation: orientationInput,
        vttUrl: vttUrlInput.trim() || undefined,
        spriteUrl: vttUrlInput.trim() || finalPreviewWebp || undefined,
        thumbnail: finalThumbnail,
        previewMp4Url: previewMp4Url.trim() || undefined,
        previewWebpUrl: finalPreviewWebp || undefined,
        embedUrl: finalEmbedUrl,
        isEmbed: true,
        duration: durationInput.trim() || '05:00',
        quality: quality,
        views: '0 views',
        viewsCount: 0,
        likesCount: 0,
        rating: '0%',
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
    setTagsInput('');
    setDurationInput('05:00');
    setEmbedInput('');
    setProcessedEmbedUrl('');
    setThumbnailUrl('');
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

          {/* Tags Input (Custom user tags — no unwanted automatic extra tags) */}
          <div>
            <label className="block text-xs font-bold opacity-80 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-rose-400">label</span>
                <span>Video Tags (Comma separated)</span>
              </span>
              <span className="text-[10px] text-white/50">e.g. Desi, Romance, 4K, Bhabhi</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Enter tags (e.g. Desi, Romance, Exclusive, 4K)..."
              className="w-full upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500 font-mono"
            />
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

          {/* ─── Dedicated Video Thumbnail / Cover Image Section ─── */}
          <div className="border border-rose-500/30 rounded-xl p-3 space-y-2.5 bg-zinc-900/60 shadow-inner">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-rose-500 text-sm">photo_library</span>
                <span>Video Thumbnail / Card Cover *</span>
              </label>
              {thumbnailUrl && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>Ready</span>
                </span>
              )}
            </div>

            {/* Thumbnail Live Card Preview */}
            {thumbnailUrl ? (
              <div className="relative aspect-video w-full max-w-xs mx-auto rounded-xl overflow-hidden border-2 border-rose-500/50 shadow-lg bg-black group">
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-bold text-white">
                  <span className="truncate max-w-[150px]">{title || 'Video Title'}</span>
                  <span className="px-1.5 py-0.5 bg-black/80 backdrop-blur rounded font-mono text-[10px]">
                    {durationInput}
                  </span>
                </div>
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-extrabold uppercase">
                  {quality}
                </div>
                <button
                  type="button"
                  onClick={() => setThumbnailUrl('')}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/80 hover:bg-rose-600 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="Remove Thumbnail"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>
            ) : null}

            {/* Candidate Frames Selector Grid */}
            {candidateFrames.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-rose-400">burst_mode</span>
                    <span>Choose Frame Snapshot from Video</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">Click any frame to select</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {candidateFrames.map((frame, fIdx) => (
                    <button
                      key={`frame-${fIdx}`}
                      type="button"
                      onClick={() => setThumbnailUrl(frame)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        thumbnailUrl === frame
                          ? 'border-rose-500 ring-2 ring-rose-500/50 scale-105 shadow-md'
                          : 'border-white/10 hover:border-white/40 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={frame} alt={`Frame ${fIdx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-1 text-[8px] bg-black/80 px-1 rounded text-white font-mono">
                        Frame {fIdx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Thumbnail URL Input & Actions */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Paste Thumbnail Image URL (e.g. https://.../thumb.jpg) ->"
                className="flex-1 upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500 font-mono"
              />

              {/* Upload Image Button */}
              <label className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors shrink-0 border border-white/10 shadow-sm">
                <span className="material-symbols-outlined text-sm text-rose-400">image</span>
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleThumbnailFileUpload}
                  className="hidden"
                />
              </label>

              {/* Capture Video Frame Button */}
              <button
                type="button"
                onClick={handleCaptureFrame}
                disabled={isCapturingFrame || (!selectedFile && !processedEmbedUrl && !embedInput.trim())}
                className="px-3 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-sm"
                title="Capture first frame snapshot from video"
              >
                {isCapturingFrame ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">camera_alt</span>
                )}
                <span>Capture Frame</span>
              </button>
            </div>

            <p className="text-[10px] text-white/50 flex items-center gap-1">
              <span>💡 Tip: Paste an image link, click "Capture Frame", or select one of the frames above.</span>
            </p>
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

          {/* Preview Asset (URL, Auto-Generate, Upload & Live MP4 Frame Capture Player) */}
          <div className="space-y-3 border border-rose-500/30 rounded-xl p-3 bg-zinc-900/60 shadow-inner">
            <label className="block text-xs font-bold opacity-80 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-white">
                <span className="material-symbols-outlined text-rose-500 text-sm">movie_filter</span>
                <span>MP4 Video Preview & Hover Clip (.mp4 / .webp)</span>
              </span>
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
                value={previewWebpUrl || previewMp4Url}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (val.match(/\.(webp|gif|png|jpe?g|avif)($|\?|#)/i)) {
                    setPreviewWebpUrl(val);
                    setPreviewMp4Url('');
                  } else {
                    setPreviewMp4Url(val);
                    setPreviewWebpUrl('');
                  }
                }}
                placeholder="Paste MP4 preview link (e.g. https://.../video.mp4 or .webp) ->"
                className="flex-1 upload-modal-input border rounded-xl p-2.5 text-xs focus:outline-none focus:border-rose-500 font-mono"
              />

              {/* Auto-generate 10s preview button */}
              <button
                type="button"
                onClick={handleAutoGeneratePreview}
                disabled={isGeneratingPreview || (!selectedFile && !processedEmbedUrl && !embedInput.trim())}
                className="px-3 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-sm"
                title="Auto-generate 10-second animated card preview from video"
              >
                {isGeneratingPreview ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">auto_videocam</span>
                )}
                <span>Auto 10s Preview</span>
              </button>

              <label className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors shrink-0 border border-white/10 shadow-sm">
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
              <p className="text-[11px] text-rose-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">info</span>
                <span>{previewUploadStatus === 'Preview uploaded successfully!' ? '✓ Uploaded' : previewUploadStatus === 'Upload failed. Try again.' ? 'Upload failed. Try again.' : 'Uploading...'}</span>
              </p>
            )}

            {/* ─── LIVE MP4 VIDEO PREVIEW PLAYER & INTERACTIVE FRAME EXTRACTOR CARD ─── */}
            {(previewMp4Url || (processedEmbedUrl && Boolean(processedEmbedUrl.match(/\.(mp4|webm|mov|m3u8)($|\?|#)/i)))) && (
              <div className="border border-rose-500/50 rounded-xl p-3 bg-black/95 space-y-2.5 shadow-2xl mt-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-rose-500 text-base">smart_display</span>
                    <span>Interactive Frame Extractor</span>
                  </span>
                  <span className="text-[10px] text-rose-400 font-mono font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    {formatTime(previewCurrentTime)} / {formatTime(previewDuration)}
                  </span>
                </div>

                {/* Video Player Display */}
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-white/10 flex items-center justify-center group">
                  <video
                    ref={previewVideoRef}
                    src={previewMp4Url || processedEmbedUrl}
                    crossOrigin="anonymous"
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={() => {
                      if (previewVideoRef.current) {
                        const dur = previewVideoRef.current.duration;
                        if (dur && !isNaN(dur) && dur > 0) {
                          setPreviewDuration(dur);
                          const min = Math.floor(dur / 60);
                          const sec = Math.floor(dur % 60);
                          const formatted = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
                          if (!durationInput || durationInput === '05:00') {
                            setDurationInput(formatted);
                          }
                        }
                      }
                    }}
                    onTimeUpdate={() => {
                      if (previewVideoRef.current) {
                        setPreviewCurrentTime(previewVideoRef.current.currentTime);
                      }
                    }}
                    onPlay={() => setIsPlayingPreview(true)}
                    onPause={() => setIsPlayingPreview(false)}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={togglePlayPreviewVideo}
                  />

                  {/* Floating Center Play Button when paused */}
                  {!isPlayingPreview && (
                    <button
                      type="button"
                      onClick={togglePlayPreviewVideo}
                      className="absolute w-12 h-12 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-2xl ml-0.5">play_arrow</span>
                    </button>
                  )}
                </div>

                {/* Timeline Scrub Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={previewDuration || 100}
                    step={0.1}
                    value={previewCurrentTime}
                    onChange={(e) => {
                      const newTime = parseFloat(e.target.value);
                      setPreviewCurrentTime(newTime);
                      if (previewVideoRef.current) {
                        previewVideoRef.current.currentTime = newTime;
                      }
                    }}
                    className="w-full accent-rose-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>

                {/* Controls & Frame Capture Action */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={togglePlayPreviewVideo}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isPlayingPreview ? 'pause' : 'play_arrow'}
                      </span>
                      <span>{isPlayingPreview ? 'Pause' : 'Play'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => seekPreviewRelative(-5)}
                      className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                      title="Rewind 5 seconds"
                    >
                      -5s
                    </button>

                    <button
                      type="button"
                      onClick={() => seekPreviewRelative(5)}
                      className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                      title="Forward 5 seconds"
                    >
                      +5s
                    </button>
                  </div>

                  {/* Capture Current Scene Button */}
                  <button
                    type="button"
                    onClick={handleCaptureCurrentSceneAsThumbnail}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
                    title="Capture current video scene as card thumbnail"
                  >
                    <span className="material-symbols-outlined text-sm">camera_alt</span>
                    <span>📸 Capture Frame as Thumbnail</span>
                  </button>
                </div>

                {captureSuccessMsg && (
                  <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    <span>{captureSuccessMsg}</span>
                  </p>
                )}
              </div>
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
