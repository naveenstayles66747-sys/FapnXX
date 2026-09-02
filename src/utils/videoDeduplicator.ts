import { Video } from '../types';

export function normalizeVideoTitle(title?: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function extractEmbedKey(embedUrl?: string): string {
  if (!embedUrl) return '';
  const clean = embedUrl.trim().toLowerCase();
  const match = clean.match(/\/embed\/([a-z0-9_-]+)/i) || clean.match(/viewkey=([a-z0-9_-]+)/i);
  if (match) return match[1];
  return clean.split('?')[0];
}

export function deduplicateVideos<T extends Video>(videos: T[]): T[] {
  if (!Array.isArray(videos) || videos.length === 0) return [];

  const seenIds = new Set<string>();
  const seenEmbedKeys = new Set<string>();
  const seenThumbs = new Set<string>();
  const seenExactTitles = new Set<string>();
  const seenNormTitles = new Set<string>();

  const result: T[] = [];

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    if (!v || typeof v !== 'object') continue;
    if ((v as any).isTakenDown) continue;

    const id = (v.id || '').trim();
    if (!id) continue;

    // 1. Check ID
    if (seenIds.has(id)) continue;

    // 2. Check Embed URL / Key
    const embedKey = extractEmbedKey(v.embedUrl || (v as any).embed_url);
    if (embedKey && seenEmbedKeys.has(embedKey)) continue;

    // 3. Check Thumbnail
    const thumb = (v.thumbnail || (v as any).thumbnailUrl || '').trim();
    if (thumb && seenThumbs.has(thumb)) continue;

    // 4. Check Exact & Normalized Title
    const title = (v.title || '').trim().toLowerCase();
    const normTitle = normalizeVideoTitle(v.title);

    if (title && seenExactTitles.has(title)) continue;
    if (normTitle && normTitle.length > 4 && seenNormTitles.has(normTitle)) continue;

    // Register into all sets
    seenIds.add(id);
    if (embedKey) seenEmbedKeys.add(embedKey);
    if (thumb) seenThumbs.add(thumb);
    if (title) seenExactTitles.add(title);
    if (normTitle && normTitle.length > 4) seenNormTitles.add(normTitle);

    result.push(v);
  }

  return result;
}