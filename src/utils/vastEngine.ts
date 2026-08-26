// Lightweight, high-performance VAST 2.0 / 3.0 / 4.0 In-Stream Ad Parser & Tracking Engine

export interface VastAd {
  mediaUrl: string;
  mimeType: string;
  clickThroughUrl?: string;
  clickTrackingUrls: string[];
  impressionUrls: string[];
  trackingEvents: Record<string, string[]>;
  skipOffsetSeconds: number;
  durationSeconds: number;
  ctaText: string;
  adTitle: string;
}

/**
 * Fire an impression, click, or tracking pixel ping without blocking UI execution
 */
export const fireTrackingPixel = (urlOrUrls?: string | string[]) => {
  if (!urlOrUrls) return;
  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];

  urls.forEach((url) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const sent = navigator.sendBeacon(url);
        if (sent) return;
      }
      const img = new Image();
      img.src = url;
    } catch {
      try {
        fetch(url, { mode: 'no-cors', cache: 'no-cache', keepalive: true }).catch(() => {});
      } catch {}
    }
  });
};

/**
 * Parse duration string 'HH:MM:SS' or 'SS' into total seconds
 */
const parseVastDuration = (durationStr?: string): number => {
  if (!durationStr) return 15;
  const parts = durationStr.trim().split(':').map((p) => parseFloat(p));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return Math.round(parts[0] * 60 + parts[1]);
  }
  const directSec = parseFloat(durationStr);
  return isNaN(directSec) || directSec <= 0 ? 15 : Math.round(directSec);
};

/**
 * Parse skipoffset string '00:00:05' or '5' or '5%' into total seconds
 */
const parseVastSkipOffset = (skipOffsetStr?: string, totalDuration = 15): number => {
  if (!skipOffsetStr) return 5;
  if (skipOffsetStr.includes('%')) {
    const pct = parseFloat(skipOffsetStr.replace('%', ''));
    if (!isNaN(pct) && pct > 0) return Math.max(3, Math.round((pct / 100) * totalDuration));
    return 5;
  }
  return Math.max(0, Math.min(parseVastDuration(skipOffsetStr), totalDuration));
};

/**
 * Recursively fetch and parse a VAST XML document with timeout and wrapper resolution
 */
export async function fetchVastAd(
  vastTagUrl: string,
  timeoutMs = 2500,
  maxWrapperDepth = 3
): Promise<VastAd | null> {
  if (!vastTagUrl || maxWrapperDepth <= 0) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const cbUrl = vastTagUrl.includes('?')
      ? `${vastTagUrl}&cb=${Date.now()}`
      : `${vastTagUrl}?cb=${Date.now()}`;

    const res = await fetch(cbUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/xml, text/xml, */*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const xmlText = await res.text();
    if (!xmlText || !xmlText.includes('<VAST')) return null;

    // Check for VAST Wrapper (Redirect to secondary VAST tag)
    const wrapperUriMatch =
      xmlText.match(/<VASTAdTagURI><!\[CDATA\[(.*?)\]\]><\/VASTAdTagURI>/i) ||
      xmlText.match(/<VASTAdTagURI>(.*?)<\/VASTAdTagURI>/i);

    if (wrapperUriMatch && wrapperUriMatch[1]) {
      const nextUrl = wrapperUriMatch[1].trim();
      const innerAd = await fetchVastAd(nextUrl, timeoutMs - 500, maxWrapperDepth - 1);
      if (innerAd) {
        // Collect wrapper level impressions & tracking
        const wrapperImpRegex = /<Impression[^>]*><!\[CDATA\[(.*?)\]\]><\/Impression>/gi;
        let m: RegExpExecArray | null;
        while ((m = wrapperImpRegex.exec(xmlText)) !== null) {
          if (m[1]) innerAd.impressionUrls.push(m[1].trim());
        }
        return innerAd;
      }
      return null;
    }

    // Extract Media Files (prefer MP4)
    const mediaFileMatches: { url: string; type: string }[] = [];
    const mediaRegex = /<MediaFile([^>]*)><!\[CDATA\[(.*?)\]\]><\/MediaFile>/gi;
    let match: RegExpExecArray | null;

    while ((match = mediaRegex.exec(xmlText)) !== null) {
      const attrs = match[1] || '';
      const url = (match[2] || '').trim();
      if (url) {
        const typeMatch = attrs.match(/type=["'](.*?)["']/i);
        const mimeType = typeMatch ? typeMatch[1].toLowerCase() : 'video/mp4';
        mediaFileMatches.push({ url, type: mimeType });
      }
    }

    // Also check standard non-CDATA MediaFile tags
    if (mediaFileMatches.length === 0) {
      const simpleMediaRegex = /<MediaFile([^>]*)>(https?:\/\/[^<]+)<\/MediaFile>/gi;
      while ((match = simpleMediaRegex.exec(xmlText)) !== null) {
        const attrs = match[1] || '';
        const url = (match[2] || '').trim();
        if (url) {
          const typeMatch = attrs.match(/type=["'](.*?)["']/i);
          const mimeType = typeMatch ? typeMatch[1].toLowerCase() : 'video/mp4';
          mediaFileMatches.push({ url, type: mimeType });
        }
      }
    }

    if (mediaFileMatches.length === 0) {
      return null; // Empty VAST / No ad inventory available
    }

    // Prioritize MP4 format
    const selectedMedia =
      mediaFileMatches.find((m) => m.type.includes('mp4') || m.url.endsWith('.mp4')) ||
      mediaFileMatches[0];

    // Extract Duration
    const durationMatch = xmlText.match(/<Duration>(.*?)<\/Duration>/i);
    const durationSeconds = parseVastDuration(durationMatch ? durationMatch[1] : undefined);

    // Extract Linear skipoffset
    const skipMatch = xmlText.match(/<Linear[^>]*skipoffset=["'](.*?)["']/i);
    const skipOffsetSeconds = parseVastSkipOffset(skipMatch ? skipMatch[1] : undefined, durationSeconds);

    // Extract ClickThrough URL
    const clickThroughMatch =
      xmlText.match(/<ClickThrough><!\[CDATA\[(.*?)\]\]><\/ClickThrough>/i) ||
      xmlText.match(/<ClickThrough>(.*?)<\/ClickThrough>/i);
    const clickThroughUrl = clickThroughMatch ? clickThroughMatch[1].trim() : undefined;

    // Extract ClickTracking URLs
    const clickTrackingUrls: string[] = [];
    const clickTrackRegex = /<ClickTracking[^>]*><!\[CDATA\[(.*?)\]\]><\/ClickTracking>/gi;
    while ((match = clickTrackRegex.exec(xmlText)) !== null) {
      if (match[1]) clickTrackingUrls.push(match[1].trim());
    }

    // Extract Impression URLs
    const impressionUrls: string[] = [];
    const impRegex = /<Impression[^>]*><!\[CDATA\[(.*?)\]\]><\/Impression>/gi;
    while ((match = impRegex.exec(xmlText)) !== null) {
      if (match[1]) impressionUrls.push(match[1].trim());
    }

    // Extract Tracking Events (start, firstQuartile, midpoint, thirdQuartile, complete, skip, etc.)
    const trackingEvents: Record<string, string[]> = {};
    const trackRegex = /<Tracking[^>]*event=["'](.*?)["'][^>]*><!\[CDATA\[(.*?)\]\]><\/Tracking>/gi;
    while ((match = trackRegex.exec(xmlText)) !== null) {
      const eventName = (match[1] || '').trim().toLowerCase();
      const trackUrl = (match[2] || '').trim();
      if (eventName && trackUrl) {
        if (!trackingEvents[eventName]) trackingEvents[eventName] = [];
        trackingEvents[eventName].push(trackUrl);
      }
    }

    // Extract CTA Text / Ad Title
    const ctaMatch =
      xmlText.match(/<TitleCTA>[\s\S]*?<PCText>(.*?)<\/PCText>/i) ||
      xmlText.match(/<TitleCTA>[\s\S]*?<MobileText>(.*?)<\/MobileText>/i) ||
      xmlText.match(/<AdTitle><!\[CDATA\[(.*?)\]\]><\/AdTitle>/i) ||
      xmlText.match(/<AdTitle>(.*?)<\/AdTitle>/i);
    const ctaText = ctaMatch && ctaMatch[1].trim() ? ctaMatch[1].trim() : 'Visit Sponsor';

    return {
      mediaUrl: selectedMedia.url,
      mimeType: selectedMedia.type,
      clickThroughUrl,
      clickTrackingUrls,
      impressionUrls,
      trackingEvents,
      skipOffsetSeconds,
      durationSeconds,
      ctaText,
      adTitle: ctaText,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
