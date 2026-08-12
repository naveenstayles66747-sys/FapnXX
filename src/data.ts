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
  }
];

export const PERFORMERS: import('./types').Performer[] = [];

export const VIDEOS: Video[] = [
  {
    id: 'vid-test-user-1',
    title: 'Desi Romance Scene 4K',
    category: 'amateur',
    categoryLabel: 'Amateur',
    tags: ['Amateur', 'HD', 'Featured', 'Desi'],
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
    previewMp4Url: '',
    duration: '05:00',
    quality: 'HD',
    views: '1.2K views',
    viewsCount: 1200,
    likesCount: 340,
    rating: '98%',
    timeAgo: '2 hours ago',
    createdAt: '2026-08-10T12:00:00.000Z',
    performerName: 'User Uploaded',
    performerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
    description: 'Exclusive adult video stream.',
    isNew: true,
    embedUrl: 'https://hornhub.embedseek.com/#9sq8g',
    isEmbed: true,
  }
];

export const INITIAL_VIDEOS = VIDEOS;

export const INITIAL_LANDING_BANNERS: import('./types').LandingBanner[] = [
  {
    id: 'banner-1',
    title: 'Neon Midnight Fantasies',
    subtitle: 'Exclusive 4K Ultra-HD release featuring top international performers in a private penthouse setting.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoYe4d2pIABe86FsPcEzfnsBgshTwLMpB3JldWw6KpYDhCxwmc-ts6JLePq7jRgzo7T0CR6cluXgWh5POzYkOubjPkkPHZyeuo05COHnK577vd4Gv1TWhzqJ5uqE5ImXEd7q6s48cXZKHvI5wTWZYsy1grVbKoFBbzeEJfbZ5Et7B8Ns-muFWNe95tNNSmEI7ZSANX2TFAu6rFz4XlMQ7h3hl-UAHtcUZ0jFC0pDJPQNoEUnGmB1KqBg',
    tag: 'Featured 4K Release',
    targetCategory: 'trending',
    ctaText: 'Watch Now in 4K',
    isActive: true
  },
  {
    id: 'banner-2',
    title: 'Private VIP Encounters',
    subtitle: 'Unfiltered, raw, and intense scenes curated specifically for FapnXX members.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTSrT7ZfnLWJmVyGjfLgykiPkmf7a4I4Z57uEg4c8C2_mJ0w3Y2UlFj5Gp5iEtMegkDAtFW4BKpVK3JE5pODTLTPETiDTQyukLYcV--2v9vb8b-OEkgHaWihpbbRppVRY0YbgqDfyvtuphn5xrfVZWgyDUKRJA2wZVxWJTWpDmQ6DpzeuUmUe8ySRNKup3oJc5VLYhRtM6nfKRK-UOZLtbi132Yme7AQeLMsUzD79lpUUp9Ckdox0HQQ',
    tag: 'Exclusive VIP',
    targetCategory: 'milf',
    ctaText: 'Explore VIP Series',
    isActive: true
  },
  {
    id: 'banner-3',
    title: 'Subtle Illumination & Passion',
    subtitle: 'Experience intimate POV and aesthetic romance shot on high-resolution cinema sensors.',
    bannerImage: 'https://lh3.googleusercontent.com/aida/AP1WRLs5y8ft3CThjXzumEpc3azxLY3QKyR8aZ3p0q786H2ndH2rdcjcbpMGVerFh_bCioKAuQRfUOdkx48FNdonP0tx-OxsMFArRHUx9_QMZ2q3VzQfWAIUBUZRvK9VGHJC3MYO8-zKg1JY36tH2BC8gl54Fg4OZqAl6Hu5nnfDFy8rgLjErqdnCiXTkuhA-Z7dKwuX0Z5XdGhS8uBLxIWlygmG82L4DvNTvPVWLxnZMiLdsJspXJESERcqnj4w',
    tag: 'Trending POV',
    targetCategory: 'pov',
    ctaText: 'Stream Immediately',
    isActive: true
  },
  {
    id: 'banner-4',
    title: 'Velvet Dusk Rendezvous',
    subtitle: 'Sophisticated glamour and dramatic moonlight encounters in 60FPS Ultra HD.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBE-0RTWMQV-7aa5pGek-uZcH-J6NVY0INtMVyfRl352aCeM1uLLWSiSffe_5UkDXumbA8P3mzZ8nlChpgEnecAWSvWzXNqVF9bdRrgn4ZLRJ0p4JPa9gHP10i8FLpBvywDMR2gwDmptUGPby7rE6kgzi1eMivMfKRgQnn9pVpXkpeoFyMXZ4pY8uuvPTDbXWKvLc4gDcITGq9j9T1u3RoFCipZwkUoxWZl6_xUwgrJW_EK5rGwLAtbqQ',
    tag: '4K Ultra-HD',
    targetCategory: 'amateur',
    ctaText: 'Watch Amateur Cut',
    isActive: true
  },
  {
    id: 'banner-5',
    title: 'Midnight Penthouse Encounter',
    subtitle: 'Uncut cinematic releases with immersive surround audio and 60fps streaming.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvVmv9cY2dl_zIEo33CGIwiRDN909BI0EosxDqwew2wWmzQP_fALhg57IyLPUEyXtxxUMdzTRHoU0b9duqmKCxKFHCaeOISv7kzyqQWZSkSvX5nQoG2fSInUivHEMqe740-4kJ8zEnE66XQAAe5y_iKuxl9fyETTTK2S3XuvUPBR8LeBvKRBZ7dWH7xKWCDTBBIS2NHus-SKFoVKwTAg2FwIYbonIdNIJRVcHnX3UV-TD_hHUgC1J6yw',
    tag: '60FPS Cinema',
    targetCategory: 'lesbian',
    ctaText: 'Stream 60FPS',
    isActive: true
  },
  {
    id: 'banner-6',
    title: 'City Lights Encounters',
    subtitle: 'Vibrant urban aesthetic, moody neon lighting, and high-energy intimate encounters.',
    bannerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-OYI524BZ48HOkZ2JX5LYqmyIji7hU1exKz5GYHfhzSmB-U9IkbGli86UCYFTtvOQH6an4ENmj1uvF4sp72yvfkdjfOxj4DabRz53a-5QteTtz51X2hJV59fVqCRf3CrvuQnvsBdSIKtFTJccaSZBw0iKvQmyqLiRjp1PVyDgBCKIjG7Dg9_ImGXxeIWah3swnYZ874JWJFH3yph7U5Z1lVuSuGTNd2F8mgXi84tEP0lIYp8o_MLS4A',
    tag: 'Top Choice',
    targetCategory: 'teen',
    ctaText: 'Discover Highlights',
    isActive: true
  }
];

