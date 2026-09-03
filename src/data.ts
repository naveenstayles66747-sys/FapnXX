import { CategoryInfo, Performer, Video } from './types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'trending',
    name: 'Trending',
    icon: 'local_fire_department',
    heroImage: '/images/categories/trending.jpg',
    description: 'The hottest and most popular exclusive content trending across FapXX.'
  },
  {
    id: 'amateur',
    name: 'Amateur',
    icon: 'person',
    heroImage: '/images/categories/amateur.jpg',
    description: 'Discover the most popular community-uploaded content, real couples, and raw cuts.'
  },
  {
    id: 'milf',
    name: 'MILF',
    icon: 'family_restroom',
    heroImage: '/images/categories/milf.jpg',
    description: 'Sophisticated luxury series and experienced performers in high definition.'
  },
  {
    id: 'teen',
    name: 'Teen (18+)',
    icon: 'emergency',
    heroImage: '/images/categories/teen.jpg',
    description: 'Young adult performers and vibrant, energetic cinematic encounters (18+).'
  },
  {
    id: 'anal',
    name: 'Anal',
    icon: 'settings_input_component',
    heroImage: '/images/categories/anal.jpg',
    description: 'High-intensity, premium adult productions and uncensored releases.'
  },
  {
    id: 'lesbian',
    name: 'Lesbian',
    icon: 'female',
    heroImage: '/images/categories/lesbian.jpg',
    description: 'Passionate and aesthetic female-centered romance and encounters.'
  },
  {
    id: 'gay',
    name: 'Gay',
    icon: 'male',
    heroImage: '/images/categories/gay.jpg',
    description: 'Premium male-on-male productions, verified models, and exclusive releases.'
  },
  {
    id: 'transgender',
    name: 'Transgender / Shemale',
    icon: 'transgender',
    heroImage: '/images/categories/transgender.jpg',
    description: 'Stunning verified trans models, high-definition solo, and duo releases.'
  },
  {
    id: 'pov',
    name: 'POV',
    icon: 'visibility',
    heroImage: '/images/categories/pov.jpg',
    description: 'Immerse yourself completely. Experience every scene from the most intimate perspective.'
  },
  {
    id: 'big-tits',
    name: 'Big Tits',
    icon: 'bubble_chart',
    heroImage: '/images/categories/big-tits.jpg',
    description: 'Top busty models, natural and enhanced large chests in 4K resolution.'
  },
  {
    id: 'big-ass',
    name: 'Big Ass',
    icon: 'radio_button_checked',
    heroImage: '/images/categories/big-ass.jpg',
    description: 'Curvy performers, thick silhouettes, and booty-focused scenes.'
  },
  {
    id: 'blowjob',
    name: 'Blowjob & Oral',
    icon: 'record_voice_over',
    heroImage: '/images/categories/blowjob.jpg',
    description: 'Intense oral sex, deepthroat, facial, and POV oral encounters.'
  },
  {
    id: 'creampie',
    name: 'Creampie',
    icon: 'water_drop',
    heroImage: '/images/categories/creampie.jpg',
    description: 'Uncensored internal climaxes and intense passionate finishes.'
  },
  {
    id: 'threesome',
    name: 'Threesome & Groups',
    icon: 'groups',
    heroImage: '/images/categories/threesome.jpg',
    description: 'Dynamic group scenes, MFF, FFM, MMF, and wild party encounters.'
  },
  {
    id: 'interracial',
    name: 'Interracial',
    icon: 'diversity_1',
    heroImage: '/images/categories/interracial.jpg',
    description: 'Cross-cultural passion, BBC, and diverse international pairings.'
  },
  {
    id: 'ebony',
    name: 'Ebony',
    icon: 'dark_mode',
    heroImage: '/images/categories/ebony.jpg',
    description: 'Gorgeous dark-skinned models, curvy black performers, and solo shows.'
  },
  {
    id: 'latina',
    name: 'Latina',
    icon: 'wb_sunny',
    heroImage: '/images/categories/latina.jpg',
    description: 'Passionate Latin American performers, fiery scenes, and Brazilian beauties.'
  },
  {
    id: 'desi',
    name: 'Desi',
    icon: 'flare',
    heroImage: '/images/categories/desi.jpg',
    description: 'Authentic Indian, South Asian and Desi romance & cinematic films.'
  },
  {
    id: 'asian',
    name: 'Asian',
    icon: 'temple_buddhist',
    heroImage: '/images/categories/asian.jpg',
    description: 'Sensual Japanese, Korean, and East Asian high definition adult releases.'
  },
  {
    id: 'hentai',
    name: 'Hentai',
    icon: 'palette',
    heroImage: '/images/categories/hentai.jpg',
    description: '3D animated and high-energy uncensored anime adult features.'
  },
  {
    id: 'vr',
    name: 'VR (Virtual Reality)',
    icon: 'view_in_ar',
    heroImage: '/images/categories/vr.jpg',
    description: '180° and 360° fully immersive virtual reality adult experiences.'
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    icon: 'flash_on',
    heroImage: '/images/categories/hardcore.jpg',
    description: 'High-energy rough encounters, intense pounding, and uncensored releases.'
  },
  {
    id: 'fetish',
    name: 'Fetish & BDSM',
    icon: 'lock',
    heroImage: '/images/categories/fetish.jpg',
    description: 'Leather, latex, stockings, dominance, submission, and niche fantasies.'
  },
  {
    id: 'masturbation',
    name: 'Masturbation & Solo',
    icon: 'fingerprint',
    heroImage: '/images/categories/masturbation.jpg',
    description: 'Intimate solo performers, toy play, orgasms, and webcam recordings.'
  },
  {
    id: 'public',
    name: 'Public & Outdoor',
    icon: 'nature_people',
    heroImage: '/images/categories/public.jpg',
    description: 'Thrilling outdoor encounters, risky public spots, and flashing moments.'
  },
  {
    id: 'mature',
    name: 'Mature & Vintage',
    icon: 'auto_awesome',
    heroImage: '/images/categories/mature.jpg',
    description: 'Classic adult cinema, vintage retro gems, and mature senior performers.'
  }
];

import curatedDataset from './data/pornhubCurated.json';

// Preserves authentic metadata (views, likes, ratings) from curated dataset
export const VIDEOS: Video[] = ((curatedDataset as any) || []) as Video[];

export const INITIAL_VIDEOS = VIDEOS;

export const BRAZZERS_VIDEOS: Video[] = [
  {
    id: 'bz-820285',
    title: 'Brazzers Exclusive Premiere - HD 4K Scene',
    category: 'trending',
    categoryLabel: 'Trending',
    categories: ['trending', 'hardcore', 'exclusive'],
    tags: ['Brazzers', 'Exclusive', 'HD', 'Trending', '4K', 'Premiere'],
    performers: ['Brazzers VIP Stars'],
    performerName: 'Brazzers Official',
    channelName: 'Brazzers',
    sourceWebsite: 'Brazzers Network',
    sourceWebsiteUrl: 'https://landing1.brazzersnetwork.com/tgp1?ad_id=820285&ata=Navifapx',
    adLinkUrl: 'https://landing1.brazzersnetwork.com/tgp1?ad_id=820285&ata=Navifapx',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    previewMp4Url: 'https://hw-cdn2.contentabc.com/a7/creatives/1/49/820285/1118165/1118165_video.mp4',
    embedUrl: 'https://hw-cdn2.contentabc.com/a7/creatives/1/49/820285/1118165/1118165_video.mp4',
    duration: '32:15',
    quality: '4K',
    views: '2.4M',
    viewsCount: 2420000,
    rating: '99%',
    timeAgo: 'Just now',
    createdAt: new Date().toISOString(),
    description: 'Official Brazzers VIP exclusive release in crystal clear 4K definition.',
    isExclusive: true,
    isNew: true,
    isOriginal: true,
    likesCount: 145000,
  }
];

export const INITIAL_LANDING_BANNERS: import('./types').LandingBanner[] = [];


