import { Video } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// SMART SEARCH ENGINE — Fuzzy, multi-field, relevance-scored, always finds something
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchResult {
  video: Video;
  score: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'title' | 'performer' | 'tag' | 'category';
  icon: string;
}

/**
 * Normalize a string: lowercase, remove extra spaces, accents
 */
function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Check how closely two strings match (partial / starts-with / includes)
 * Returns a score: higher = better match
 */
function matchScore(field: string, query: string): number {
  const f = normalize(field);
  const q = normalize(query);
  if (!f || !q) return 0;
  if (f === q) return 100;                        // Exact match
  if (f.startsWith(q)) return 80;                // Starts with query
  if (f.includes(q)) return 60;                  // Contains query
  // Partial token match — any word in field starts with or matches any word in query
  const fTokens = f.split(/\s+/);
  const qTokens = q.split(/\s+/);
  let tokenScore = 0;
  for (const qt of qTokens) {
    for (const ft of fTokens) {
      if (ft === qt) tokenScore += 40;
      else if (ft.startsWith(qt)) tokenScore += 25;
      else if (ft.includes(qt) && qt.length >= 2) tokenScore += 15;
    }
  }
  return tokenScore;
}

/**
 * Score a single video against the query across all searchable fields
 */
export function scoreVideo(video: Video, query: string): number {
  if (!query.trim()) return 0;

  let total = 0;

  // Title (highest weight)
  total += matchScore(video.title, query) * 3;

  // Performer name (high weight)
  total += matchScore(video.performerName, query) * 2.5;

  // Performers array
  (video.performers || []).forEach(p => { total += matchScore(p, query) * 2.5; });
  (video.modelsActors || []).forEach(m => { total += matchScore(m, query) * 2.5; });
  (video.models_actors || []).forEach(m => { total += matchScore(m, query) * 2.5; });

  // Tags (medium weight)
  video.tags.forEach(tag => { total += matchScore(tag, query) * 2; });

  // Category label
  total += matchScore(video.categoryLabel, query) * 1.8;

  // Channel name
  total += matchScore(video.channelName || '', query) * 1.5;

  // Description (lowest weight — long text)
  total += matchScore(video.description, query) * 0.8;

  // Source website
  total += matchScore(video.sourceWebsite || '', query) * 1;

  return total;
}

/**
 * Main search function — always returns results (fallback to popular if no match)
 * Returns scored and sorted results
 */
export function smartSearch(videos: Video[], query: string): Video[] {
  const q = normalize(query);
  if (!q) return videos;

  const scored: SearchResult[] = videos
    .map(v => ({ video: v, score: scoreVideo(v, q) }))
    .filter(r => r.score > 0);

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.map(r => r.video);
  }

  // ─── Fallback: no direct match ───
  // Return videos sorted by popularity (views) so "not found" never appears
  const fallback = [...videos].sort((a, b) => {
    const av = typeof a.viewsCount === 'number' ? a.viewsCount : 0;
    const bv = typeof b.viewsCount === 'number' ? b.viewsCount : 0;
    return bv - av;
  });
  return fallback;
}

/**
 * Tells if the current query has real matches or is showing fallback popular content
 */
export function hasRealMatches(videos: Video[], query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return videos.some(v => scoreVideo(v, q) > 0);
}

/**
 * Generate Google-style search suggestions from video data
 * Returns up to `limit` unique suggestions based on the query prefix
 */
export function getSearchSuggestions(
  videos: Video[],
  query: string,
  limit = 8
): SearchSuggestion[] {
  const q = normalize(query);
  if (!q || q.length < 1) return [];

  const seen = new Set<string>();
  const suggestions: SearchSuggestion[] = [];

  const addSuggestion = (text: string, type: SearchSuggestion['type'], icon: string) => {
    const key = normalize(text);
    if (!key || seen.has(key) || !key.includes(q)) return;
    seen.add(key);
    // Prioritize suggestions that START with the query
    suggestions.push({ text: text.trim(), type, icon });
  };

  // Collect from performer names (highest priority)
  for (const v of videos) {
    if (v.performerName) addSuggestion(v.performerName, 'performer', 'person');
    (v.performers || []).forEach(p => addSuggestion(p, 'performer', 'person'));
    (v.modelsActors || []).forEach(m => addSuggestion(m, 'performer', 'person'));
    (v.models_actors || []).forEach(m => addSuggestion(m, 'performer', 'person'));
  }

  // Collect from tags
  for (const v of videos) {
    v.tags.forEach(tag => addSuggestion(tag, 'tag', 'tag'));
  }

  // Collect from category labels
  for (const v of videos) {
    addSuggestion(v.categoryLabel, 'category', 'category');
  }

  // Collect from titles
  for (const v of videos) {
    addSuggestion(v.title, 'title', 'movie');
  }

  // Sort: suggestions starting with query come first
  suggestions.sort((a, b) => {
    const aStarts = normalize(a.text).startsWith(q) ? 0 : 1;
    const bStarts = normalize(b.text).startsWith(q) ? 0 : 1;
    return aStarts - bStarts;
  });

  return suggestions.slice(0, limit);
}
