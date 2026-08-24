export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  MODERATOR = 'MODERATOR',
  USER = 'USER',
}

export enum Permission {
  // Video Permissions
  VIDEOS_READ = 'videos.read',
  VIDEOS_CREATE = 'videos.create',
  VIDEOS_UPDATE = 'videos.update',
  VIDEOS_DELETE = 'videos.delete',
  VIDEOS_PUBLISH = 'videos.publish',
  VIDEOS_UNPUBLISH = 'videos.unpublish',
  VIDEOS_ARCHIVE = 'videos.archive',

  // Category Permissions
  CATEGORIES_READ = 'categories.read',
  CATEGORIES_CREATE = 'categories.create',
  CATEGORIES_UPDATE = 'categories.update',
  CATEGORIES_DELETE = 'categories.delete',
  CATEGORIES_REQUEST = 'categories.request',

  // Comment Permissions
  COMMENTS_READ = 'comments.read',
  COMMENTS_CREATE = 'comments.create',
  COMMENTS_DELETE_OWN = 'comments.delete.own',
  COMMENTS_DELETE_ANY = 'comments.delete.any',
  COMMENTS_MODERATE = 'comments.moderate',

  // Report Permissions
  REPORTS_CREATE = 'reports.create',
  REPORTS_READ = 'reports.read',
  REPORTS_RESOLVE = 'reports.resolve',
  REPORTS_ESCALATE = 'reports.escalate',
  REPORTS_REJECT = 'reports.reject',

  // Banner Permissions
  BANNERS_READ = 'banners.read',
  BANNERS_CREATE = 'banners.create',
  BANNERS_UPDATE = 'banners.update',
  BANNERS_DELETE = 'banners.delete',

  // Ad Campaign Permissions
  ADS_READ = 'ads.read',
  ADS_CREATE = 'ads.create',
  ADS_UPDATE = 'ads.update',
  ADS_DELETE = 'ads.delete',

  // User Management
  USERS_READ = 'users.read',
  USERS_UPDATE = 'users.update',
  USERS_SUSPEND = 'users.suspend',
  USERS_DELETE = 'users.delete',

  // Admin & System Permissions
  ADMIN_USERS_MANAGE = 'admin.users.manage',
  ADMIN_ROLES_MANAGE = 'admin.roles.manage',
  ADMIN_SETTINGS_MANAGE = 'admin.settings.manage',
  ADMIN_AUDIT_READ = 'admin.audit.read',
  ADMIN_OVERVIEW_READ = 'admin.overview.read',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),

  [Role.ADMIN]: [
    Permission.VIDEOS_READ,
    Permission.VIDEOS_CREATE,
    Permission.VIDEOS_UPDATE,
    Permission.VIDEOS_DELETE,
    Permission.VIDEOS_PUBLISH,
    Permission.VIDEOS_UNPUBLISH,
    Permission.VIDEOS_ARCHIVE,
    Permission.CATEGORIES_READ,
    Permission.CATEGORIES_CREATE,
    Permission.CATEGORIES_UPDATE,
    Permission.CATEGORIES_DELETE,
    Permission.CATEGORIES_REQUEST,
    Permission.COMMENTS_READ,
    Permission.COMMENTS_CREATE,
    Permission.COMMENTS_DELETE_OWN,
    Permission.COMMENTS_DELETE_ANY,
    Permission.COMMENTS_MODERATE,
    Permission.REPORTS_CREATE,
    Permission.REPORTS_READ,
    Permission.REPORTS_RESOLVE,
    Permission.REPORTS_ESCALATE,
    Permission.REPORTS_REJECT,
    Permission.BANNERS_READ,
    Permission.BANNERS_CREATE,
    Permission.BANNERS_UPDATE,
    Permission.BANNERS_DELETE,
    Permission.ADS_READ,
    Permission.ADS_CREATE,
    Permission.ADS_UPDATE,
    Permission.ADS_DELETE,
    Permission.USERS_READ,
    Permission.USERS_UPDATE,
    Permission.USERS_SUSPEND,
    Permission.ADMIN_AUDIT_READ,
    Permission.ADMIN_OVERVIEW_READ,
    Permission.ADMIN_SETTINGS_MANAGE,
  ],

  [Role.EDITOR]: [
    Permission.VIDEOS_READ,
    Permission.VIDEOS_CREATE,
    Permission.VIDEOS_UPDATE,
    Permission.VIDEOS_PUBLISH,
    Permission.VIDEOS_UNPUBLISH,
    Permission.CATEGORIES_READ,
    Permission.CATEGORIES_REQUEST,
    Permission.BANNERS_READ,
    Permission.BANNERS_UPDATE,
    Permission.COMMENTS_READ,
    Permission.COMMENTS_CREATE,
    Permission.COMMENTS_DELETE_OWN,
    Permission.REPORTS_CREATE,
  ],

  [Role.MODERATOR]: [
    Permission.VIDEOS_READ,
    Permission.VIDEOS_CREATE,
    Permission.VIDEOS_UPDATE,
    Permission.CATEGORIES_READ,
    Permission.COMMENTS_READ,
    Permission.COMMENTS_DELETE_ANY,
    Permission.COMMENTS_MODERATE,
    Permission.REPORTS_READ,
    Permission.REPORTS_RESOLVE,
    Permission.REPORTS_REJECT,
    Permission.REPORTS_ESCALATE,
    Permission.USERS_READ,
    Permission.ADMIN_OVERVIEW_READ,
  ],

  [Role.USER]: [
    Permission.VIDEOS_READ,
    Permission.CATEGORIES_READ,
    Permission.CATEGORIES_REQUEST,
    Permission.COMMENTS_READ,
    Permission.COMMENTS_CREATE,
    Permission.COMMENTS_DELETE_OWN,
    Permission.REPORTS_CREATE,
    Permission.BANNERS_READ,
    Permission.ADS_READ,
  ],
};

export enum VideoStatus {
  DRAFT = 'DRAFT',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  TAKEDOWN = 'takedown',
}

export enum BannerStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
}
