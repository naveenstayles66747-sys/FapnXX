import React from 'react';

// Default high-quality fallbacks for categories (Optimized WebP with compression)
export const DEFAULT_CATEGORY_FALLBACKS: Record<string, string> = {
  trending: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=75&w=800&auto=format&fit=crop',
  amateur: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=75&w=800&auto=format&fit=crop',
  milf: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=75&w=800&auto=format&fit=crop',
  teen: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=75&w=800&auto=format&fit=crop',
  desi: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=75&w=800&auto=format&fit=crop',
  anal: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=75&w=800&auto=format&fit=crop',
  lesbian: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=75&w=800&auto=format&fit=crop',
  asian: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=75&w=800&auto=format&fit=crop',
  pov: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=75&w=800&auto=format&fit=crop',
  hentai: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=75&w=800&auto=format&fit=crop',
  vr: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=75&w=800&auto=format&fit=crop',
};

// Default high-quality fallbacks for 6 Home Banners (Optimized 1600px width with quality 75 for instant LCP)
export const DEFAULT_BANNER_FALLBACKS: string[] = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=75&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=75&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=75&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=75&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=75&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=75&w=1600&auto=format&fit=crop',
];

/**
 * Resolves the category hero image path:
 * 1. Checks if custom valid external URL (not placeholder) is set
 * 2. Directly uses CDN fallback to prevent 404 roundtrips
 */
export function getCategoryHeroImage(category: { id: string; name?: string; heroImage?: string }): string {
  const slug = (category.id || category.name || 'default').toLowerCase().trim().replace(/\s+/g, '-');
  
  if (category.heroImage && !category.heroImage.includes('lh3.googleusercontent.com') && !category.heroImage.includes('placeholder') && category.heroImage.startsWith('http')) {
    return category.heroImage;
  }

  return DEFAULT_CATEGORY_FALLBACKS[slug] || DEFAULT_CATEGORY_FALLBACKS['trending'];
}

/**
 * Resolves banner image path for 1-6 banners:
 * 1. If bannerImage is custom external valid URL, use it
 * 2. Otherwise directly use fast CDN fallback
 */
export function getBannerImageUrl(banner: { id?: string; bannerImage?: string }, index: number): string {
  if (banner.bannerImage && !banner.bannerImage.includes('lh3.googleusercontent.com') && !banner.bannerImage.includes('placeholder') && banner.bannerImage.startsWith('http')) {
    return banner.bannerImage;
  }

  const bannerIndex = index % DEFAULT_BANNER_FALLBACKS.length;
  return DEFAULT_BANNER_FALLBACKS[bannerIndex];
}

/**
 * Optimizes an image URL for modern delivery (WebP/AVIF format auto-negotiation, custom width, and quality)
 */
export function getOptimizedImageUrl(url?: string, width: number = 1200, quality: number = 75): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Handle Unsplash images with dynamic format & size negotiation
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const urlObj = new URL(trimmed);
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('fit', 'crop');
      urlObj.searchParams.set('w', width.toString());
      urlObj.searchParams.set('q', quality.toString());
      return urlObj.toString();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Generates a responsive srcset string for multi-resolution devices (mobile, tablet, desktop)
 */
export function getResponsiveImageSrcSet(url?: string, widths: number[] = [640, 1080, 1600], quality: number = 75): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  if (trimmed.includes('images.unsplash.com')) {
    return widths
      .map((w) => `${getOptimizedImageUrl(trimmed, w, quality)} ${w}w`)
      .join(', ');
  }

  return '';
}

/**
 * Handle category image loading error by trying fallback image
 */
export function handleCategoryImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, categoryId: string) {
  const target = e.currentTarget;
  const slug = categoryId.toLowerCase();
  const fallback = DEFAULT_CATEGORY_FALLBACKS[slug] || DEFAULT_CATEGORY_FALLBACKS['trending'];

  if (target.src !== fallback) {
    target.src = fallback;
  }
}

/**
 * Handle banner image loading error by falling back to curated HD backdrop
 */
export function handleBannerImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, index: number) {
  const target = e.currentTarget;
  const fallback = DEFAULT_BANNER_FALLBACKS[index % DEFAULT_BANNER_FALLBACKS.length];

  if (target.src !== fallback) {
    target.src = fallback;
  }
}

/**
 * Automatically extracts a high-quality thumbnail URL from various embed / video URLs
 */
export function extractThumbnailFromEmbedUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // If already an image link (jpg, png, webp, etc.)
  if (/\.(jpe?g|png|webp|gif|avif)($|\?)/i.test(trimmed)) {
    return trimmed;
  }

  // YouTube
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    let videoId = '';
    if (trimmed.includes('youtu.be/')) videoId = trimmed.split('youtu.be/')[1]?.split('?')[0] || '';
    else if (trimmed.includes('watch?v=')) videoId = trimmed.split('watch?v=')[1]?.split('&')[0] || '';
    else if (trimmed.includes('embed/')) videoId = trimmed.split('embed/')[1]?.split('?')[0] || '';
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }

  // SpankBang
  if (trimmed.includes('spankbang.com')) {
    const match = trimmed.match(/spankbang\.com\/([a-zA-Z0-9]+)/i);
    if (match && match[1]) {
      return `https://spankbang.com/${match[1]}/embed/`;
    }
  }

  // XVideos
  if (trimmed.includes('xvideos.com')) {
    const match = trimmed.match(/video-?([a-zA-Z0-9_]+)|\/prof-video-click\/[^\/]+\/([0-9]+)|embedframe\/([0-9]+)/i) || trimmed.match(/([0-9]{5,})/);
    const vidId = match ? match[1] || match[2] || match[3] || match[0] : '';
    if (vidId) {
      return `https://img-egc.xvideos-cdn.com/videos/thumbs169poster/${vidId.slice(0, 3)}/${vidId.slice(3, 6)}/${vidId}/${vidId}.jpg`;
    }
  }

  // PornHub
  if (trimmed.includes('pornhub.com')) {
    const match = trimmed.match(/viewkey=([a-zA-Z0-9]+)/i) || trimmed.match(/embed\/([a-zA-Z0-9]+)/i);
    if (match && match[1]) {
      return `https://ci.phncdn.com/videos/${match[1]}/original/(m=eaAaGwObaaaa)(mh=xxxx)0.jpg`;
    }
  }

  // Streamtape & Streamtape Mirrors (streamtape.com, streamtape.to, streamta.pe, streamtape.net, streamhide, etc.)
  if (
    trimmed.includes('streamtape') ||
    trimmed.includes('streamta.pe') ||
    trimmed.includes('streamhide') ||
    trimmed.includes('shvip') ||
    trimmed.includes('streamhub')
  ) {
    const match = trimmed.match(/(?:streamtape|streamta\.pe|streamhide|shvip|streamhub)[^/]*\/(?:v|e|d)\/([a-zA-Z0-9_-]+)/i)
      || trimmed.match(/\/(?:v|e)\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://thumb.streamtape.com/${match[1]}.jpg`;
    }
  }

  // DoodStream / Doods
  if (trimmed.includes('dood') || trimmed.includes('ds2play') || trimmed.includes('doodstream') || trimmed.includes('doods.pro')) {
    const match = trimmed.match(/(?:dood\.[a-z]+|doodstream\.[a-z]+|ds2play\.[a-z]+|doods\.[a-z]+)\/(?:e|d|f)\/([a-zA-Z0-9_-]+)/i)
      || trimmed.match(/\/(?:e|d|f)\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://img.doodcdn.co/snaps/${match[1]}.jpg`;
    }
  }

  // FileMoon
  if (trimmed.includes('filemoon')) {
    const match = trimmed.match(/filemoon\.[a-z]+\/(?:e|d)\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://filemoon.sx/thumb/${match[1]}.jpg`;
    }
  }

  // MixDrop
  if (trimmed.includes('mixdrop')) {
    const match = trimmed.match(/mixdrop\.[a-z]+\/(?:e|f)\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://mixdrop.co/thumb/${match[1]}.jpg`;
    }
  }

  // RedTube
  if (trimmed.includes('redtube.com')) {
    const match = trimmed.match(/redtube\.com\/(?:video\/)?([0-9]+)/i);
    if (match && match[1]) {
      return `https://img02.redtubefiles.com/_thumbs/${match[1].padStart(7, '0')}/${match[1].padStart(7, '0')}_001m.jpg`;
    }
  }

  // Eporner
  if (trimmed.includes('eporner.com')) {
    const match = trimmed.match(/eporner\.com\/(?:hd-porn|embed)\/([a-zA-Z0-9]+)/i);
    if (match && match[1]) {
      return `https://static-eu-cdn.eporner.com/thumbs/static4/${match[1]}/320.jpg`;
    }
  }

  return null;
}

/**
 * Automatically extracts metadata (Title, exact duration, high-res thumbnail, preview WebP) from any embed / stream URL
 */
export interface ExtractedEmbedMeta {
  url?: string;
  title?: string;
  duration?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  previewWebpUrl?: string;
  previewMp4Url?: string;
}

export async function extractEmbedMetadataOnline(url: string): Promise<ExtractedEmbedMeta> {
  if (!url || typeof url !== 'string') return {};
  const trimmed = url.trim();

  try {
    const res = await fetch(`/api/v1/videos/extract-metadata?url=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        return json.data as ExtractedEmbedMeta;
      }
    }
  } catch {
    // Backend offline or dev mode fallback
  }

  // Client-side regex fallback
  const clientThumb = extractThumbnailFromEmbedUrl(trimmed);
  return {
    thumbnailUrl: clientThumb || undefined,
  };
}

/**
 * Captures multiple candidate frames from a video source for user thumbnail selection
 */
export async function captureMultiFrames(
  source: string | File,
  count: number = 4
): Promise<string[]> {
  return new Promise((resolve) => {
    let urlToRevoke: string | null = null;
    let videoSrc = '';

    if (source instanceof File) {
      videoSrc = URL.createObjectURL(source);
      urlToRevoke = videoSrc;
    } else if (typeof source === 'string') {
      videoSrc = source.trim();
    } else {
      return resolve([]);
    }

    if (!videoSrc) return resolve([]);

    // Check if we can get a static thumbnail from the URL directly first
    const autoEmbedThumb = typeof source === 'string' ? extractThumbnailFromEmbedUrl(source) : null;

    const frames: string[] = [];
    let isCleanedUp = false;

    const runCapture = (useCors: boolean) => {
      const video = document.createElement('video');
      if (useCors && !videoSrc.startsWith('blob:')) {
        video.crossOrigin = 'anonymous';
      }
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;
      video.preload = 'metadata';

      let currentIdx = 0;

      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (urlToRevoke) {
          URL.revokeObjectURL(urlToRevoke);
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        if (frames.length === 0 && autoEmbedThumb) {
          resolve([autoEmbedThumb]);
        } else {
          resolve(frames);
        }
      }, 7000);

      video.onloadedmetadata = () => {
        const duration = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 10;
        const seekPoints = [0.15 * duration, 0.4 * duration, 0.65 * duration, 0.85 * duration];

        const captureNext = () => {
          if (currentIdx >= seekPoints.length) {
            clearTimeout(timeout);
            cleanup();
            if (frames.length === 0 && autoEmbedThumb) {
              resolve([autoEmbedThumb]);
            } else {
              resolve(frames);
            }
            return;
          }
          video.currentTime = seekPoints[currentIdx];
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(video.videoWidth || 640, 640);
            canvas.height = Math.min(video.videoHeight || 360, 360);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
              if (dataUrl && dataUrl.startsWith('data:image/')) {
                frames.push(dataUrl);
              }
            }
          } catch (canvasErr) {
            // Tainted canvas due to cross-origin media
            console.warn('[mediaHelper] Canvas export notice:', canvasErr);
          }
          currentIdx++;
          captureNext();
        };

        captureNext();
      };

      video.onerror = () => {
        clearTimeout(timeout);
        video.pause();
        video.removeAttribute('src');
        // If CORS failed on remote URL, retry without CORS attribute
        if (useCors && typeof source === 'string' && !source.startsWith('blob:')) {
          runCapture(false);
        } else {
          cleanup();
          if (autoEmbedThumb) {
            resolve([autoEmbedThumb]);
          } else {
            resolve(frames);
          }
        }
      };

      video.src = videoSrc;
    };

    runCapture(true);
  });
}

/**
 * Captures a single video frame (at specified seek time) from a video file or direct URL
 */
export async function captureVideoFrame(
  source: string | File,
  seekTime: number = 1.0
): Promise<string> {
  const frames = await captureMultiFrames(source, 1);
  if (frames.length > 0) return frames[0];
  throw new Error('Failed to capture frame.');
}
