import { CategoryInfo, Performer, Video } from './types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'trending',
    name: 'Trending',
    icon: 'local_fire_department',
    heroImage: '/images/categories/trending.jpg',
    description: 'The hottest and most popular exclusive content trending across FapnXX.'
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

export const PERFORMERS: import('./types').Performer[] = [];

// Clean baseline: All initial video views, likes, and ratings reset to 0 for genuine real-time tracking
export const VIDEOS: Video[] = ((curatedDataset as any) || []).map((v: any) => ({
  ...v,
  viewsCount: 0,
  views: '0 views',
  likesCount: 0,
  rating: '0%',
}));

export const INITIAL_VIDEOS = VIDEOS;

export const INITIAL_LANDING_BANNERS: import('./types').LandingBanner[] = [];


