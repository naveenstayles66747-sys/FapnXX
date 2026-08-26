/**
 * SeekStream / EmbedSeek Cloud API & Media Service
 * Token: a5f5ecbe1f90dca8fa517b29
 * Supports: Auto-extracting embed player, animated WebP preview, MP4 preview, duration & title.
 */

export interface SeekStreamFileInfo {
  file_code: string;
  title?: string;
  length?: number; // duration in seconds
  thumbnail?: string;
  preview_webp?: string;
  preview_mp4?: string;
  size?: number;
  status?: string | number;
}

export interface SeekStreamAccountInfo {
  email?: string;
  storage_used?: number;
  storage_left?: number;
  balance?: string;
}

class SeekStreamService {
  private STORAGE_KEY = 'fapnxx_seekstream_token';
  private DEFAULT_TOKEN = 'a5f5ecbe1f90dca8fa517b29';

  /**
   * Get SeekStream API Token
   */
  getToken(): string {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return (import.meta.env.VITE_SEEKSTREAM_TOKEN || this.DEFAULT_TOKEN).trim();
  }

  /**
   * Save SeekStream API Token
   */
  saveToken(token: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, token.trim());
    } catch (e) {
      console.warn('[SeekStream] Could not save token:', e);
    }
  }

  /**
   * Extract File Code / Hash / Path from SeekStream or EmbedSeek URL/Iframe
   */
  extractFileCode(rawUrl: string): { code: string; domain: string; fullUrl: string } | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    let str = rawUrl.trim();

    // Extract from iframe src if provided
    const srcMatch = str.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      str = srcMatch[1].trim();
    }

    // Extract domain
    const domainMatch = str.match(/https?:\/\/([^/]+)/i);
    const domain = domainMatch ? domainMatch[1] : 'fapnxx.embedseek.com';

    // Match code (e.g. j4HHdpWkhViUYmN8pgoz2Q or 12-32 char alphanumeric)
    const codeMatch = str.match(/(?:embedseek|seekstream)[^/]*\/(?:e\/|embed\/|v\/)?([a-zA-Z0-9_-]{8,})/i)
      || str.match(/\/([a-zA-Z0-9_-]{12,})(?:\/|\?|$)/i);

    if (codeMatch && codeMatch[1]) {
      return {
        code: codeMatch[1],
        domain,
        fullUrl: str,
      };
    }

    return null;
  }

  /**
   * Robust fetch wrapper with automatic CORS-proxy fallback
   */
  private async apiFetch<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        return await proxyRes.json();
      }
    } catch (e) {
      console.warn('[SeekStream] API fetch error:', e);
    }

    return null;
  }

  /**
   * Fetch File Info from SeekStream / EmbedSeek API
   */
  async getFileInfo(fileCode: string, token?: string): Promise<SeekStreamFileInfo | null> {
    const tok = (token || this.getToken()).trim();
    const urls = [
      `https://embedseek.com/api/file/info?key=${encodeURIComponent(tok)}&file_code=${encodeURIComponent(fileCode)}`,
      `https://api.embedseek.com/file/info?key=${encodeURIComponent(tok)}&file_code=${encodeURIComponent(fileCode)}`,
      `https://seekstream.com/api/file/info?key=${encodeURIComponent(tok)}&file_code=${encodeURIComponent(fileCode)}`,
    ];

    for (const url of urls) {
      const data = await this.apiFetch<any>(url);
      if (data && (data.status === 200 || data.msg === 'OK' || data.result)) {
        const res = data.result || data;
        return {
          file_code: fileCode,
          title: res.title || res.name,
          length: res.length || res.duration,
          thumbnail: res.thumbnail || res.thumb,
          preview_webp: res.preview_webp || res.preview_url,
          preview_mp4: res.preview_mp4,
          size: res.size,
        };
      }
    }

    return null;
  }

  /**
   * Auto-extract metadata (Embed URL, Preview WebP, Preview MP4, Thumbnail, Duration)
   */
  async autoExtractMetadata(rawInput: string): Promise<{
    code: string;
    embedUrl: string;
    previewWebpUrl?: string;
    previewMp4Url?: string;
    thumbnailUrl?: string;
    title?: string;
    duration?: string;
    quality?: '4K' | 'HD';
  } | null> {
    const details = this.extractFileCode(rawInput);
    if (!details) {
      // If rawInput itself is direct preview link
      if (rawInput.includes('preview.webp')) {
        const mp4Counterpart = rawInput.replace(/preview\.webp/i, 'preview.MP4');
        return {
          code: 'seekstream-direct',
          embedUrl: rawInput,
          previewWebpUrl: rawInput,
          previewMp4Url: mp4Counterpart,
          thumbnailUrl: rawInput,
          quality: 'HD',
        };
      }
      if (rawInput.match(/preview\.(mp4|MP4)/i)) {
        const webpCounterpart = rawInput.replace(/preview\.(mp4|MP4)/i, 'preview.webp');
        return {
          code: 'seekstream-direct',
          embedUrl: rawInput,
          previewWebpUrl: webpCounterpart,
          previewMp4Url: rawInput,
          thumbnailUrl: webpCounterpart,
          quality: 'HD',
        };
      }
      return null;
    }

    const { code, domain, fullUrl } = details;
    const protocol = fullUrl.startsWith('http://') ? 'http://' : 'https://';
    const baseUrl = `${protocol}${domain}`;

    // If input is an exact preview link, use the path pattern
    let previewWebpUrl: string | undefined;
    let previewMp4Url: string | undefined;
    let thumbnailUrl: string | undefined;

    if (fullUrl.includes('preview.webp') || fullUrl.includes('preview.MP4') || fullUrl.includes('preview.mp4')) {
      const basePath = fullUrl.replace(/\/preview\.(webp|mp4|MP4).*/i, '');
      previewWebpUrl = `${basePath}/preview.webp`;
      previewMp4Url = `${basePath}/preview.MP4`;
      thumbnailUrl = previewWebpUrl;
    } else {
      // Construct standard SeekStream / EmbedSeek assets
      previewWebpUrl = `${baseUrl}/${code}/preview.webp`;
      previewMp4Url = `${baseUrl}/${code}/preview.MP4`;
      thumbnailUrl = previewWebpUrl;
    }

    const embedUrl = fullUrl.includes('/e/') || fullUrl.includes('/embed/')
      ? fullUrl
      : `${baseUrl}/e/${code}`;

    let title: string | undefined;
    let duration: string | undefined;

    // Try querying API for duration & real title
    try {
      const info = await this.getFileInfo(code);
      if (info) {
        if (info.title) title = info.title;
        if (info.length && !isNaN(info.length) && info.length > 0) {
          const min = Math.floor(info.length / 60);
          const sec = Math.floor(info.length % 60);
          duration = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }
        if (info.thumbnail) thumbnailUrl = info.thumbnail;
        if (info.preview_webp) previewWebpUrl = info.preview_webp;
        if (info.preview_mp4) previewMp4Url = info.preview_mp4;
      }
    } catch {}

    return {
      code,
      embedUrl,
      previewWebpUrl,
      previewMp4Url,
      thumbnailUrl,
      title,
      duration,
      quality: 'HD',
    };
  }
}

export const seekstreamService = new SeekStreamService();
