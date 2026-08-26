// Central ExoClick Ad Configuration & Zone Mappings

export const AD_ZONES = {
  SITE_HASH: '6a97888e',
  DESKTOP_STICKY_LEADERBOARD: import.meta.env.VITE_EXO_DESKTOP_STICKY || '6003172', // 728x90 (eas6a97888e17)
  MOBILE_STICKY_BANNER: import.meta.env.VITE_EXO_MOBILE_STICKY || '6003172',       // 300x50 / 300x250 (eas6a97888e17)
  DESKTOP_INTERSTITIAL: import.meta.env.VITE_EXO_DESKTOP_INTERSTITIAL || '6003174', // Desktop Fullpage (eas6a97888e35)
  MOBILE_INTERSTITIAL: import.meta.env.VITE_EXO_MOBILE_INTERSTITIAL || '6003180',   // Mobile Fullpage (eas6a97888e33)
  MOBILE_INSTANT_MESSAGE: import.meta.env.VITE_EXO_MOBILE_INSTANT || '6003178',     // Mobile Instant Chat (eas6a97888e14)
  IN_STREAM_VAST: import.meta.env.VITE_EXO_VAST_TAG || 'https://s.magsrv.com/v1/vast.php?idz=6003184',
  OUTSTREAM_VIDEO: import.meta.env.VITE_EXO_OUTSTREAM || '6003190',                 // In-Feed Outstream (eas6a97888e37)
  ON_STREAM_VIDEO_BANNER: import.meta.env.VITE_EXO_ON_STREAM || '6003172',          // In-Video Player Banner (eas6a97888e17)
  IN_PAGE_BANNER: import.meta.env.VITE_EXO_BANNER || '6003172',                     // Standard In-Page Banner (eas6a97888e17)
  DESKTOP_UNDER_PLAYER: import.meta.env.VITE_EXO_DESKTOP_UNDER_PLAYER || '6010076', // Desktop Under-Player (eas6a97888e2)
  MOBILE_UNDER_PLAYER: import.meta.env.VITE_EXO_MOBILE_UNDER_PLAYER || '6010078',   // Mobile Under-Player (eas6a97888e10)
  DESKTOP_POPUNDER: import.meta.env.VITE_EXO_DESKTOP_POPUNDER || '6010172',         // Desktop Popunder
  MOBILE_POPUNDER: import.meta.env.VITE_EXO_MOBILE_POPUNDER || '6010174',           // Mobile Popunder
  NATIVE_RECOMMENDED: import.meta.env.VITE_EXO_NATIVE_RECOMMENDED || '6010176',     // Native Recommendation (eas6a97888e20)
} as const;

export const AD_CONFIG = {
  VAST_TAG_URL: AD_ZONES.IN_STREAM_VAST,
  INTERSTITIAL_COOLDOWN_MS: 3 * 60 * 1000, // 3 minutes between interstitials
  INTERSTITIAL_MIN_TRANSITIONS: 2,         // At least 2 eligible navigation transitions
  OUTSTREAM_FEED_FREQUENCY: 6,             // Every 6 cards in feed
} as const;
