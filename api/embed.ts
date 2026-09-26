// Vercel Serverless Embed Reverse Proxy Endpoint
// Proxies iframe embeds from blocked origins, enabling playback on restricted ISPs (Jio/Airtel)

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  const targetUrl = req.query.url as string;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing "url" parameter');
  }

  try {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid protocol');
    }

    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': `${parsed.origin}/`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    let html = await upstreamRes.text();

    // Inject base href tag if missing so relative paths load properly
    if (!html.includes('<base ') && !html.includes('<base\n')) {
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head><base href="${parsed.origin}/">`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD><base href="${parsed.origin}/">`);
      } else {
        html = `<base href="${parsed.origin}/">` + html;
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.status(200).send(html);
  } catch (err: any) {
    return res
      .status(502)
      .send(`<!DOCTYPE html><html><body><p style="color:red;font-family:sans-serif;padding:20px;">Stream proxy error: ${err?.message || 'Failed to connect upstream'}</p></body></html>`);
  }
}
