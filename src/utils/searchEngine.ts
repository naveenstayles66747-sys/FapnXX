import { Video } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// SUPER SMART FUZZY SEARCH ENGINE
// Real-time, typo-tolerant (Levenshtein/N-Gram), multi-field relevance scoring
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
 * Normalize string: lowercase, remove special characters, trim
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
  if (target.startsWith(query)) return 0.9;
  if (target.includes(query)) return 0.75;

  const maxLen = Math.max(target.length, query.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshtein(target, query);
  // Allow 1 typo for words >= 3 chars, 2 typos for words >= 6 chars
  const maxAllowedDist = query.length <= 4 ? 1 : 2;
  if (dist <= maxAllowedDist) {
    return Math.max(0, 1 - dist / maxLen);
  }
  return 0;
}

/**
 * Comprehensive Match Score across multi-tokens with fuzzy typo matching
 */
function matchScore(field: string, query: string): number {
  const f = normalizeText(field);
  const q = normalizeText(query);
  if (!f || !q) return 0;

  if (f === q) return 100;                        // Exact match
  if (f.startsWith(q)) return 85;                // Starts with query
  if (f.includes(q)) return 70;                  // Contains full query phrase

  const fTokens = f.split(' ').filter(Boolean);
  const qTokens = q.split(' ').filter(Boolean);
  let totalScore = 0;

  for (const qt of qTokens) {
    let bestTokenScore = 0;
    for (const ft of fTokens) {
      if (ft === qt) {
        bestTokenScore = Math.max(bestTokenScore, 45);
      } else if (ft.startsWith(qt)) {
        bestTokenScore = Math.max(bestTokenScore, 35);
      } else if (ft.includes(qt) && qt.length >= 2) {
        bestTokenScore = Math.max(bestTokenScore, 25);
      } else {
        // Fuzzy match
        const sim = fuzzyWordSimilarity(ft, qt);
        if (sim > 0.6) {
          bestTokenScore = Math.max(bestTokenScore, Math.round(sim * 30));
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

  // 1. Performers / Models (High weight for accurate pornstar discovery)
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

  // 2. Title
  const titleScore = matchScore(video.title, q);
  if (titleScore > 0) total += titleScore * 3.0;

  // 3. Tags
  for (const tag of (video.tags || [])) {
    const tScore = matchScore(tag, q);
    if (tScore > 0) total += tScore * 2.5;
  }

  // 4. Category
  const catScore = matchScore(video.categoryLabel || video.category || '', q);
  if (catScore > 0) total += catScore * 2.0;

  // 5. Description
  if (video.description) {
    const dScore = matchScore(video.description, q);
    if (dScore > 0) total += dScore * 1.0;
  }

  return total;
}

/**
 * Smart Search: Returns sorted matched videos or smart recommendations if typo/unmatched
 */
export function smartSearch(videos: Video[], query: string): Video[] {
  const q = normalizeText(query);
  if (!q) return videos;

  const scored: SearchResult[] = (videos || [])
    .map((v) => ({ video: v, score: scoreVideo(v, q) }))
    .filter((r) => r.score > 0);

  // Sort by relevance score descending
  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.map((r) => r.video);
  }

  // If no direct or fuzzy match found, return top recommended videos so page is never empty
  return [...videos].sort((a, b) => {
    const av = typeof a.viewsCount === 'number' ? a.viewsCount : 0;
    const bv = typeof b.viewsCount === 'number' ? b.viewsCount : 0;
    return bv - av;
  });
}

/**
 * Checks if search query has genuine matches in database
 */
export function hasRealMatches(videos: Video[], query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return (videos || []).some((v) => scoreVideo(v, q) > 0);
}

/**
 * Real-time Instant Suggestions (types: Performer, Tag, Category, Title)
 */
export function getSearchSuggestions(
  videos: Video[],
  query: string,
  limit = 8
): SearchSuggestion[] {
  const q = normalizeText(query);
  if (!q || q.length < 1) return [];

  const seen = new Set<string>();
  const directSuggestions: SearchSuggestion[] = [];
  const fuzzySuggestions: SearchSuggestion[] = [];

  const addCandidate = (text: string, type: SearchSuggestion['type'], icon: string) => {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    const key = normalizeText(clean);
    if (!key || seen.has(key)) return;
    seen.add(key);

    if (key.startsWith(q)) {
      directSuggestions.unshift({ text: clean, type, icon });
    } else if (key.includes(q)) {
      directSuggestions.push({ text: clean, type, icon });
    } else {
      // Check for smart fuzzy match on single words
      const words = key.split(' ');
      const hasFuzzy = words.some((w) => fuzzyWordSimilarity(w, q) > 0.65);
      if (hasFuzzy) {
        fuzzySuggestions.push({ text: clean, type, icon });
      }
    }
  };

  // 1. Performers (Top priority)
  for (const v of videos) {
    if (v.performerName && v.performerName !== 'Anonymous' && v.performerName !== 'User Uploaded') {
      addCandidate(v.performerName, 'performer', 'person');
    }
    (v.performers || []).forEach((p) => addCandidate(p, 'performer', 'person'));
    (v.modelsActors || []).forEach((m) => addCandidate(m, 'performer', 'person'));
    (v.models_actors || []).forEach((m) => addCandidate(m, 'performer', 'person'));
  }

  // 2. Tags
  for (const v of videos) {
    (v.tags || []).forEach((tag) => addCandidate(tag, 'tag', 'tag'));
  }

  // 3. Categories
  for (const v of videos) {
    if (v.categoryLabel) addCandidate(v.categoryLabel, 'category', 'category');
  }

  // 4. Titles
  for (const v of videos) {
    if (v.title) addCandidate(v.title, 'title', 'movie');
  }

  const combined = [...directSuggestions, ...fuzzySuggestions];
  return combined.slice(0, limit);
}
