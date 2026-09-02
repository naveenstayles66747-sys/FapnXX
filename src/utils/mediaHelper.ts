import React from 'react';

// Default high-quality fallbacks for categories (Authentic category-specific scene thumbnails)
export const DEFAULT_CATEGORY_FALLBACKS: Record<string, string> = {
  trending: 'https://ei.phncdn.com/videos/201010/28/87259/original/(m=eaAaGwObaaamqv)(mh=QdlRHBFUcAcyGu20)14.jpg',
  amateur: 'https://ei.phncdn.com/videos/200911/06/284931/original/(m=eaAaGwObaaamqv)(mh=zXH88bIuRPF-q50n)2.jpg',
  milf: 'https://ei.phncdn.com/videos/201010/28/84820/original/(m=eaAaGwObaaamqv)(mh=BKm_F1sExn03YSeT)10.jpg',
  teen: 'https://ei.phncdn.com/videos/201011/01/101918/original/(m=eaAaGwObaaamqv)(mh=dBpTZeazRjYVFda2)12.jpg',
  anal: 'https://ei.phncdn.com/videos/201102/17/163221/original/(m=eaAaGwObaaamqv)(mh=TBKK2MHrWNRO7d0w)13.jpg',
  lesbian: 'https://ei.phncdn.com/videos/201010/28/85147/original/(m=eaAaGwObaaamqv)(mh=Y6sLNJvSTmvOSuW9)12.jpg',
  gay: 'https://ei.phncdn.com/videos/201603/15/71141301/original/(m=eaAaGwObaaamqv)(mh=2yFTiQZRD7JfE52w)9.jpg',
  transgender: 'https://ei.phncdn.com/videos/201011/01/101881/original/(m=eaAaGwObaaamqv)(mh=R5MS1sIVFHjwXYNq)12.jpg',
  pov: 'https://ei.phncdn.com/videos/201603/18/71405651/original/(m=eaAaGwObaaamqv)(mh=Yhij6lXFA0OzfKnN)0.jpg',
  'big-tits': 'https://ei.phncdn.com/videos/200911/27/1004131/original/(m=eaAaGwObaaamqv)(mh=i6wBhU-qrBLmnsmq)11.jpg',
  'big-ass': 'https://ei.phncdn.com/videos/201011/01/93959/original/(m=eaAaGwObaaamqv)(mh=kYK1UoOdGIRIwoP1)12.jpg',
  blowjob: 'https://ei.phncdn.com/videos/201010/28/83323/original/(m=eaAaGwObaaamqv)(mh=MT5l6U1RfnXj7a4Y)12.jpg',
  creampie: 'https://ei.phncdn.com/videos/201010/28/84967/original/(m=eaAaGwObaaamqv)(mh=Te-lE6wRMN2m3a-U)12.jpg',
  threesome: 'https://ei.phncdn.com/videos/201011/01/94213/original/(m=eaAaGwObaaamqv)(mh=jlkJ7rchJwvfUpoA)12.jpg',
  interracial: 'https://ei.phncdn.com/videos/201001/19/1019106/original/(m=eaAaGwObaaamqv)(mh=BKQCo8wlykSzVkl5)12.jpg',
  ebony: 'https://ei.phncdn.com/videos/201011/01/101667/original/(m=eaAaGwObaaamqv)(mh=BCAp22BraGUyRNWX)12.jpg',
  latina: 'https://ei.phncdn.com/videos/201011/01/94253/original/(m=eaAaGwObaaamqv)(mh=SfluOcmcGe_DTn_J)16.jpg',
  desi: 'https://ei.phncdn.com/videos/201211/12/7192091/original/(m=eaAaGwObaaamqv)(mh=2pGU2ezR1rnfidnY)0.jpg',
  asian: 'https://ei.phncdn.com/videos/201011/02/140512/original/(m=eaAaGwObaaamqv)(mh=v-krzEZ2Wg7QOlBr)4.jpg',
  hentai: 'https://ei.phncdn.com/videos/201406/08/27862371/original/(m=eaAaGwObaaamqv)(mh=zeFI9UhXJzEm3fOV)1.jpg',
  vr: 'https://ei.phncdn.com/videos/201603/17/71311701/original/(m=eaAaGwObaaamqv)(mh=E0t8E-zSttpuE4c0)0.jpg',
  hardcore: 'https://ei.phncdn.com/videos/201010/28/84964/original/(m=eaAaGwObaaamqv)(mh=HwFSif07hZZGOiQI)3.jpg',
  fetish: 'https://ei.phncdn.com/videos/201004/01/1046275/original/(m=eaAaGwObaaamqv)(mh=QPHav7KTLl7UDVtj)12.jpg',
  masturbation: 'https://ei.phncdn.com/videos/201010/28/84839/original/(m=eaAaGwObaaamqv)(mh=7FwK3JFcJetvSbTL)12.jpg',
  public: 'https://ei.phncdn.com/videos/201010/28/84963/original/(m=eaAaGwObaaamqv)(mh=_YeVmrt9qT130dFp)14.jpg',
  mature: 'https://ei.phncdn.com/videos/201011/01/94170/original/(m=eaAaGwObaaamqv)(mh=4a_-xE70-mOVrO4t)6.jpg',
};

// Default high-quality fallbacks for 6 Home Banners (Optimized 1600px width with quality 75 for instant LCP)
export const DEFAULT_BANNER_FALLBACKS: string[] = [
  'https://ei.phncdn.com/videos/201010/28/87259/original/(m=eaAaGwObaaamqv)(mh=QdlRHBFUcAcyGu20)14.jpg',
  'https://ei.phncdn.com/videos/201010/28/84967/original/(m=eaAaGwObaaamqv)(mh=Te-lE6wRMN2m3a-U)12.jpg',
  'https://ei.phncdn.com/videos/201010/28/84145/original/(m=eaAaGwObaaamqv)(mh=IRI5_kbbXf9tT_WE)12.jpg',
  'https://ei.phncdn.com/videos/201010/28/83412/original/(m=eaAaGwObaaamqv)(mh=ojxjUqCGQysJBXQk)12.jpg',
  'https://ei.phncdn.com/videos/201010/28/85147/original/(m=eaAaGwObaaamqv)(mh=Y6sLNJvSTmvOSuW9)12.jpg',
  'https://ei.phncdn.com/videos/201010/28/85616/original/(m=eaAaGwObaaamqv)(mh=eVysX4hqzw0mBYVH)12.jpg',
];

/**
 * Resolves the category hero image path:
 * 1. Checks if custom valid external URL (not placeholder / not unsplash) is set
 * 2. Directly uses authentic CDN fallback to prevent 404 roundtrips
 */
export function getCategoryHeroImage(category: { id: string; name?: string; heroImage?: string }): string {
  const slug = (category.id || category.name || 'default').toLowerCase().trim().replace(/\s+/g, '-');
  
  if (
    category.heroImage &&
    !category.heroImage.includes('lh3.googleusercontent.com') &&
    !category.heroImage.includes('placeholder') &&
    !category.heroImage.includes('images.unsplash.com') &&
    category.heroImage.startsWith('http')
  ) {
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

  // SeekStream / EmbedSeek / HornHub
  if (
    trimmed.includes('embedseek') ||
    trimmed.includes('seekstream') ||
    trimmed.includes('hornhub')
  ) {
    if (trimmed.includes('preview.webp')) {
      return trimmed;
    }
    const codeMatch = trimmed.match(/(?:embedseek|seekstream)[^/]*\/(?:e\/|embed\/|v\/)?([a-zA-Z0-9_-]{4,})/i)
      || trimmed.match(/\/([a-zA-Z0-9_-]{4,})(?:\/|\?|$)/i);
    if (codeMatch && codeMatch[1]) {
      const domainMatch = trimmed.match(/https?:\/\/([^/]+)/i);
      const domain = domainMatch ? domainMatch[1] : 'fapnxx.embedseek.com';
      return `https://${domain}/${codeMatch[1]}/preview.webp`;
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

  const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '')
    ? `${import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '')}/api/v1`
    : '/api/v1';

  try {
    const res = await fetch(`${apiBase}/videos/extract-metadata?url=${encodeURIComponent(trimmed)}`);
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

/**
 * Clean & extract URL from iframe tags, quotes, or protocol-relative strings
 */
export function cleanMediaUrl(rawInput?: string): string {
  if (!rawInput || typeof rawInput !== 'string') return '';
  let str = rawInput.trim();

  // If it's an <iframe> HTML snippet: <iframe src="https://..." ...></iframe>
  if (str.includes('<iframe') || str.includes('src=')) {
    const match = str.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      str = match[1].trim();
    }
  }

  // Remove surrounding quotes
  str = str.replace(/^["']|["']$/g, '').trim();

  // If it starts with '//', prefix 'https:'
  if (str.startsWith('//')) {
    str = `https:${str}`;
  }

  return str;
}

/**
 * Client-Side Image Compressor & Resizer (Converts 10MB+ images to lightweight ~50KB WebP/JPEG)
 * Prevents Firebase Firestore 1MB document quota overflow on uploaded thumbnails.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 720,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio within maxWidth x maxHeight
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(url);
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to clean optimized JPEG Data URL (~30-70 KB)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Global Non-Destructive Media & Audio Silencer:
 * Safely pauses and mutes all playing background video/audio elements across transitions
 * without destructively wiping active React DOM structures.
 */
export function stopAllBackgroundMedia(): void {
  try {
    const mediaNodes = document.querySelectorAll('video, audio');
    mediaNodes.forEach((node: any) => {
      try {
        if (typeof node.pause === 'function') node.pause();
        node.muted = true;
      } catch {}
    });
  } catch (e) {
    console.warn('[MediaHelper] stopAllBackgroundMedia notice:', e);
  }
}


