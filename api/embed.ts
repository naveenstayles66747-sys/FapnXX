import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: any, res: any) {
  try {
    const urlObj = new URL(req.url || "", "http://localhost");
    const rawId = urlObj.searchParams.get("id") || urlObj.searchParams.get("v") || "";
    const videoId = rawId.replace(/^ph-/, "").split("?")[0].trim();
    if (!videoId) {
      res.statusCode = 400;
      return res.end("Video ID is required.");
    }

    const ats = urlObj.searchParams.get("ats") || "";
    const targetUrl = `https://www.pornhub.org/embed/${videoId}${ats ? `?ats=${ats}` : ""}`;

    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.pornhub.org/",
      },
    });

    if (!upstream.ok) {
      const rtUrl = `https://rt.pornhub.com/embed/${videoId}${ats ? `?ats=${ats}` : ""}`;
      const rtResp = await fetch(rtUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": "https://rt.pornhub.com/",
        },
      });
      const html = await rtResp.text();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end(html);
    }

    const html = await upstream.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(html);
  } catch (err: any) {
    res.statusCode = 500;
    return res.end(`
      <!DOCTYPE html>
      <html>
      <body style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
        <p>Connecting to secure stream... Please refresh.</p>
      </body>
      </html>
    `);
  }
}
