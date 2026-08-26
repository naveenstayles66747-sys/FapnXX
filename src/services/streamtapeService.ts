/**
 * Streamtape Cloud API & Automation Service
 * Official API Server: https://api.streamtape.com
 * Supports: Account info, File info, Splash thumbnails, Folder listing, Bulk importing, and Remote URL uploads.
 */

export interface StreamtapeCredentials {
  apiLogin: string;
  apiKey: string;
}

export interface StreamtapeAccountInfo {
  apiid?: string;
  email?: string;
  signup_at?: string;
  storage_used?: number;
  storage_left?: number;
}

export interface StreamtapeFileInfo {
  id: string;
  name: string;
  size: number;
  type?: string;
  converted?: boolean;
  status: number;
  length?: number; // Duration in seconds (e.g. 1425)
}

export interface StreamtapeFolderFile {
  name: string;
  size: number;
  link: string;
  linkid: string;
  created_at: number;
  downloads?: number;
  convert?: string;
}

export interface StreamtapeFolder {
  id: string;
  name: string;
}

export interface StreamtapeListResult {
  folders: StreamtapeFolder[];
  files: StreamtapeFolderFile[];
}

export interface StreamtapeRemoteDownload {
  id: string;
  remoteurl: string;
  status: 'new' | 'downloading' | 'completed' | 'error' | string;
  bytes_loaded?: number | null;
  bytes_total?: number | null;
  folderid?: string;
  added?: string;
  last_update?: string;
}

class StreamtapeService {
  private STORAGE_KEY = 'fapnxx_streamtape_creds';

  /**
   * Get saved credentials from localStorage
   */
  getCredentials(): StreamtapeCredentials {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      apiLogin: import.meta.env.VITE_STREAMTAPE_LOGIN || '',
      apiKey: import.meta.env.VITE_STREAMTAPE_KEY || '',
    };
  }

  /**
   * Save credentials to localStorage
   */
  saveCredentials(creds: StreamtapeCredentials): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(creds));
    } catch (e) {
      console.warn('[Streamtape] Could not save credentials:', e);
    }
  }

  /**
   * Extract Streamtape file ID from any URL or iframe
   */
  extractTapeId(rawUrl: string): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const str = rawUrl.trim();

    // Match iframe src or direct link
    const srcMatch = str.match(/src=["']([^"']+)["']/i);
    const target = srcMatch ? srcMatch[1] : str;

    const match = target.match(/(?:streamtape|streamta\.pe|streamhide|shvip|streamhub)[^/]*\/(?:v|e|d)\/([a-zA-Z0-9_-]+)/i)
      || target.match(/\/(?:v|e)\/([a-zA-Z0-9_-]+)/i);

    if (match && match[1]) {
      return match[1].split('/')[0].split('?')[0].split('#')[0];
    }
    return null;
  }

  /**
   * Robust fetch wrapper with automatic CORS-proxy fallback
   */
  private async apiFetch<T>(url: string): Promise<{ status: number; msg: string; result?: T } | null> {
    // 1. Direct fetch
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // 2. CORS Proxy Fallback
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        return await proxyRes.json();
      }
    } catch (e) {
      console.warn('[Streamtape] API fetch failed:', e);
    }

    return null;
  }

  /**
   * Fetch Account Info (Used storage, email, signup date)
   */
  async getAccountInfo(login?: string, key?: string): Promise<StreamtapeAccountInfo | null> {
    const creds = this.getCredentials();
    const l = (login || creds.apiLogin).trim();
    const k = (key || creds.apiKey).trim();
    if (!l || !k) return null;

    const url = `https://api.streamtape.com/account/info?login=${encodeURIComponent(l)}&key=${encodeURIComponent(k)}`;
    const data = await this.apiFetch<StreamtapeAccountInfo>(url);
    if (data && data.status === 200 && data.result) {
      return data.result;
    }
    return null;
  }

  /**
   * Get File Info (Exact duration, file name, size, status)
   */
  async getFileInfo(fileId: string, login?: string, key?: string): Promise<StreamtapeFileInfo | null> {
    const creds = this.getCredentials();
    const l = (login || creds.apiLogin).trim();
    const k = (key || creds.apiKey).trim();

    let url = `https://api.streamtape.com/file/info?file=${encodeURIComponent(fileId)}`;
    if (l && k) {
      url += `&login=${encodeURIComponent(l)}&key=${encodeURIComponent(k)}`;
    }

    const data = await this.apiFetch<Record<string, StreamtapeFileInfo>>(url);
    if (data && data.status === 200 && data.result) {
      const fileData = data.result[fileId] || Object.values(data.result)[0];
      if (fileData) return fileData;
    }
    return null;
  }

  /**
   * Get Official High-Res Splash Thumbnail URL
   */
  async getSplashThumbnail(fileId: string, login?: string, key?: string): Promise<string> {
    const creds = this.getCredentials();
    const l = (login || creds.apiLogin).trim();
    const k = (key || creds.apiKey).trim();

    if (l && k) {
      const url = `https://api.streamtape.com/file/getsplash?file=${encodeURIComponent(fileId)}&login=${encodeURIComponent(l)}&key=${encodeURIComponent(k)}`;
      const data = await this.apiFetch<string>(url);
      if (data && data.status === 200 && data.result && typeof data.result === 'string') {
        return data.result;
      }
    }

    // Direct CDN fallback
    return `https://thumb.streamtape.com/${fileId}.jpg`;
  }

  /**
   * List files and folders in user's Streamtape account
   */
  async listFolder(folderId?: string, login?: string, key?: string): Promise<StreamtapeListResult | null> {
    const creds = this.getCredentials();
    const l = (login || creds.apiLogin).trim();
    const k = (key || creds.apiKey).trim();
    if (!l || !k) return null;

    let url = `https://api.streamtape.com/file/listfolder?login=${encodeURIComponent(l)}&key=${encodeURIComponent(k)}`;
    if (folderId) {
      url += `&folder=${encodeURIComponent(folderId)}`;
    }

    const data = await this.apiFetch<StreamtapeListResult>(url);
    if (data && data.status === 200 && data.result) {
      return data.result;
    }
    return null;
  }

  /**
   * Add Remote URL Upload (Download video from third-party URL into Streamtape)
   */
  async addRemoteUpload(
    remoteUrl: string,
    name?: string,
    folderId?: string,
    login?: string,
    key?: string
  ): Promise<{ id: string; folderid?: string } | null> {
    const creds = this.getCredentials();
    const l = (login || creds.apiLogin).trim();
    const k = (key || creds.apiKey).trim();
    if (!l || !k) throw new Error('Streamtape API Login & Key required for Remote Upload');

    let url = `https://api.streamtape.com/remotedl/add?login=${encodeURIComponent(l)}&key=${encodeURIComponent(k)}&url=${encodeURIComponent(remoteUrl.trim())}`;
    if (folderId) url += `&folder=${encodeURIComponent(folderId)}`;
    if (name) url += `&name=${encodeURIComponent(name.trim())}`;

    const data = await this.apiFetch<{ id: string; folderid?: string }>(url);
    if (data && data.status === 200 && data.result) {
      return data.result;
    }
    throw new Error(data?.msg || 'Remote upload failed to start');
  }

  /**
   * Check status of remote uploads
   */
  async getRemoteUploadStatus(
    remoteUploadId?: string,
    login?: string,
    key?: string
  ): Promise<Record<string, StreamtapeRemoteDownload> | null> {
    const creds = this.getCredentials();
    const l = (login || creds.apiLogin).trim();
    const k = (key || creds.apiKey).trim();
    if (!l || !k) return null;

    let url = `https://api.streamtape.com/remotedl/status?login=${encodeURIComponent(l)}&key=${encodeURIComponent(k)}`;
    if (remoteUploadId) url += `&id=${encodeURIComponent(remoteUploadId)}`;

    const data = await this.apiFetch<Record<string, StreamtapeRemoteDownload>>(url);
    if (data && data.status === 200 && data.result) {
      return data.result;
    }
    return null;
  }

  /**
   * Auto-extract full metadata for a Streamtape video
   */
  async autoExtractMetadata(urlOrId: string): Promise<{
    tapeId: string;
    embedUrl: string;
    title?: string;
    duration?: string;
    durationSeconds?: number;
    thumbnailUrl: string;
    quality?: '4K' | 'HD' | 'UHD';
    sizeBytes?: number;
  } | null> {
    const tapeId = this.extractTapeId(urlOrId) || urlOrId.trim();
    if (!tapeId || tapeId.length < 5) return null;

    const embedUrl = `https://streamtape.com/e/${tapeId}/`;
    let title: string | undefined;
    let duration: string | undefined;
    let durationSeconds: number | undefined;
    let quality: '4K' | 'HD' | 'UHD' = 'HD';
    let sizeBytes: number | undefined;

    // Try fetching file info via API
    try {
      const fileInfo = await this.getFileInfo(tapeId);
      if (fileInfo) {
        if (fileInfo.name) {
          // Clean filename (remove .mp4, underscores, etc.)
          title = fileInfo.name
            .replace(/\.(mp4|webm|mkv|avi|mov)$/i, '')
            .replace(/[-_.]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          if (fileInfo.name.toLowerCase().includes('4k') || fileInfo.name.toLowerCase().includes('2160p')) {
            quality = '4K';
          } else if (fileInfo.name.toLowerCase().includes('uhd')) {
            quality = 'UHD';
          }
        }

        if (fileInfo.length && !isNaN(fileInfo.length) && fileInfo.length > 0) {
          durationSeconds = fileInfo.length;
          const min = Math.floor(fileInfo.length / 60);
          const sec = Math.floor(fileInfo.length % 60);
          duration = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
        }

        sizeBytes = fileInfo.size;
      }
    } catch {}

    const thumbnailUrl = await this.getSplashThumbnail(tapeId);

    return {
      tapeId,
      embedUrl,
      title,
      duration,
      durationSeconds,
      thumbnailUrl,
      quality,
      sizeBytes,
    };
  }
}

export const streamtapeService = new StreamtapeService();
