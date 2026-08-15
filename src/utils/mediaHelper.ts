import React from 'react';

// Default high-quality fallbacks for categories if local file is missing
export const DEFAULT_CATEGORY_FALLBACKS: Record<string, string> = {
  trending: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
  amateur: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop',
  milf: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop',
  teen: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1200&auto=format&fit=crop',
  desi: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1200&auto=format&fit=crop',
  anal: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
  lesbian: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=1200&auto=format&fit=crop',
  asian: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1200&auto=format&fit=crop',
  pov: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop',
  hentai: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=1200&auto=format&fit=crop',
  vr: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=80&w=1200&auto=format&fit=crop',
};

// Default high-quality fallbacks for 6 Home Banners
export const DEFAULT_BANNER_FALLBACKS: string[] = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1920&auto=format&fit=crop',
];

/**
 * Resolves the category hero image path:
 * 1. Checks if custom valid external URL (not placeholder) is set
 * 2. Uses local `/assets/categories/${slug}.jpg`
 * 3. Falls back to curated fallback
 */
export function getCategoryHeroImage(category: { id: string; name?: string; heroImage?: string }): string {
  const slug = (category.id || category.name || 'default').toLowerCase().trim().replace(/\s+/g, '-');
  
  if (category.heroImage && !category.heroImage.includes('lh3.googleusercontent.com') && !category.heroImage.includes('placeholder')) {
    return category.heroImage;
  }

  // Local folder first
  return `/assets/categories/${slug}.jpg`;
}

/**
 * Resolves banner image path for 1-6 banners:
 * 1. If bannerImage is custom external valid URL, use it
 * 2. Otherwise use `/assets/banners/banner${index + 1}.jpg`
 */
export function getBannerImageUrl(banner: { id?: string; bannerImage?: string }, index: number): string {
  if (banner.bannerImage && !banner.bannerImage.includes('lh3.googleusercontent.com') && !banner.bannerImage.includes('placeholder')) {
    return banner.bannerImage;
  }

  const bannerIndex = (index % 6) + 1;
  return `/assets/banners/banner${bannerIndex}.jpg`;
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
    const match = trimmed.match(/spankbang\.com\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://spankbang.com/${match[1]}/embed/`;
    }
  }

  return null;
}

/**
 * Captures a video frame (at specified second) from a direct video file or video URL using HTML5 Canvas snapshot
 */
export async function captureVideoFrame(
  source: string | File,
  seekTime: number = 1.0
): Promise<string> {
  return new Promise((resolve, reject) => {
    let urlToRevoke: string | null = null;
    let videoSrc = '';

    if (source instanceof File) {
      videoSrc = URL.createObjectURL(source);
      urlToRevoke = videoSrc;
    } else if (typeof source === 'string') {
      videoSrc = source.trim();
    } else {
      return reject(new Error('Invalid video source'));
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.autoplay = false;
    video.preload = 'metadata';

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Thumbnail capture timed out.'));
    }, 8000);

    video.onloadedmetadata = () => {
      // Seek to specified time or 1s (or middle of short clips)
      const targetTime = Math.min(seekTime, Math.max(0.1, video.duration ? video.duration / 2 : 1.0));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          clearTimeout(timeout);
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        clearTimeout(timeout);
        cleanup();
        reject(err);
      }
    };

    video.onerror = (e) => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Failed to load video stream for frame capture.'));
    };

    video.src = videoSrc;
  });
}
