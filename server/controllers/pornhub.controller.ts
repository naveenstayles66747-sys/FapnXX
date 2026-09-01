import { Request, Response, NextFunction } from "express";
import { pornhubService } from "../services/pornhub.service";
import { responseUtil } from "../utils/response";

export const pornhubController = {
  getStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = pornhubService.getDbStatus();
      return responseUtil.success(res, status, "Pornhub Webmaster DB status verified.");
    } catch (err: any) {
      next(err);
    }
  },

  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string;
      const minViews = req.query.minViews ? parseInt(req.query.minViews as string, 10) : 50000;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const searchQuery = req.query.q as string;
      const atsCode = req.query.atsCode as string;

      const result = await pornhubService.queryVideos({
        category,
        minViews,
        limit,
        searchQuery,
        atsCode,
        autoPublish: false,
      });

      return responseUtil.success(res, result, "Pornhub DB queried successfully.");
    } catch (err: any) {
      next(err);
    }
  },

  importBatch: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, minViews, limit, searchQuery, atsCode } = req.body;

      const result = await pornhubService.queryVideos({
        category,
        minViews: minViews !== undefined ? parseInt(minViews, 10) : 100000,
        limit: limit !== undefined ? parseInt(limit, 10) : 25,
        searchQuery,
        atsCode,
        autoPublish: true,
      });

      return responseUtil.success(res, result, `Imported and published ${result.count} videos to Firestore successfully!`);
    } catch (err: any) {
      next(err);
    }
  },

  embedProxy: async (req: Request, res: Response) => {
    try {
      const rawId = req.params.videoId || "";
      const videoId = rawId.replace(/^ph-/, "");
      const atsCode = (req.query.ats as string) || "";
      const mirror = (req.query.mirror as string) || "org";

      const domain = mirror === "rt" ? "rt.pornhub.com" : mirror === "com" ? "www.pornhub.com" : "www.pornhub.org";
      const targetUrl = `https://${domain}/embed/${videoId}${atsCode ? `?ats=${atsCode}` : ""}`;

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Referer": `https://${domain}/`,
        },
      });

      if (!response.ok) {
        // Fallback to RT server
        const rtUrl = `https://rt.pornhub.com/embed/${videoId}${atsCode ? `?ats=${atsCode}` : ""}`;
        const rtResponse = await fetch(rtUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://rt.pornhub.com/",
          },
        });
        const html = await rtResponse.text();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
      }

      const html = await response.text();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (err: any) {
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Stream Connecting...</title></head>
        <body style="margin:0;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui,-apple-system,sans-serif;">
          <h3 style="margin-bottom:8px;font-size:16px;">Connecting to Stream Server...</h3>
          <p style="margin:0;font-size:12px;color:#a1a1aa;">If connection takes long, switch server from the top right.</p>
        </body>
        </html>
      `);
    }
  },
};
