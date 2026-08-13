export type Language =
  | 'en'
  | 'hi'
  | 'ta'
  | 'te'
  | 'bn'
  | 'mr'
  | 'gu'
  | 'es'
  | 'fr'
  | 'de'
  | 'ja'
  | 'ko'
  | 'ru'
  | 'ar';

export interface LanguageMeta {
  code: Language;
  label: string;
  englishName: string;
  flag: string;
  keywords: string[];
}

export const LANGUAGE_LIST: LanguageMeta[] = [
  { code: 'en', label: 'English', englishName: 'English', flag: '🇬🇧', keywords: ['all', 'english', 'exclusive', '4k', 'trending'] },
  { code: 'hi', label: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳', keywords: ['desi', 'bhabhi', 'romance', 'indian', 'hindi', 'trending'] },
  { code: 'ta', label: 'தமிழ்', englishName: 'Tamil', flag: '🇮🇳', keywords: ['south', 'tamil', 'desi', 'romance', 'sensual'] },
  { code: 'te', label: 'తెలుగు', englishName: 'Telugu', flag: '🇮🇳', keywords: ['south', 'telugu', 'desi', 'romance', 'sensual'] },
  { code: 'bn', label: 'বাংলা', englishName: 'Bengali', flag: '🇮🇳', keywords: ['bengali', 'bhabhi', 'desi', 'romance'] },
  { code: 'mr', label: 'मराठी', englishName: 'Marathi', flag: '🇮🇳', keywords: ['marathi', 'desi', 'bhabhi', 'romance'] },
  { code: 'gu', label: 'ગુજરાતી', englishName: 'Gujarati', flag: '🇮🇳', keywords: ['gujarati', 'desi', 'bhabhi', 'romance'] },
  { code: 'es', label: 'Español', englishName: 'Spanish', flag: '🇪🇸', keywords: ['latina', 'romance', 'sensual', 'exclusive'] },
  { code: 'fr', label: 'Français', englishName: 'French', flag: '🇫🇷', keywords: ['glamour', 'sensual', 'romance', 'exclusive'] },
  { code: 'de', label: 'Deutsch', englishName: 'German', flag: '🇩🇪', keywords: ['hd', 'exclusive', '4k', 'ultra'] },
  { code: 'ja', label: '日本語', englishName: 'Japanese', flag: '🇯🇵', keywords: ['japanese', 'asian', 'cosplay', 'sensual'] },
  { code: 'ko', label: '한국어', englishName: 'Korean', flag: '🇰🇷', keywords: ['korean', 'asian', 'romance', 'sensual'] },
  { code: 'ru', label: 'Русский', englishName: 'Russian', flag: '🇷🇺', keywords: ['russian', 'glamour', '4k', 'exclusive'] },
  { code: 'ar', label: 'العربية', englishName: 'Arabic', flag: '🇦🇪', keywords: ['middle-east', 'sensual', 'exotic', 'exclusive'] },
];

export interface Translations {
  // Brand & Header
  brandTitle: string;
  searchPlaceholder: string;
  browse: string;
  categories: string;
  performers: string;
  trending: string;
  saved: string;
  history: string;
  upload: string;
  ads: string;
  admin: string;
  signIn: string;
  signOut: string;
  
  // DRM & Player
  protectedStream: string;
  tokenVerifying: string;
  tokenSecured: string;
  hotlinkGuardActive: string;
  streamExpired: string;
  refreshStreamToken: string;

  // Recommendation & Trending
  trendingNow: string;
  trendingRank: string;
  recommendedForYou: string;
  relevanceMatch: string;
  views: string;
  likes: string;
  shares: string;
  timeAgo: string;

  // DMCA & Moderation
  reportDMCA: string;
  reportTitle: string;
  reportSubtitle: string;
  reasonCopyright: string;
  reasonInappropriate: string;
  reasonSpam: string;
  reasonPrivacy: string;
  reasonOther: string;
  reporterName: string;
  reporterEmail: string;
  reportDetailsPlaceholder: string;
  submitReport: string;
  reportSuccessMsg: string;
  reportsAdminTab: string;
  pendingReports: string;
  takedownVideo: string;
  dismissReport: string;
  statusPending: string;
  statusResolved: string;
  statusDismissed: string;
  statusTakedown: string;

  // Common UI
  close: string;
  cancel: string;
  confirm: string;
  allCategories: string;
  exclusive: string;
  hdQuality: string;
  copiedToClipboard: string;
  ageGateTitle: string;
  ageGateSub: string;
  enterSite: string;
  leaveSite: string;
}

const baseEn: Translations = {
  brandTitle: 'FapnXX',
  searchPlaceholder: 'Search high quality videos, models, tags...',
  browse: 'Browse',
  categories: 'Categories',
  performers: 'Pornstars',
  trending: 'Trending',
  saved: 'Saved Videos',
  history: 'Watch History',
  upload: 'Upload Video',
  ads: 'Ad Manager',
  admin: 'Admin Panel',
  signIn: 'Sign In',
  signOut: 'Sign Out',

  protectedStream: 'HMAC Tokenized Secure Stream',
  tokenVerifying: 'Verifying playback token...',
  tokenSecured: 'Signed Token Active (10m TTL)',
  hotlinkGuardActive: 'Hotlink Guard Enabled',
  streamExpired: 'Stream token expired. Requesting fresh signed token...',
  refreshStreamToken: 'Refresh Token',

  trendingNow: 'Trending Now',
  trendingRank: 'Trending Rank',
  recommendedForYou: 'Recommended For You',
  relevanceMatch: 'Match',
  views: 'Views',
  likes: 'Likes',
  shares: 'Shares',
  timeAgo: 'Ago',

  reportDMCA: 'Report / DMCA',
  reportTitle: 'Report Content or DMCA Violation',
  reportSubtitle: 'Submit a legal copyright claim or content violation request.',
  reasonCopyright: 'Copyright / DMCA Infringement',
  reasonInappropriate: 'Inappropriate or Illegal Content',
  reasonSpam: 'Spam, Misleading, or Scam',
  reasonPrivacy: 'Privacy or Non-Consensual Violation',
  reasonOther: 'Other Policy Violation',
  reporterName: 'Your Name (Optional)',
  reporterEmail: 'Contact Email',
  reportDetailsPlaceholder: 'Provide specific timestamps, ownership proof, or details about the issue...',
  submitReport: 'Submit DMCA Report',
  reportSuccessMsg: 'Report submitted successfully to our moderation team.',
  reportsAdminTab: 'DMCA & Moderation',
  pendingReports: 'Pending Moderation Queue',
  takedownVideo: 'Takedown Video',
  dismissReport: 'Dismiss Report',
  statusPending: 'Pending',
  statusResolved: 'Resolved',
  statusDismissed: 'Dismissed',
  statusTakedown: 'Taken Down',

  close: 'Close',
  cancel: 'Cancel',
  confirm: 'Confirm',
  allCategories: 'All Categories',
  exclusive: 'Exclusive',
  hdQuality: 'UHD 4K',
  copiedToClipboard: 'Video URL copied to clipboard!',
  ageGateTitle: 'AGE VERIFICATION REQUIRED',
  ageGateSub: 'This site contains adult oriented content. You must be at least 18 years of age or older to enter.',
  enterSite: 'I AM 18 OR OLDER - ENTER',
  leaveSite: 'EXIT / LEAVE',
};

const baseHi: Translations = {
  ...baseEn,
  searchPlaceholder: 'उच्च गुणवत्ता वाले वीडियो, मॉडल, टैग खोजें...',
  browse: 'ब्राउज़ करें',
  categories: 'श्रेणियां',
  performers: 'Pornstars',
  trending: 'ट्रेंडिंग',
  saved: 'सहेजे गए वीडियो',
  history: 'देखा गया इतिहास',
  upload: 'वीडियो अपलोड',
  ads: 'विज्ञापन प्रबंधक',
  admin: 'एडमिन पैनल',
  signIn: 'साइन इन',
  signOut: 'साइन आउट',
  trendingNow: 'अभी ट्रेंडिंग में',
  recommendedForYou: 'आपके लिए अनुशंसित',
  views: 'दृश्य',
  likes: 'पसंद',
  close: 'बंद करें',
  cancel: 'रद्द करें',
  confirm: 'पुष्टि करें',
};

export const translations: Record<Language, Translations> = {
  en: baseEn,
  hi: baseHi,
  ta: { ...baseEn, searchPlaceholder: 'தேடுங்கள்...', browse: 'உலாவு', categories: 'வகைகள்', trendingNow: 'பிரபலமானவை' },
  te: { ...baseEn, searchPlaceholder: 'వెతకండి...', browse: 'బ్రౌజ్ చేయండి', categories: 'వర్గాలు', trendingNow: 'ట్రెండింగ్' },
  bn: { ...baseEn, searchPlaceholder: 'সন্ধান করুন...', browse: 'ব্রাউজ করুন', categories: 'বিভাগসমূহ', trendingNow: 'ট্রেন্ডিং' },
  mr: { ...baseEn, searchPlaceholder: 'शोधा...', browse: 'ब्राउझ करा', categories: 'श्रेण्या', trendingNow: 'ट्रेंडिंग' },
  gu: { ...baseEn, searchPlaceholder: 'શોધો...', browse: 'બ્રાઉઝ કરો', categories: 'શ્રેણીઓ', trendingNow: 'ટ્રેન્ડિંગ' },
  es: { ...baseEn, searchPlaceholder: 'Buscar vídeos...', browse: 'Explorar', categories: 'Categorías', trendingNow: 'Tendencias' },
  fr: { ...baseEn, searchPlaceholder: 'Rechercher...', browse: 'Explorer', categories: 'Catégories', trendingNow: 'Tendances' },
  de: { ...baseEn, searchPlaceholder: 'Suchen...', browse: 'Durchsuchen', categories: 'Kategorien', trendingNow: 'Beliebt' },
  ja: { ...baseEn, searchPlaceholder: '動画を検索...', browse: '閲覧', categories: 'カテゴリ', trendingNow: 'トレンド' },
  ko: { ...baseEn, searchPlaceholder: '검색...', browse: '탐색', categories: '카테고리', trendingNow: '인기' },
  ru: { ...baseEn, searchPlaceholder: 'Поиск видео...', browse: 'Обзор', categories: 'Категории', trendingNow: 'В тренде' },
  ar: { ...baseEn, searchPlaceholder: 'بحث...', browse: 'تصفح', categories: 'الفئات', trendingNow: 'الأكثر تداولاً' },
};
