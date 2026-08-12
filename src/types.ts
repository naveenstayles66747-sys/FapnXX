export type CategoryId = string;

export type ScreenId = 'browse' | 'categories' | 'category-detail' | 'performers' | 'video-detail' | 'signin' | 'admin';

export type ContentPreference = 'straight' | 'gay' | 'lesbian';

export interface Video {
  id: string;
  title: string;
  category: CategoryId;
  categoryLabel: string;
  categories?: string[];
  tags: string[];
  models_actors?: string[];
  modelsActors?: string[];
  thumbnail: string;
  thumbnailUrl?: string;
  duration: string;
  quality: '4K' | 'HD' | 'UHD';
  views: string;
  viewsCount?: number;
  createdAt?: string;
  rating?: string;
  timeAgo: string;
  performerName: string;
  performerAvatar?: string;
  description: string;
  orientation?: ContentPreference | 'horizontal' | 'vertical' | 'vr' | string;
  isExclusive?: boolean;
  isNew?: boolean;
  isOriginal?: boolean;
  likesCount?: number;
  embedUrl?: string;
  previewMp4Url?: string;
  previewWebpUrl?: string;
  vttUrl?: string;
  spriteUrl?: string;
  vastAdTagUrl?: string;
  isEmbed?: boolean;
  isSponsored?: boolean;
  adBrandName?: string;
  adLinkUrl?: string;
  trendingScore?: number;
  trendingRank?: number;
  isTakenDown?: boolean;
}

export type ReportReason =
  | 'copyright_dmca'
  | 'inappropriate_content'
  | 'spam_misleading'
  | 'privacy_violation'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed' | 'takedown';

export interface DMCAReport {
  id: string;
  videoId: string;
  videoTitle: string;
  reporterName?: string;
  reporterEmail?: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  createdAt: string;
  clientIp?: string;
}

export interface AdCampaign {
  id: string;
  brandName: string;
  title: string;
  bannerImage: string;
  targetUrl: string;
  cpmRate: string;
  impressions: number;
  clicks: number;
  isActive: boolean;
  position: 'banner_top' | 'card_inline' | 'pre_roll';
}

export interface LandingBanner {
  id: string;
  title: string;
  subtitle: string;
  bannerImage: string;
  tag: string;
  targetCategory?: string;
  targetVideoId?: string;
  ctaText?: string;
  isActive: boolean;
}

export interface Performer {
  id: string;
  name: string;
  avatar: string;
  subscribers: string;
  videosCount: number;
  isFollowing: boolean;
  bio?: string;
  tags?: string[];
}

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  icon: string;
  heroImage: string;
  description: string;
}

export interface UserState {
  isAgeVerified: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  userEmail: string | null;
  savedVideoIds: string[];
  likedVideoIds: string[];
  followingPerformerIds: string[];
}

export interface CategoryRequest {
  id: string;
  categoryName: string;
  videoTitle?: string;
  requestedByEmail?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface VideoComment {
  id: string;
  videoId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
  likesCount: number;
}


