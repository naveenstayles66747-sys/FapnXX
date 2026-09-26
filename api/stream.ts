// Vercel Serverless Function: Real-time Direct Video Stream Resolver
// Extracts high-speed direct MP4/HLS streams from embeds for seamless native HTML5 playback
// Eliminates ERR_CONNECTION_RESET by streaming directly through the unblocked website domain.

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  const idOrUrl = (req.query.id || req.query.url || req.query.v) as string;
  if (!idOrUrl || typeof idOrUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'Missing "id" or "url" query parameter' });
  }

  try {
    let key = idOrUrl.trim();
    if (key.includes('viewkey=')) {
      key = key.split('viewkey=')[1].split('&')[0];
    } else if (key.includes('/embed/')) {
      key = key.split('/embed/')[1].split('?')[0];
    } else {
      key = key.replace(/^ph[-_]?/i, '');
    }

    const embedUrl = `https://www.pornhub.org/embed/${key}`;
    const upstreamRes = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ success: false, error: `Upstream HTTP ${upstreamRes.status}` });
    }

    const html = await upstreamRes.text();
    const startIdx = html.indexOf('var flashvars =');
    if (startIdx === -1) {
      return res.status(404).json({ success: false, error: 'No stream metadata found' });
    }

    const jsonStart = html.indexOf('{', startIdx);
    let braceCount = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < html.length; i++) {
      if (html[i] === '{') braceCount++;
      else if (html[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }

    if (jsonEnd === -1) {
      return res.status(500).json({ success: false, error: 'Malformed stream metadata' });
    }

    const flashvars = JSON.parse(html.substring(jsonStart, jsonEnd));
    const mediaDefs = flashvars.mediaDefinitions || [];

    let directVideoUrl: string | null = null;
    let quality = '480p';

    // 1. Check for get_media endpoint for direct MP4 stream
    const mp4Def = mediaDefs.find((m: any) => m.format === 'mp4' && m.videoUrl);
    if (mp4Def) {
      if (mp4Def.remote && mp4Def.videoUrl.includes('get_media')) {
        try {
          const gmRes = await fetch(mp4Def.videoUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Referer': 'https://www.pornhub.com/',
            },
          });
          if (gmRes.ok) {
            const gmData = await gmRes.json();
            if (Array.isArray(gmData) && gmData.length > 0 && gmData[0].videoUrl) {
              directVideoUrl = gmData[0].videoUrl;
              quality = gmData[0].quality ? `${gmData[0].quality}p` : '480p';
            }
          }
        } catch {}
      } else {
        directVideoUrl = mp4Def.videoUrl;
      }
    }

    // 2. Fallback to HLS stream
    if (!directVideoUrl) {
      const hlsDef = mediaDefs.find((m: any) => m.format === 'hls' && m.videoUrl);
      if (hlsDef) {
        directVideoUrl = hlsDef.videoUrl;
        quality = hlsDef.quality ? `${hlsDef.quality}p` : 'HLS';
      }
    }

    if (!directVideoUrl) {
      return res.status(404).json({ success: false, error: 'No playable video stream found' });
    }

    // Format duration nicely
    let formattedDuration = '05:00';
    if (flashvars.video_duration && typeof flashvars.video_duration === 'number') {
      const sec = Math.floor(flashvars.video_duration);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      formattedDuration = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    return res.status(200).json({
      success: true,
      directVideoUrl,
      proxyStreamUrl: `/api/proxy?url=${encodeURIComponent(directVideoUrl)}`,
      title: flashvars.video_title,
      duration: formattedDuration,
      durationSeconds: flashvars.video_duration,
      poster: flashvars.image_url,
      quality,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to resolve stream' });
  }
}
