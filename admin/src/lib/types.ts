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
