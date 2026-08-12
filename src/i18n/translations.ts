export type Language = 'en' | 'hi';

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

export const translations: Record<Language, Translations> = {
  en: {
    brandTitle: 'INDIANHUBXX',
    searchPlaceholder: 'Search high quality videos, models, tags...',
    browse: 'Browse',
    categories: 'Categories',
    performers: 'Performers',
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

    trendingNow: 'Trending Now in India',
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
  },

  hi: {
    brandTitle: 'INDIANHUBXX',
    searchPlaceholder: 'उच्च गुणवत्ता वाले वीडियो, मॉडल, टैग खोजें...',
    browse: 'ब्राउज़ करें',
    categories: 'श्रेणियां',
    performers: 'कलाकार',
    trending: 'ट्रेंडिंग',
    saved: 'सहेजे गए वीडियो',
    history: 'देखा गया इतिहास',
    upload: 'वीडियो अपलोड',
    ads: 'विज्ञापन प्रबंधक',
    admin: 'एडमिन पैनल',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',

    protectedStream: 'HMAC टोकनाइज़्ड सुरक्षित स्ट्रीम',
    tokenVerifying: 'प्लेबैक टोकन सत्यापित किया जा रहा है...',
    tokenSecured: 'हस्ताक्षरित टोकन सक्रिय (10 मिनट)',
    hotlinkGuardActive: 'हॉटलिंक सुरक्षा चालू',
    streamExpired: 'स्ट्रीम टोकन समाप्त हो गया। नया हस्ताक्षरित टोकन प्राप्त हो रहा है...',
    refreshStreamToken: 'टोकन रिफ्रेश करें',

    trendingNow: 'भारत में अभी ट्रेंडिंग',
    trendingRank: 'ट्रेंडिंग रैंक',
    recommendedForYou: 'आपके लिए अनुशंसित',
    relevanceMatch: 'मैच',
    views: 'दृश्य',
    likes: 'पसंद',
    shares: 'शेयर',
    timeAgo: 'पहले',

    reportDMCA: 'रिपोर्ट / डीएमसीए',
    reportTitle: 'सामग्री या डीएमसीए उल्लंघन की रिपोर्ट करें',
    reportSubtitle: 'कानूनी कॉपीराइट दावा या सामग्री उल्लंघन अनुरोध सबमिट करें।',
    reasonCopyright: 'कॉपीराइट / डीएमसीए उल्लंघन',
    reasonInappropriate: 'अनुचित या अवैध सामग्री',
    reasonSpam: 'स्पैम, भ्रामक, या धोखाधड़ी',
    reasonPrivacy: 'गोपनीयता या गैर-सहमति उल्लंघन',
    reasonOther: 'अन्य नीति उल्लंघन',
    reporterName: 'आपका नाम (वैकल्पिक)',
    reporterEmail: 'संपर्क ईमेल',
    reportDetailsPlaceholder: 'विशिष्ट समय-स्टैम्प, स्वामित्व प्रमाण, या समस्या का विवरण प्रदान करें...',
    submitReport: 'डीएमसीए रिपोर्ट दर्ज करें',
    reportSuccessMsg: 'रिपोर्ट सफलतापूर्वक हमारी मॉडरेशन टीम को सबमिट कर दी गई है।',
    reportsAdminTab: 'डीएमसीए और मॉडरेशन',
    pendingReports: 'लंबित मॉडरेशन कतार',
    takedownVideo: 'वीडियो हटाएं (Take Down)',
    dismissReport: 'रिपोर्ट खारिज करें',
    statusPending: 'लंबित',
    statusResolved: 'हल किया गया',
    statusDismissed: 'खारिज किया गया',
    statusTakedown: 'हटा दिया गया',

    close: 'बंद करें',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    allCategories: 'सभी श्रेणियां',
    exclusive: 'विशेष',
    hdQuality: 'यूएचडी 4K',
    copiedToClipboard: 'वीडियो लिंक क्लिपबोर्ड पर कॉपी हो गया!',
    ageGateTitle: 'आयु सत्यापन आवश्यक',
    ageGateSub: 'इस साइट पर वयस्क उन्मुख सामग्री शामिल है। प्रवेश करने के लिए आपकी आयु कम से कम 18 वर्ष या उससे अधिक होनी चाहिए।',
    enterSite: 'मैं 18 वर्ष या उससे अधिक का हूँ - प्रवेश करें',
    leaveSite: 'बाहर निकलें',
  },
};
