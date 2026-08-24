import { Request, Response, NextFunction } from 'express';
import { videoServiceBackend } from '../services/video.service';
import { responseUtil } from '../utils/response';
import { VideoStatus, Role } from '../config/constants';
import { validateSafeUrl, safeFetchHtml } from '../utils/ssrf.util';

export const videoController = {
  listVideos: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 24;
      const category = req.query.category as string;
      const orientation = req.query.orientation as string;
      const search = req.query.search as string;
      const status = req.query.status as VideoStatus;
      const sort = req.query.sort as 'newest' | 'trending' | 'views' | 'likes';

      // Check if caller is admin requesting unpublished videos
      const isStaff = req.user && (req.user.role === Role.ADMIN || req.user.role === Role.SUPER_ADMIN || req.user.role === Role.EDITOR);
      const includeUnpublished = isStaff && req.query.includeUnpublished === 'true';

      const result = await videoServiceBackend.listVideos({
        page,
        limit,
        category,
        orientation,
        search,
        status,
        includeUnpublished,
        sort,
      });

      return responseUtil.success(res, result, 'Videos retrieved successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  getVideoById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const video = await videoServiceBackend.findById(id);

      if (!video) {
        return responseUtil.error(res, 'NOT_FOUND', 'Video not found.', 404);
      }

      // If unpublished and not staff, return 404
      if (video.status !== VideoStatus.PUBLISHED) {
        const isStaff = req.user && (req.user.role === Role.ADMIN || req.user.role === Role.SUPER_ADMIN || req.user.role === Role.EDITOR);
        if (!isStaff) {
          return responseUtil.error(res, 'NOT_FOUND', 'Video not found.', 404);
        }
      }

      return responseUtil.success(res, video, 'Video details retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  createVideo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user?.userId || 'guest';
      const actorEmail = req.user?.email || 'guest@indianfullxx.com';
      const actorRole = req.user?.role || Role.USER;

      const video = await videoServiceBackend.create(req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, video, 'Video published successfully.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  updateVideo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const updated = await videoServiceBackend.update(id, req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, updated, 'Video updated successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  deleteVideo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const deleted = await videoServiceBackend.delete(id, actorId, actorEmail, actorRole);
      if (!deleted) {
        return responseUtil.error(res, 'NOT_FOUND', 'Video not found.', 404);
      }

      return responseUtil.success(res, { id }, 'Video deleted successfully.');
    } catch (err: any) {
      next(err);
    }
  },

  incrementViews: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const clientIdentifier = (req.headers['x-client-device-id'] as string) || req.ip || (req.headers['user-agent'] as string) || 'anonymous';
      const result = await videoServiceBackend.incrementViewCount(id, clientIdentifier);
      return responseUtil.success(res, result, 'View recorded.');
    } catch (err: any) {
      next(err);
    }
  },

  toggleLikes: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { isLike } = req.body;
      const result = await videoServiceBackend.incrementLikes(id, isLike !== false);
      return responseUtil.success(res, result, 'Likes and rating updated.');
    } catch (err: any) {
      next(err);
    }
  },

  extractMetadata: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUrl = (req.query.url as string)?.trim();
      if (!targetUrl) {
        return responseUtil.error(res, 'BAD_REQUEST', 'Missing target URL query parameter.', 400);
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      let cleanTarget = targetUrl;
      if (cleanTarget.startsWith('<iframe') || cleanTarget.includes('src=')) {
        const match = cleanTarget.match(/src=["']([^"']+)["']/i);
        if (match && match[1]) cleanTarget = match[1];
      }
      cleanTarget = cleanTarget.replace(/^["']|["']$/g, '').trim();
      if (cleanTarget.startsWith('//')) cleanTarget = 'https:' + cleanTarget;

      // Strict SSRF Security Validation
      const validation = await validateSafeUrl(cleanTarget);
      if (!validation.valid) {
        return responseUtil.error(res, 'SSRF_BLOCKED', validation.error || 'Access to internal host or private IP address is forbidden.', 400);
      }

      let html = '';
      const fetchResult = await safeFetchHtml(cleanTarget, {
        timeoutMs: 5000,
        maxSizeBytes: 1024 * 1024, // 1MB limit
        headers: {
          'User-Agent': userAgent,
          'X-Forwarded-For': clientIp,
        },
      });

      if (fetchResult.ok) {
        html = fetchResult.text;
      } else if (fetchResult.status === 400 && fetchResult.error?.includes('SSRF')) {
        return responseUtil.error(res, 'SSRF_BLOCKED', fetchResult.error, 400);
      }

      // 1. Extract Title
      let title: string | null = null;
      const ogTitleMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:title|twitter:title)["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim();
      } else {
        const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleTagMatch && titleTagMatch[1]) {
          title = titleTagMatch[1].replace(/\s*[-|–]\s*(SpankBang|XVideos|Pornhub|XHamster|Watch Free.*)$/i, '').trim();
        }
      }

      // 2. Extract Duration (ISO 8601, Seconds, or MM:SS)
      let formattedDuration: string | null = null;
      let durationSeconds: number | null = null;

      // Pattern A: ISO duration like PT12M34S or PT1H23M45S
      const isoDurationMatch = html.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i)
        || html.match(/itemprop=["']duration["']\s+content=["']PT([^"']+)["']/i);
      if (isoDurationMatch) {
        const hours = parseInt(isoDurationMatch[1] || '0', 10);
        const minutes = parseInt(isoDurationMatch[2] || '0', 10);
        const seconds = parseInt(isoDurationMatch[3] || '0', 10);
        durationSeconds = (hours * 3600) + (minutes * 60) + seconds;
      }

      // Pattern B: og:video:duration or video_duration in seconds
      if (!durationSeconds) {
        const secMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:video:duration|video:duration|duration)["']\s+content=["'](\d+)["']/i)
          || html.match(/["']video_duration["']\s*:\s*["']?(\d+)["']?/i)
          || html.match(/["']duration["']\s*:\s*["']?(\d+)["']?/i);
        if (secMatch && secMatch[1]) {
          durationSeconds = parseInt(secMatch[1], 10);
        }
      }

      // Pattern C: string like "12:34" or "01:23:45"
      if (!durationSeconds) {
        const mmssMatch = html.match(/["']duration_formatted["']\s*:\s*["'](\d{1,2}:\d{2}(?::\d{2})?)["']/i)
          || html.match(/class=["'][^"']*duration[^"']*["'][^>]*>\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*</i);
        if (mmssMatch && mmssMatch[1]) {
          formattedDuration = mmssMatch[1];
        }
      }

      if (durationSeconds && durationSeconds > 0) {
        const hrs = Math.floor(durationSeconds / 3600);
        const mins = Math.floor((durationSeconds % 3600) / 60);
        const secs = durationSeconds % 60;
        formattedDuration = hrs > 0
          ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }

      // 3. Extract High-Res Thumbnail Image
      let thumbnailUrl: string | null = null;
      const ogImageMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image|thumbnailUrl)["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image:secure_url|og:image|twitter:image)["']/i)
        || html.match(/<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        thumbnailUrl = ogImageMatch[1].trim();
      }

      // Platform specific fallback thumbnails
      if (!thumbnailUrl) {
        if (cleanTarget.includes('youtube.com') || cleanTarget.includes('youtu.be')) {
          const ytMatch = cleanTarget.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]+)/);
          if (ytMatch && ytMatch[1]) thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
        } else if (cleanTarget.includes('xvideos.com')) {
          const xvidMatch = html.match(/setThumbUrl(?:169)?\(['"]([^'"]+)['"]\)/i)
            || html.match(/["']thumbnail_url["']\s*:\s*["']([^"']+)["']/i);
          if (xvidMatch && xvidMatch[1]) thumbnailUrl = xvidMatch[1];
        } else if (cleanTarget.includes('spankbang.com')) {
          const sbMatch = html.match(/cover_url\s*=\s*['"]([^'"]+)['"]/i)
            || html.match(/<img[^>]+id=["']main_video_player_cover["'][^>]+src=["']([^"']+)["']/i);
          if (sbMatch && sbMatch[1]) thumbnailUrl = sbMatch[1];
        }
      }

      // 4. Extract Preview WebP / Animated Preview / MP4
      let previewWebpUrl: string | null = null;
      let previewMp4Url: string | null = null;

      const webpMatch = html.match(/["'](?:preview_webp|preview_url|animated_preview|previewWebpUrl)["']\s*:\s*["']([^"']+\.webp[^"']*)["']/i)
        || html.match(/href=["']([^"']+\.webp)["']/i);
      if (webpMatch && webpMatch[1]) previewWebpUrl = webpMatch[1];

      const mp4Match = html.match(/["'](?:preview_mp4|short_preview|previewMp4Url)["']\s*:\s*["']([^"']+\.mp4[^"']*)["']/i)
        || html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+\.mp4[^"']*)["']/i);
      if (mp4Match && mp4Match[1]) previewMp4Url = mp4Match[1];

      return responseUtil.success(res, {
        url: cleanTarget,
        title: title || undefined,
        duration: formattedDuration || undefined,
        durationSeconds: durationSeconds || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        previewWebpUrl: previewWebpUrl || undefined,
        previewMp4Url: previewMp4Url || undefined,
      }, 'Metadata extracted successfully.');
    } catch (err: any) {
      next(err);
    }
  },
};
