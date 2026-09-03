import { Video, ContentPreference } from '../types';

/**
 * Strict regex patterns with word boundaries to prevent false substring collisions
 * (e.g., prevents 'boy' matching 'boyfriend', 'men' matching 'women', 'male' matching 'female')
 */
const GAY_REGEX = /\b(gay|yaoi|twink|twinks|femboy|femboys|m\/m|m-m|guy on guy|guys on guys|men on men|man on man|boys on boys|male male|gay sex|gay porn|gay anal|gay bareback|gay blowjob|gay oral|gay cumshot|gay romance|gay couple)\b/i;

const LESBIAN_REGEX = /\b(lesbian|lesbians|lez|lezbian|yuri|girl on girl|girls on girls|woman on woman|women on women|female on female|tribbing|scissoring|pussy licking|lesbian sex|lesbian porn|lesbian oral|lesbian kiss|lesbian kissing|lesbian romance)\b/i;

const GAY_TAG_KEYWORDS = [
  'gay',
  'twink',
  'twinks',
  'yaoi',
  'femboy',
  'femboys',
  'hunk',
  'hunks',
  'jock',
  'jocks',
  'm/m',
  'm-m',
  'guy on guy',
  'guys on guys',
  'men on men',
  'man on man',
  'boys on boys',
  'male male',
  'gay bareback',
  'gay sex',
  'gay anal',
  'gay oral',
  'gay blowjob',
  'gay cumshot',
  'gay couple',
  'gay romance',
  'gay threesome',
  'gay gangbang',
  'gay massage',
  'shemale on male',
  'trans on male',
];

const LESBIAN_TAG_KEYWORDS = [
  'lesbian',
  'lesbians',
  'lez',
  'lezbian',
  'yuri',
  'girl on girl',
  'girls on girls',
  'woman on woman',
  'women on women',
  'female on female',
  'tribbing',
  'scissoring',
  'pussy licking',
  'lesbian strap on',
  'strapon lesbian',
  'lesbian oral',
  'lesbian massage',
  'lesbian romance',
  'lesbian finger',
  'lesbian fingering',
  'lesbian squirt',
  'lesbian kiss',
  'lesbian kissing',
  'lesbian threesome',
  'lesbian orgasm',
  'lesbian bhabhi',
];

/**
 * Checks if a video belongs to the Gay (Male-on-Male) orientation category
 */
export function isGayVideo(v: Video): boolean {
  if (!v) return false;

  // 0. Explicit video orientation or contentPreference attribute
  if (v.orientation === 'gay' || (v as any).contentPreference === 'gay') return true;

  // 1. Primary or secondary category match
  const cat = (v.category || '').toLowerCase();
  if (cat === 'gay') return true;

  if (Array.isArray(v.categories)) {
    if (v.categories.some((c) => (c || '').toLowerCase() === 'gay')) return true;
  }

  // 2. Tag matches
  const tags = Array.isArray(v.tags)
    ? v.tags.map((t) => (typeof t === 'string' ? t.toLowerCase().trim() : ''))
    : [];

  const hasGayTag = tags.some((t) =>
    GAY_TAG_KEYWORDS.some((kw) => t === kw || t.startsWith(`${kw} `) || t.endsWith(` ${kw}`) || t.includes(` ${kw} `))
  );
  if (hasGayTag) return true;

  // 3. Title & Description matches with strict boundary regex
  const title = v.title || '';
  const desc = v.description || '';
  if (GAY_REGEX.test(title) || GAY_REGEX.test(desc)) return true;

  return false;
}

/**
 * Checks if a video belongs to the Lesbian (Female-on-Female) orientation category
 */
export function isLesbianVideo(v: Video): boolean {
  if (!v) return false;

  // 0. Explicit video orientation or contentPreference attribute
  if (v.orientation === 'lesbian' || (v as any).contentPreference === 'lesbian') return true;

  // 1. Primary or secondary category match
  const cat = (v.category || '').toLowerCase();
  if (cat === 'lesbian') return true;

  if (Array.isArray(v.categories)) {
    if (v.categories.some((c) => (c || '').toLowerCase() === 'lesbian')) return true;
  }

  // 2. Tag matches
  const tags = Array.isArray(v.tags)
    ? v.tags.map((t) => (typeof t === 'string' ? t.toLowerCase().trim() : ''))
    : [];

  const hasLesbianTag = tags.some((t) =>
    LESBIAN_TAG_KEYWORDS.some((kw) => t === kw || t.startsWith(`${kw} `) || t.endsWith(` ${kw}`) || t.includes(` ${kw} `))
  );
  if (hasLesbianTag) return true;

  // 3. Title & Description matches with strict boundary regex
  const title = v.title || '';
  const desc = v.description || '';
  if (LESBIAN_REGEX.test(title) || LESBIAN_REGEX.test(desc)) return true;

  return false;
}

/**
 * Determines a video's specific orientation: 'gay' | 'lesbian' | 'straight'
 */
export function getVideoOrientation(v: Video): 'gay' | 'lesbian' | 'straight' {
  if (isGayVideo(v)) return 'gay';
  if (isLesbianVideo(v)) return 'lesbian';
  return 'straight';
}

/**
 * High-precision filter that filters video catalog according to the selected user preference
 */
export function filterVideosByOrientation(
  videos: Video[],
  preference: ContentPreference = 'straight'
): Video[] {
  if (!Array.isArray(videos)) return [];

  if (preference === 'gay') {
    return videos.filter((v) => isGayVideo(v));
  }

  if (preference === 'lesbian') {
    return videos.filter((v) => isLesbianVideo(v));
  }

  // Straight (default): Exclude pure gay male content from straight feed
  return videos.filter((v) => !isGayVideo(v));
}
