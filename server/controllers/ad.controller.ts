import { Request, Response, NextFunction } from 'express';
import { adService } from '../services/ad.service';
import { responseUtil } from '../utils/response';

export const adController = {
  listAds: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const list = adService.listAds(activeOnly);
      return responseUtil.success(res, list, 'Ad campaigns retrieved.');
    } catch (err: any) {
      next(err);
    }
  },

  createAd: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const created = await adService.create(req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, created, 'Ad campaign created.', 201);
    } catch (err: any) {
      next(err);
    }
  },

  updateAd: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const updated = await adService.update(id, req.body, actorId, actorEmail, actorRole);
      return responseUtil.success(res, updated, 'Ad campaign updated.');
    } catch (err: any) {
      next(err);
    }
  },

  deleteAd: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const actorId = req.user!.userId;
      const actorEmail = req.user!.email;
      const actorRole = req.user!.role;

      const deleted = await adService.delete(id, actorId, actorEmail, actorRole);
      if (!deleted) {
        return responseUtil.error(res, 'NOT_FOUND', 'Ad campaign not found.', 404);
      }
      return responseUtil.success(res, { id }, 'Ad campaign deleted.');
    } catch (err: any) {
      next(err);
    }
  },

  recordImpression: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      adService.recordImpression(id);
      return responseUtil.success(res, null, 'Impression recorded.');
    } catch (err: any) {
      next(err);
    }
  },

  recordClick: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      adService.recordClick(id);
      return responseUtil.success(res, null, 'Click recorded.');
    } catch (err: any) {
      next(err);
    }
  },

  proxyVast: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const DEFAULT_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idz=6003184';
      const targetUrl = (req.query.url as string)?.trim() || DEFAULT_VAST_URL;

      // Extract client IP and User Agent to forward to ad network for real ad bidding
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Mozilla/5.0';

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': userAgent,
          'X-Forwarded-For': clientIp,
          'Accept': 'application/xml, text/xml, */*',
        },
      });

      if (!response.ok) {
        return responseUtil.success(res, {
          hasAd: false,
          mediaUrl: null,
          clickThrough: null,
          impressions: [],
          tracking: {},
        }, 'No VAST ad returned.');
      }

      const xmlText = await response.text();

      // Extract all impression URLs from primary XML
      const impressionMatches = [...xmlText.matchAll(/<Impression[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/Impression>/gi)];
      let impressions = impressionMatches.map((m) => m[1].trim()).filter(Boolean);

      // Extract click tracking URLs
      const clickTrackingMatches = [...xmlText.matchAll(/<ClickTracking[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ClickTracking>/gi)];
      const clickTrackings = clickTrackingMatches.map((m) => m[1].trim()).filter(Boolean);

      // Extract ClickThrough URL
      const clickMatch = xmlText.match(/<ClickThrough[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ClickThrough>/i);
      let rawClickUrl = clickMatch ? clickMatch[1].trim() : null;

      // Extract direct MediaFile URL
      let mediaMatch = xmlText.match(/<MediaFile[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/MediaFile>/i);
      let rawMediaUrl = mediaMatch ? mediaMatch[1].trim() : null;

      // Check for <VASTAdTagURI> (Wrapper)
      const wrapperMatch = xmlText.match(/<VASTAdTagURI[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/VASTAdTagURI>/i);
      const wrappedUrl = wrapperMatch ? wrapperMatch[1].trim() : null;

      // If wrapper URL is found and no direct media file yet, attempt secondary resolution
      if (wrappedUrl && !rawMediaUrl) {
        try {
          if (!rawClickUrl) rawClickUrl = wrappedUrl;

          const wrappedRes = await fetch(wrappedUrl, {
            headers: {
              'User-Agent': userAgent,
              'X-Forwarded-For': clientIp,
              'Accept': 'application/xml, text/xml, */*',
            },
          });

          if (wrappedRes.ok) {
            const secondaryText = await wrappedRes.text();
            const secMedia = secondaryText.match(/<MediaFile[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/MediaFile>/i);
            if (secMedia) rawMediaUrl = secMedia[1].trim();

            const secClick = secondaryText.match(/<ClickThrough[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ClickThrough>/i);
            if (secClick) rawClickUrl = secClick[1].trim();

            const secImps = [...secondaryText.matchAll(/<Impression[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/Impression>/gi)];
            impressions = [...impressions, ...secImps.map((m) => m[1].trim()).filter(Boolean)];
          }
        } catch {
          // Secondary fetch failed, fallback will provide high-quality video creative
        }
      }

      // Extract tracking events
      const trackingMatches = [...xmlText.matchAll(/<Tracking\s+event="([^"]+)"[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/Tracking>/gi)];
      const tracking: Record<string, string[]> = {};
      for (const tm of trackingMatches) {
        const eventName = tm[1].toLowerCase();
        const eventUrl = tm[2].trim();
        if (eventUrl) {
          if (!tracking[eventName]) tracking[eventName] = [];
          tracking[eventName].push(eventUrl);
        }
      }

      // If requested as raw XML
      if (req.query.format === 'xml') {
        res.setHeader('Content-Type', 'text/xml');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(xmlText);
      }

      // Always return hasAd = true when either a mediaUrl is found or impressions/wrappedUrl exist
      return responseUtil.success(res, {
        hasAd: Boolean(rawMediaUrl || impressions.length > 0 || wrappedUrl),
        mediaUrl: rawMediaUrl,
        clickThrough: rawClickUrl || wrappedUrl,
        clickTracking: clickTrackings,
        impressions,
        tracking,
      }, 'VAST ad processed');
    } catch (err: any) {
      next(err);
    }
  },
};

