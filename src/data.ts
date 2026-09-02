import { CategoryInfo, Performer, Video } from './types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'trending',
    name: 'Trending',
    icon: 'local_fire_department',
    heroImage: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?q=75&w=800&auto=format&fit=crop',
    description: 'The hottest and most popular exclusive content trending across FapnXX.'
  },
  {
    id: 'amateur',
    name: 'Amateur',
    icon: 'person',
    heroImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=75&w=800&auto=format&fit=crop',
    description: 'Discover the most popular community-uploaded content, real couples, and raw cuts.'
  },
  {
    id: 'milf',
    name: 'MILF',
    icon: 'family_restroom',
    heroImage: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=75&w=800&auto=format&fit=crop',
    description: 'Sophisticated luxury series and experienced performers in high definition.'
  },
  {
    id: 'teen',
    name: 'Teen (18+)',
    icon: 'emergency',
    heroImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=75&w=800&auto=format&fit=crop',
    description: 'Young adult performers and vibrant, energetic cinematic encounters (18+).'
  },
  {
    id: 'anal',
    name: 'Anal',
    icon: 'settings_input_component',
    heroImage: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=75&w=800&auto=format&fit=crop',
    description: 'High-intensity, premium adult productions and uncensored releases.'
  },
  {
    id: 'lesbian',
    name: 'Lesbian',
    icon: 'female',
    heroImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=75&w=800&auto=format&fit=crop',
    description: 'Passionate and aesthetic female-centered romance and encounters.'
  },
  {
    id: 'gay',
    name: 'Gay',
    icon: 'male',
    heroImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=75&w=800&auto=format&fit=crop',
    description: 'Premium male-on-male productions, verified models, and exclusive releases.'
  },
  {
    id: 'transgender',
    name: 'Transgender / Shemale',
    icon: 'transgender',
    heroImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=75&w=800&auto=format&fit=crop',
    description: 'Stunning verified trans models, high-definition solo, and duo releases.'
  },
  {
    id: 'pov',
    name: 'POV',
    icon: 'visibility',
    heroImage: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=75&w=800&auto=format&fit=crop',
    description: 'Immerse yourself completely. Experience every scene from the most intimate perspective.'
  },
  {
    id: 'big-tits',
    name: 'Big Tits',
    icon: 'bubble_chart',
    heroImage: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?q=75&w=800&auto=format&fit=crop',
    description: 'Top busty models, natural and enhanced large chests in 4K resolution.'
  },
  {
    id: 'big-ass',
    name: 'Big Ass',
    icon: 'radio_button_checked',
    heroImage: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?q=75&w=800&auto=format&fit=crop',
    description: 'Curvy performers, thick silhouettes, and booty-focused scenes.'
  },
  {
    id: 'blowjob',
    name: 'Blowjob & Oral',
    icon: 'record_voice_over',
    heroImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=75&w=800&auto=format&fit=crop',
    description: 'Intense oral sex, deepthroat, facial, and POV oral encounters.'
  },
  {
    id: 'creampie',
    name: 'Creampie',
    icon: 'water_drop',
    heroImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=75&w=800&auto=format&fit=crop',
    description: 'Uncensored internal climaxes and intense passionate finishes.'
  },
  {
    id: 'threesome',
    name: 'Threesome & Groups',
    icon: 'groups',
    heroImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=75&w=800&auto=format&fit=crop',
    description: 'Dynamic group scenes, MFF, FFM, MMF, and wild party encounters.'
  },
  {
    id: 'interracial',
    name: 'Interracial',
    icon: 'diversity_1',
    heroImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=75&w=800&auto=format&fit=crop',
    description: 'Cross-cultural passion, BBC, and diverse international pairings.'
  },
  {
    id: 'ebony',
    name: 'Ebony',
    icon: 'dark_mode',
    heroImage: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=75&w=800&auto=format&fit=crop',
    description: 'Gorgeous dark-skinned models, curvy black performers, and solo shows.'
  },
  {
    id: 'latina',
    name: 'Latina',
    icon: 'wb_sunny',
    heroImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=75&w=800&auto=format&fit=crop',
    description: 'Passionate Latin American performers, fiery scenes, and Brazilian beauties.'
  },
  {
    id: 'desi',
    name: 'Desi',
    icon: 'flare',
    heroImage: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=75&w=800&auto=format&fit=crop',
    description: 'Authentic Indian, South Asian and Desi romance & cinematic films.'
  },
  {
    id: 'asian',
    name: 'Asian',
    icon: 'temple_buddhist',
    heroImage: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=75&w=800&auto=format&fit=crop',
    description: 'Sensual Japanese, Korean, and East Asian high definition adult releases.'
  },
  {
    id: 'hentai',
    name: 'Hentai',
    icon: 'palette',
    heroImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=75&w=800&auto=format&fit=crop',
    description: '3D animated and high-energy uncensored anime adult features.'
  },
  {
    id: 'vr',
    name: 'VR (Virtual Reality)',
    icon: 'view_in_ar',
    heroImage: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=75&w=800&auto=format&fit=crop',
    description: '180° and 360° fully immersive virtual reality adult experiences.'
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    icon: 'flash_on',
    heroImage: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=75&w=800&auto=format&fit=crop',
    description: 'High-energy rough encounters, intense pounding, and uncensored releases.'
  },
  {
    id: 'fetish',
    name: 'Fetish & BDSM',
    icon: 'lock',
    heroImage: 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?q=75&w=800&auto=format&fit=crop',
    description: 'Leather, latex, stockings, dominance, submission, and niche fantasies.'
  },
  {
    id: 'masturbation',
    name: 'Masturbation & Solo',
    icon: 'fingerprint',
    heroImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=75&w=800&auto=format&fit=crop',
    description: 'Intimate solo performers, toy play, orgasms, and webcam recordings.'
  },
  {
    id: 'public',
    name: 'Public & Outdoor',
    icon: 'nature_people',
    heroImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=75&w=800&auto=format&fit=crop',
    description: 'Thrilling outdoor encounters, risky public spots, and flashing moments.'
  },
  {
    id: 'mature',
    name: 'Mature & Vintage',
    icon: 'auto_awesome',
    heroImage: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=75&w=800&auto=format&fit=crop',
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


