export type Role = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'MODERATOR';

export type UserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';

export type ArticleStatus = 'DRAFT' | 'IN_REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  totpEnabled: boolean;
  lastLoginAt: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  totpEnabled: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface TagWithCount extends Tag {
  articleCount: number;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  categoryId: string | null;
  category?: Category | null;
  tags: { tag: Tag }[];
  authorId: string;
  author?: { id: string; name: string; email: string };
  publisherName: string | null;
  featuredImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isHot: boolean;
  isTrending: boolean;
  isTopFive: boolean;
  isMobileVisible: boolean;
  isBigStory: boolean;
  isTalkOfTheTown: boolean;
  isFeatured: boolean;
  status: ArticleStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  viewCount: number;
  schemaData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// Matches the trimmed `select` in backend ArticlesService.list() - the list
// endpoint intentionally omits body/schemaData/seo fields to keep pages small.
export interface ArticleListItem {
  id: string;
  title: string;
  status: ArticleStatus;
  viewCount: number;
  updatedAt: string;
  category: { id: string; name: string } | null;
}

export interface FlashNewsItem {
  id: string;
  headline: string;
  linkUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface TrendingItem {
  id: string;
  title: string;
  linkUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface UsaMovieScheduleItem {
  id: string;
  title: string;
  linkUrl: string;
  openInNewTab: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface WeeklyTopFiveItem {
  id: string;
  title: string;
  linkUrl: string;
  openInNewTab: boolean;
  isActive: boolean;
  sortOrder: number;
}

export type MovieBoxOfficeSection = 'ALL_TIME' | 'USA_BOX_OFFICE';

export interface MovieBoxOfficeItem {
  id: string;
  section: MovieBoxOfficeSection;
  movieName: string;
  linkUrl: string;
  amount: string;
  openInNewTab: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface DontMissItem {
  id: string;
  title: string;
  linkUrl: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface EpaperImageItem {
  id: string;
  editionDate: string;
  pageNumber: number;
  imageUrl: string;
}

export interface MediaLibraryItem {
  id: string;
  title: string;
  status: ArticleStatus;
  featuredImageUrl: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  actor: { id: string; name: string; email: string } | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
}

export interface ImportWarning {
  legacyPostId: number;
  title: string;
  message: string;
}

export interface ImportPreview {
  totalInFile: number;
  willImport: number;
  duplicatesSkipped: number;
  newCategories: string[];
  warnings: ImportWarning[];
}

export interface ImportResult {
  totalInFile: number;
  created: number;
  duplicatesSkipped: number;
  failed: number;
  warnings: ImportWarning[];
}

export type AdType = 'IMAGE' | 'SCRIPT';

export type AdZone =
  | 'HOMEPAGE_SIDEBAR_LEFT'
  | 'HOMEPAGE_SIDEBAR_RIGHT'
  | 'HOMEPAGE_TOP_BANNER'
  | 'HOMEPAGE_SECTION_INLINE'
  | 'HOMEPAGE_MOBILE_BANNER'
  | 'INNER_SIDEBAR_LEFT'
  | 'INNER_SIDEBAR_RIGHT'
  | 'INNER_TOP_BANNER'
  | 'INNER_MOBILE_BANNER'
  | 'BOXOFFICE_SIDEBAR_LEFT'
  | 'BOXOFFICE_SIDEBAR_RIGHT'
  | 'BOXOFFICE_TOP_BANNER'
  | 'BOXOFFICE_MOBILE_BANNER'
  | 'ROADBLOCK';

export const AD_ZONE_LABELS: Record<AdZone, string> = {
  HOMEPAGE_SIDEBAR_LEFT: 'Homepage - Sidebar Left',
  HOMEPAGE_SIDEBAR_RIGHT: 'Homepage - Sidebar Right',
  HOMEPAGE_TOP_BANNER: 'Homepage - Top Banner',
  HOMEPAGE_SECTION_INLINE: 'Homepage - Section Inline (All Categories)',
  HOMEPAGE_MOBILE_BANNER: 'Homepage - Mobile Banner',
  INNER_SIDEBAR_LEFT: 'Article Page - Sidebar Left',
  INNER_SIDEBAR_RIGHT: 'Article Page - Sidebar Right',
  INNER_TOP_BANNER: 'Article Page - Top Banner',
  INNER_MOBILE_BANNER: 'Article Page - Mobile Banner',
  BOXOFFICE_SIDEBAR_LEFT: 'Box Office - Sidebar Left',
  BOXOFFICE_SIDEBAR_RIGHT: 'Box Office - Sidebar Right',
  BOXOFFICE_TOP_BANNER: 'Box Office - Top Banner',
  BOXOFFICE_MOBILE_BANNER: 'Box Office - Mobile Banner',
  ROADBLOCK: 'Roadblock (Full-page Interstitial)',
};

export const AD_ZONE_DIMENSIONS: Record<AdZone, { width: string; height: string }> = {
  HOMEPAGE_SIDEBAR_LEFT: { width: '160px', height: 'any' },
  HOMEPAGE_SIDEBAR_RIGHT: { width: '160px', height: 'any' },
  HOMEPAGE_TOP_BANNER: { width: '728px or 990px', height: '90px' },
  HOMEPAGE_SECTION_INLINE: { width: '330px', height: '200px' },
  HOMEPAGE_MOBILE_BANNER: { width: '380px', height: '250px' },
  INNER_SIDEBAR_LEFT: { width: '160px', height: 'any' },
  INNER_SIDEBAR_RIGHT: { width: '160px', height: 'any' },
  INNER_TOP_BANNER: { width: '728px', height: '90px' },
  INNER_MOBILE_BANNER: { width: '380px', height: '90px' },
  BOXOFFICE_SIDEBAR_LEFT: { width: '160px', height: 'any' },
  BOXOFFICE_SIDEBAR_RIGHT: { width: '160px', height: 'any' },
  BOXOFFICE_TOP_BANNER: { width: '728px', height: '90px' },
  BOXOFFICE_MOBILE_BANNER: { width: '380px', height: '90px' },
  ROADBLOCK: { width: 'flexible', height: 'flexible' },
};

export interface Advertisement {
  id: string;
  name: string;
  type: AdType;
  imageUrlDesktop: string | null;
  imageUrlMobile: string | null;
  landingUrl: string | null;
  scriptCode: string | null;
  zone: AdZone;
  showOnDesktop: boolean;
  showOnMobile: boolean;
  isRoadblock: boolean;
  roadblockDelayMs: number;
  roadblockCookieTTL: number;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  sortOrder: number;
  createdBy: string;
  createdByUser: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertisementListItem {
  id: string;
  name: string;
  type: AdType;
  zone: AdZone;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  sortOrder: number;
  createdAt: string;
}
