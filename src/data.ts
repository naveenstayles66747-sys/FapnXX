import { CategoryInfo, Performer, Video } from './types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'trending',
    name: 'Trending',
    icon: 'local_fire_department',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
    description: 'The hottest and most popular exclusive content trending across FapnXX.'
  },
  {
    id: 'amateur',
    name: 'Amateur',
    icon: 'person',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBE-0RTWMQV-7aa5pGek-uZcH-J6NVY0INtMVyfRl352aCeM1uLLWSiSffe_5UkDXumbA8P3mzZ8nlChpgEnecAWSvWzXNqVF9bdRrgn4ZLRJ0p4JPa9gHP10i8FLpBvywDMR2gwDmptUGPby7rE6kgzi1eMivMfKRgQnn9pVpXkpeoFyMXZ4pY8uuvPTDbXWKvLc4gDcITGq9j9T1u3RoFCipZwkUoxWZl6_xUwgrJW_EK5rGwLAtbqQ',
    description: 'Discover the most popular community-uploaded content and raw cuts.'
  },
  {
    id: 'milf',
    name: 'MILF',
    icon: 'family_restroom',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-OYI524BZ48HOkZ2JX5LYqmyIji7hU1exKz5GYHfhzSmB-U9IkbGli86UCYFTtvOQH6an4ENmj1uvF4sp72yvfkdjfOxj4DabRz53a-5QteTtz51X2hJV59fVqCRf3CrvuQnvsBdSIKtFTJccaSZBw0iKvQmyqLiRjp1PVyDgBCKIjG7Dg9_ImGXxeIWah3swnYZ874JWJFH3yph7U5Z1lVuSuGTNd2F8mgXi84tEP0lIYp8o_MLS4A',
    description: 'Sophisticated luxury series and experienced performers in high definition.'
  },
  {
    id: 'teen',
    name: 'Teen',
    icon: 'emergency',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBE-0RTWMQV-7aa5pGek-uZcH-J6NVY0INtMVyfRl352aCeM1uLLWSiSffe_5UkDXumbA8P3mzZ8nlChpgEnecAWSvWzXNqVF9bdRrgn4ZLRJ0p4JPa9gHP10i8FLpBvywDMR2gwDmptUGPby7rE6kgzi1eMivMfKRgQnn9pVpXkpeoFyMXZ4pY8uuvPTDbXWKvLc4gDcITGq9j9T1u3RoFCipZwkUoxWZl6_xUwgrJW_EK5rGwLAtbqQ',
    description: 'Young adult performers and vibrant, energetic cinematic encounters (18+).'
  },
  {
    id: 'anal',
    name: 'Anal',
    icon: 'settings_input_component',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTSrT7ZfnLWJmVyGjfLgykiPkmf7a4I4Z57uEg4c8C2_mJ0w3Y2UlFj5Gp5iEtMegkDAtFW4BKpVK3JE5pODTLTPETiDTQyukLYcV--2v9vb8b-OEkgHaWihpbbRppVRY0YbgqDfyvtuphn5xrfVZWgyDUKRJA2wZVxWJTWpDmQ6DpzeuUmUe8ySRNKup3oJc5VLYhRtM6nfKRK-UOZLtbi132Yme7AQeLMsUzD79lpUUp9Ckdox0HQQ',
    description: 'High-intensity, premium adult productions and uncensored releases.'
  },
  {
    id: 'lesbian',
    name: 'Lesbian',
    icon: 'female',
    heroImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvVmv9cY2dl_zIEo33CGIwiRDN909BI0EosxDqwew2wWmzQP_fALhg57IyLPUEyXtxxUMdzTRHoU0b9duqmKCxKFHCaeOISv7kzyqQWZSkSvX5nQoG2fSInUivHEMqe740-4kJ8zEnE66XQAAe5y_iKuxl9fyETTTK2S3XuvUPBR8LeBvKRBZ7dWH7xKWCDTBBIS2NHus-SKFoVKwTAg2FwIYbonIdNIJRVcHnX3UV-TD_hHUgC1J6yw',
    description: 'Passionate and aesthetic female-centered romance and encounters.'
  },
  {
    id: 'pov',
    name: 'POV',
    icon: 'visibility',
    heroImage: 'https://lh3.googleusercontent.com/aida/AP1WRLs5y8ft3CThjXzumEpc3azxLY3QKyR8aZ3p0q786H2ndH2rdcjcbpMGVerFh_bCioKAuQRfUOdkx48FNdonP0tx-OxsMFArRHUx9_QMZ2q3VzQfWAIUBUZRvK9VGHJC3MYO8-zKg1JY36tH2BC8gl54Fg4OZqAl6Hu5nnfDFy8rgLjErqdnCiXTkuhA-Z7dKwuX0Z5XdGhS8uBLxIWlygmG82L4DvNTvPVWLxnZMiLdsJspXJESERcqnj4w',
    description: 'Immerse yourself completely. Experience every scene from the most intimate perspective.'
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
  }
];

import curatedDataset from './data/pornhubCurated.json';

export const PERFORMERS: import('./types').Performer[] = [];

export const VIDEOS: Video[] = (curatedDataset as any) || [];

export const INITIAL_VIDEOS = VIDEOS;

export const INITIAL_LANDING_BANNERS: import('./types').LandingBanner[] = [];


