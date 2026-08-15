import { Video } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// SUPER SMART GROUPED AUTO-SUGGEST & FUZZY SEARCH ENGINE
// Groups Pornstars, Tags, Categories, and Video Titles with clear Section Headers
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchResult {
  video: Video;
  score: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'performer' | 'tag' | 'category' | 'title';
  icon: string;
}

export interface GroupedSuggestions {
  performers: SearchSuggestion[];
  tags: SearchSuggestion[];
  categories: SearchSuggestion[];
  titles: SearchSuggestion[];
  totalCount: number;
}

/**
 * Normalize string: lowercase, remove diacritics/accents, special symbols, multiple spaces
 */
export function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance for fuzzy typo-tolerance
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Fuzzy similarity score between two words (0 to 1)
 */
function fuzzyWordSimilarity(target: string, query: string): number {
  if (!target || !query) return 0;
  if (target === query) return 1.0;
  if (target.startsWith(query)) return 0.92;
  if (target.includes(query)) return 0.8;

  const maxLen = Math.max(target.length, query.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshtein(target, query);
  const maxAllowedDist = query.length <= 4 ? 1 : 2;
  if (dist <= maxAllowedDist) {
    return Math.max(0, 1 - dist / maxLen);
  }
  return 0;
}

/**
 * Comprehensive Match Score across multi-tokens with typo tolerance
 */
function matchScore(field: string, query: string): number {
  const f = normalizeText(field);
  const q = normalizeText(query);
  if (!f || !q) return 0;

  if (f === q) return 100;                        // Exact match
  if (f.startsWith(q)) return 85;                // Starts with full query
  if (f.includes(q)) return 70;                  // Contains full query phrase

  const fTokens = f.split(' ').filter(Boolean);
  const qTokens = q.split(' ').filter(Boolean);
  let totalScore = 0;

  for (const qt of qTokens) {
    let bestTokenScore = 0;
    for (const ft of fTokens) {
      if (ft === qt) {
        bestTokenScore = Math.max(bestTokenScore, 50);
      } else if (ft.startsWith(qt)) {
        bestTokenScore = Math.max(bestTokenScore, 40);
      } else if (ft.includes(qt) && qt.length >= 2) {
        bestTokenScore = Math.max(bestTokenScore, 30);
      } else {
        const sim = fuzzyWordSimilarity(ft, qt);
        if (sim > 0.6) {
          bestTokenScore = Math.max(bestTokenScore, Math.round(sim * 35));
        }
      }
    }
    totalScore += bestTokenScore;
  }

  return totalScore;
}

/**
 * Score a video against a search query across all searchable fields
 */
export function scoreVideo(video: Video, query: string): number {
  if (!query.trim()) return 0;
  const q = normalizeText(query);
  if (!q) return 0;

  let total = 0;

  // 1. Performers / Models (3.5x weight)
  const performers = [
    video.performerName,
    ...(video.performers || []),
    ...(video.modelsActors || []),
    ...(video.models_actors || []),
  ].filter(Boolean) as string[];

  for (const p of performers) {
    const pScore = matchScore(p, q);
    if (pScore > 0) total += pScore * 3.5;
  }

  // 2. Title (3.0x weight)
  const titleScore = matchScore(video.title, q);
  if (titleScore > 0) total += titleScore * 3.0;

  // 3. Tags (2.5x weight)
  for (const tag of (video.tags || [])) {
    const tScore = matchScore(tag, q);
    if (tScore > 0) total += tScore * 2.5;
  }

  // 4. Category (2.0x weight)
  const catScore = matchScore(video.categoryLabel || video.category || '', q);
  if (catScore > 0) total += catScore * 2.0;

  // 5. Description (1.0x weight)
  if (video.description) {
    const dScore = matchScore(video.description, q);
    if (dScore > 0) total += dScore * 1.0;
  }

  return total;
}

/**
 * Smart Search: Returns sorted matched videos.
 */
export function smartSearch(videos: Video[], query: string): Video[] {
  const q = normalizeText(query);
  if (!q) return videos;

  const scored: SearchResult[] = (videos || [])
    .map((v) => ({ video: v, score: scoreVideo(v, q) }))
    .filter((r) => r.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.map((r) => r.video);
}

export function hasRealMatches(videos: Video[], query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return (videos || []).some((v) => scoreVideo(v, q) > 0);
}

/**
 * Grouped Search Suggestions:
 * Exactly like Reference UI (Pornstars Section, Tags Section, Categories, Titles)
 */
export function getGroupedSearchSuggestions(
  videos: Video[],
  query: string
): GroupedSuggestions {
  const q = normalizeText(query);
  if (!q || q.length < 1) {
    return { performers: [], tags: [], categories: [], titles: [], totalCount: 0 };
  }

  const seen = new Set<string>();

  const testMatch = (text: string): { matches: boolean; score: number } => {
    const key = normalizeText(text);
    if (!key) return { matches: false, score: 0 };
    if (key === q) return { matches: true, score: 100 };
    if (key.startsWith(q)) return { matches: true, score: 80 };
    if (key.includes(q)) return { matches: true, score: 60 };
    const words = key.split(' ');
    const sim = Math.max(...words.map((w) => fuzzyWordSimilarity(w, q)));
    if (sim > 0.65) return { matches: true, score: Math.round(sim * 50) };
    return { matches: false, score: 0 };
  };

  // 1. Collect Performers
  const performersList: { text: string; score: number }[] = [];
  for (const v of videos) {
    const pNames = [
      v.performerName,
      ...(v.performers || []),
      ...(v.modelsActors || []),
      ...(v.models_actors || []),
    ].filter(Boolean) as string[];

    for (const p of pNames) {
      if (p === 'Anonymous' || p === 'User Uploaded') continue;
      const clean = p.trim();
      const norm = normalizeText(clean);
      if (norm && !seen.has(`p:${norm}`)) {
        const m = testMatch(clean);
        if (m.matches) {
          seen.add(`p:${norm}`);
          performersList.push({ text: clean, score: m.score });
        }
      }
    }
  }
  performersList.sort((a, b) => b.score - a.score);

  // 2. Collect Tags
  const tagsList: { text: string; score: number }[] = [];
  for (const v of videos) {
    for (const tag of (v.tags || [])) {
      const clean = tag.trim();
      const norm = normalizeText(clean);
      if (norm && !seen.has(`t:${norm}`)) {
        const m = testMatch(clean);
        if (m.matches) {
          seen.add(`t:${norm}`);
          tagsList.push({ text: clean, score: m.score });
        }
      }
    }
  }
  tagsList.sort((a, b) => b.score - a.score);

  // 3. Collect Categories
  const categoriesList: { text: string; score: number }[] = [];
  for (const v of videos) {
    const cat = v.categoryLabel || v.category || '';
    if (cat) {
      const clean = cat.trim();
      const norm = normalizeText(clean);
      if (norm && !seen.has(`c:${norm}`)) {
        const m = testMatch(clean);
        if (m.matches) {
          seen.add(`c:${norm}`);
          categoriesList.push({ text: clean, score: m.score });
        }
      }
    }
  }
  categoriesList.sort((a, b) => b.score - a.score);

  // 4. Collect Titles
  const titlesList: { text: string; score: number }[] = [];
  for (const v of videos) {
    if (v.title) {
      const clean = v.title.trim();
      const norm = normalizeText(clean);
      if (norm && !seen.has(`ti:${norm}`)) {
        const m = testMatch(clean);
        if (m.matches) {
          seen.add(`ti:${norm}`);
          titlesList.push({ text: clean, score: m.score });
        }
      }
    }
  }
  titlesList.sort((a, b) => b.score - a.score);

  const performers: SearchSuggestion[] = performersList.slice(0, 6).map((p) => ({
    text: p.text,
    type: 'performer',
    icon: 'person',
  }));

  const tags: SearchSuggestion[] = tagsList.slice(0, 6).map((t) => ({
    text: t.text,
    type: 'tag',
    icon: 'tag',
  }));

  const categories: SearchSuggestion[] = categoriesList.slice(0, 3).map((c) => ({
    text: c.text,
    type: 'category',
    icon: 'category',
  }));

  const titles: SearchSuggestion[] = titlesList.slice(0, 4).map((ti) => ({
    text: ti.text,
    type: 'title',
    icon: 'movie',
  }));

  const totalCount = performers.length + tags.length + categories.length + titles.length;

  return { performers, tags, categories, titles, totalCount };
}

/**
 * Backward compatibility wrapper
 */
export function getSearchSuggestions(
  videos: Video[],
  query: string,
  limit = 8
): SearchSuggestion[] {
  const g = getGroupedSearchSuggestions(videos, query);
  return [...g.performers, ...g.tags, ...g.categories, ...g.titles].slice(0, limit);
}
