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
  | 'HOMEPAGE_ABOVE_HEADER_BANNER'
  | 'HOMEPAGE_STRIP_BANNER_1'
  | 'HOMEPAGE_STRIP_BANNER_2'
  | 'HOMEPAGE_STRIP_BANNER_3'
  | 'HOMEPAGE_BIG_STORY_BANNER'
  | 'HOMEPAGE_LATEST_NEWS_INLINE_AD'
  | 'HOMEPAGE_OPINION_BANNER'
  | 'HOMEPAGE_ARTICLE_WIDGET_AD'
  | 'HOMEPAGE_MOBILE_AFTER_BIGSTORY_AD'
  | 'HOMEPAGE_MOBILE_BEFORE_LATEST_NEWS_AD'
  | 'HOMEPAGE_MOBILE_LATEST_NEWS_END_AD'
  | 'HOMEPAGE_MOBILE_AFTER_TALK_OF_TOWN_AD'
  | 'HOMEPAGE_MOBILE_AFTER_OPINION_AD'
  | 'HOMEPAGE_MOBILE_BETWEEN_MOVIE_NEWS_GOSSIP_AD'
  | 'HOMEPAGE_MOBILE_AFTER_MOVIE_GOSSIP_AD'
  | 'HOMEPAGE_MOBILE_AFTER_TELANGANA_NEWS_AD'
  | 'HOMEPAGE_MOBILE_AFTER_USA_SCHEDULE_AD'
  | 'HOMEPAGE_MOBILE_AFTER_MOST_POPULAR_AD'
  | 'HOMEPAGE_MOBILE_AFTER_TRENDING_TOPICS_AD'
  | 'HOMEPAGE_AFTER_POLITICS_GOSSIP_AD'
  | 'INNER_SIDEBAR_LEFT'
  | 'INNER_SIDEBAR_RIGHT'
  | 'INNER_TOP_BANNER'
  | 'INNER_MOBILE_BANNER'
  | 'INNER_ARTICLE_BANNER'
  | 'INNER_ARTICLE_MIDCONTENT_AD'
  | 'INNER_SIDEBAR_BOTTOM_AD'
  | 'BOXOFFICE_SIDEBAR_LEFT'
  | 'BOXOFFICE_SIDEBAR_RIGHT'
  | 'BOXOFFICE_TOP_BANNER'
  | 'BOXOFFICE_MOBILE_BANNER'
  | 'BOXOFFICE_STICKY_AD'
  | 'BOXOFFICE_REVIEW_AD'
  | 'LISTPAGE_SIDEBAR_LEFT'
  | 'LISTPAGE_SIDEBAR_RIGHT'
  | 'LISTPAGE_CONTENT_AD'
  | 'LISTPAGE_TOP_BANNER'
  | 'LISTPAGE_MOBILE_BANNER'
  | 'LISTPAGE_MOBILE_MIDDLE_AD'
  | 'ROADBLOCK'
  | 'FULLSCREEN_INTERSTITIAL_AD'
  | 'BOTTOM_STICKY_AD';

// For FULLSCREEN_INTERSTITIAL_AD's TRANSITION trigger mode - which page a visitor is
// leaving/landing on. Mirrors the site's actual routing (see the frontend's .htaccess).
export type GaPageType = 'HOME' | 'ARTICLE' | 'BOXOFFICE' | 'LISTPAGE' | 'ANY';

export const GA_PAGE_TYPE_LABELS: Record<GaPageType, string> = {
  HOME: 'Home Page',
  ARTICLE: 'Article Page',
  BOXOFFICE: 'Box Office',
  LISTPAGE: 'List Page (category/tag)',
  ANY: 'Any Page',
};

export type InterstitialTriggerType = 'TRANSITION' | 'TIMER';

export const AD_ZONE_LABELS: Record<AdZone, string> = {
  HOMEPAGE_SIDEBAR_LEFT: 'Homepage - Sidebar Left',
  HOMEPAGE_SIDEBAR_RIGHT: 'Homepage - Sidebar Right',
  HOMEPAGE_TOP_BANNER: 'Homepage - Top Banner (Desktop)',
  HOMEPAGE_SECTION_INLINE: 'Homepage - Below Talk of Town Ad',
  HOMEPAGE_MOBILE_BANNER: 'Homepage - Main Ad (Between Menu and Big Story Section - mobile)',
  HOMEPAGE_ABOVE_HEADER_BANNER: 'Homepage - Above Header Banner (990px, top of page)',
  HOMEPAGE_STRIP_BANNER_1: 'Homepage - Strip Banner 1 (Above Big Story)',
  HOMEPAGE_STRIP_BANNER_2: 'Homepage - Strip Banner 2 (Above Latest News Tabs)',
  HOMEPAGE_STRIP_BANNER_3: 'Homepage - Strip Banner 3 (Above Talk of the Town Section)',
  HOMEPAGE_BIG_STORY_BANNER: 'Homepage - Below Big Story Section Strip Banner',
  HOMEPAGE_LATEST_NEWS_INLINE_AD: 'Homepage - Latest News Inline Ad (Phone View Only)',
  HOMEPAGE_OPINION_BANNER: 'Homepage - Opinion Section Banner',
  HOMEPAGE_ARTICLE_WIDGET_AD: 'Homepage - Ad Below Top Trending Topics (Above Articles Section, Right Column)',
  HOMEPAGE_MOBILE_AFTER_BIGSTORY_AD: 'Homepage - After Big Story Articles Ad (Mobile)',
  HOMEPAGE_MOBILE_BEFORE_LATEST_NEWS_AD: 'Homepage - Between Big Story and Latest News (Mobile)',
  HOMEPAGE_MOBILE_LATEST_NEWS_END_AD: 'Homepage - End of Latest News List (Mobile)',
  HOMEPAGE_MOBILE_AFTER_TALK_OF_TOWN_AD: 'Homepage - After Talk of the Town (Mobile)',
  HOMEPAGE_MOBILE_AFTER_OPINION_AD: 'Homepage - After Opinion Section (Mobile)',
  HOMEPAGE_MOBILE_BETWEEN_MOVIE_NEWS_GOSSIP_AD: 'Homepage - Between Movie News and Movie Gossip (Mobile)',
  HOMEPAGE_MOBILE_AFTER_MOVIE_GOSSIP_AD: 'Homepage - Between Movie Gossip and Andhra News (Mobile)',
  HOMEPAGE_MOBILE_AFTER_TELANGANA_NEWS_AD: 'Homepage - Between Telangana News and Gossip (Mobile)',
  HOMEPAGE_MOBILE_AFTER_USA_SCHEDULE_AD: 'Homepage - Between USA Movie Schedules and Featured (Mobile, Right Column)',
  HOMEPAGE_MOBILE_AFTER_MOST_POPULAR_AD: 'Homepage - End of Most Popular Section (Mobile, Right Column)',
  HOMEPAGE_MOBILE_AFTER_TRENDING_TOPICS_AD: 'Homepage - After Top Trending Topics (Mobile)',
  HOMEPAGE_AFTER_POLITICS_GOSSIP_AD: 'Homepage - Between Politics Gossip and Reviews (Desktop, replaces Vuukle slot)',
  INNER_SIDEBAR_LEFT: 'Article Page - Sidebar Left',
  INNER_SIDEBAR_RIGHT: 'Article Page - Sidebar Right',
  INNER_TOP_BANNER: 'Article Page - Top Banner (Desktop)',
  INNER_MOBILE_BANNER: 'Article Page - Top Banner (Mobile)',
  INNER_ARTICLE_BANNER: 'Article Page - In-Article Banner (below byline)',
  INNER_ARTICLE_MIDCONTENT_AD: 'Article Page - Mid-Content Ad (within article body)',
  INNER_SIDEBAR_BOTTOM_AD: 'Article Page - Sidebar Bottom Ad',
  BOXOFFICE_SIDEBAR_LEFT: 'Box Office - Sidebar Left',
  BOXOFFICE_SIDEBAR_RIGHT: 'Box Office - Sidebar Right',
  BOXOFFICE_TOP_BANNER: 'Box Office - Top Banner (Desktop)',
  BOXOFFICE_MOBILE_BANNER: 'Box Office - Top Banner (Mobile)',
  BOXOFFICE_STICKY_AD: 'Box Office - Sticky Scroll Ad (stays fixed as user scrolls)',
  BOXOFFICE_REVIEW_AD: 'Box Office - Review Ad',
  LISTPAGE_SIDEBAR_LEFT: 'List Page - Sidebar Left',
  LISTPAGE_SIDEBAR_RIGHT: 'List Page - Sidebar Right',
  LISTPAGE_CONTENT_AD: 'List Page - In-Content Ad (category/tag pages)',
  LISTPAGE_TOP_BANNER: 'List Page - Top Banner (Desktop)',
  LISTPAGE_MOBILE_BANNER: 'List Page - Top Banner (Mobile)',
  LISTPAGE_MOBILE_MIDDLE_AD: 'List Page - Middle of List (Mobile)',
  ROADBLOCK: 'Roadblock (Full-page Interstitial)',
  FULLSCREEN_INTERSTITIAL_AD: 'Full-Screen Interstitial (sitewide overlay)',
  BOTTOM_STICKY_AD: 'Bottom Sticky / Floating Ad (sitewide)',
};

export const AD_ZONE_DIMENSIONS: Record<AdZone, { width: string; height: string }> = {
  HOMEPAGE_SIDEBAR_LEFT: { width: '160px', height: 'any' },
  HOMEPAGE_SIDEBAR_RIGHT: { width: '160px', height: 'any' },
  HOMEPAGE_TOP_BANNER: { width: '728px or 990px', height: '90px' },
  HOMEPAGE_SECTION_INLINE: { width: '330px', height: '200px' },
  HOMEPAGE_MOBILE_BANNER: { width: '380px', height: '250px' },
  HOMEPAGE_ABOVE_HEADER_BANNER: { width: '990px', height: 'any' },
  HOMEPAGE_STRIP_BANNER_1: { width: '330px', height: '40px' },
  HOMEPAGE_STRIP_BANNER_2: { width: '330px', height: '40px' },
  HOMEPAGE_STRIP_BANNER_3: { width: '300px', height: '40px' },
  HOMEPAGE_BIG_STORY_BANNER: { width: '320px', height: 'any' },
  HOMEPAGE_LATEST_NEWS_INLINE_AD: { width: '300px', height: '250px' },
  HOMEPAGE_OPINION_BANNER: { width: '728px', height: '90px' },
  HOMEPAGE_ARTICLE_WIDGET_AD: { width: '300px', height: '250px' },
  // Updated from 380x250 - the actual on-page display is constrained to
  // 330x40, centered (see .sortable-item_clear123 CSS in the frontend repo).
  HOMEPAGE_MOBILE_AFTER_BIGSTORY_AD: { width: '330px', height: '40px' },
  HOMEPAGE_MOBILE_BEFORE_LATEST_NEWS_AD: { width: '300px', height: '250px' },
  HOMEPAGE_MOBILE_LATEST_NEWS_END_AD: { width: '300px', height: '250px' },
  HOMEPAGE_MOBILE_AFTER_TALK_OF_TOWN_AD: { width: '380px', height: '250px' },
  HOMEPAGE_MOBILE_AFTER_OPINION_AD: { width: '380px', height: '250px' },
  // Widened from 330x40 to 300x250 - the .ad-center-mobile-block wrapper has no
  // size cap (unlike .sortable-item_clear123), so a bigger creative fits fine.
  HOMEPAGE_MOBILE_BETWEEN_MOVIE_NEWS_GOSSIP_AD: { width: '300px', height: '250px' },
  HOMEPAGE_MOBILE_AFTER_MOVIE_GOSSIP_AD: { width: '330px', height: '40px' },
  HOMEPAGE_MOBILE_AFTER_TELANGANA_NEWS_AD: { width: '300px', height: '250px' },
  HOMEPAGE_MOBILE_AFTER_USA_SCHEDULE_AD: { width: '320px', height: '40px' },
  HOMEPAGE_MOBILE_AFTER_MOST_POPULAR_AD: { width: '300px', height: '250px' },
  HOMEPAGE_MOBILE_AFTER_TRENDING_TOPICS_AD: { width: '380px', height: '250px' },
  HOMEPAGE_AFTER_POLITICS_GOSSIP_AD: { width: '675px', height: '90px' },
  INNER_SIDEBAR_LEFT: { width: '160px', height: 'any' },
  INNER_SIDEBAR_RIGHT: { width: '160px', height: 'any' },
  INNER_TOP_BANNER: { width: '728px', height: '90px' },
  INNER_MOBILE_BANNER: { width: '380px', height: '90px' },
  INNER_ARTICLE_BANNER: { width: '650px', height: '60px' },
  INNER_ARTICLE_MIDCONTENT_AD: { width: 'full width', height: 'auto' },
  INNER_SIDEBAR_BOTTOM_AD: { width: '300px', height: '250px' },
  BOXOFFICE_SIDEBAR_LEFT: { width: '160px', height: 'any' },
  BOXOFFICE_SIDEBAR_RIGHT: { width: '160px', height: 'any' },
  BOXOFFICE_TOP_BANNER: { width: '728px', height: '90px' },
  BOXOFFICE_MOBILE_BANNER: { width: '380px', height: '90px' },
  BOXOFFICE_STICKY_AD: { width: '300px', height: '250px' },
  BOXOFFICE_REVIEW_AD: { width: '300px', height: '250px' },
  LISTPAGE_SIDEBAR_LEFT: { width: '160px', height: 'any' },
  LISTPAGE_SIDEBAR_RIGHT: { width: '160px', height: 'any' },
  LISTPAGE_CONTENT_AD: { width: '300px', height: '250px' },
  LISTPAGE_TOP_BANNER: { width: '728px', height: '90px' },
  LISTPAGE_MOBILE_BANNER: { width: '380px', height: '90px' },
  LISTPAGE_MOBILE_MIDDLE_AD: { width: '300px', height: '250px' },
  ROADBLOCK: { width: 'flexible', height: 'flexible' },
  FULLSCREEN_INTERSTITIAL_AD: { width: 'up to 500px', height: 'up to 80vh' },
  BOTTOM_STICKY_AD: { width: '336px (desktop) / full-width bar (mobile)', height: '280px (desktop) / ~90px (mobile)' },
};

// Which page each zone belongs to, for the Advertisements page's per-page tabs. A zone
// appears in exactly one tab's dropdown - ROADBLOCK, FULLSCREEN_INTERSTITIAL_AD, and
// BOTTOM_STICKY_AD have no page tab (they're sitewide, managed via "All Ads" + the zone
// dropdown in the New/Edit Advertisement form instead of a per-page tab).
export type AdPage = 'home' | 'inner' | 'boxoffice' | 'listpage';

export const AD_ZONE_PAGE: Record<Exclude<AdZone, 'ROADBLOCK' | 'FULLSCREEN_INTERSTITIAL_AD' | 'BOTTOM_STICKY_AD'>, AdPage> = {
  HOMEPAGE_SIDEBAR_LEFT: 'home',
  HOMEPAGE_SIDEBAR_RIGHT: 'home',
  HOMEPAGE_TOP_BANNER: 'home',
  HOMEPAGE_SECTION_INLINE: 'home',
  HOMEPAGE_MOBILE_BANNER: 'home',
  HOMEPAGE_ABOVE_HEADER_BANNER: 'home',
  HOMEPAGE_STRIP_BANNER_1: 'home',
  HOMEPAGE_STRIP_BANNER_2: 'home',
  HOMEPAGE_STRIP_BANNER_3: 'home',
  HOMEPAGE_BIG_STORY_BANNER: 'home',
  HOMEPAGE_LATEST_NEWS_INLINE_AD: 'home',
  HOMEPAGE_OPINION_BANNER: 'home',
  HOMEPAGE_ARTICLE_WIDGET_AD: 'home',
  HOMEPAGE_MOBILE_AFTER_BIGSTORY_AD: 'home',
  HOMEPAGE_MOBILE_BEFORE_LATEST_NEWS_AD: 'home',
  HOMEPAGE_MOBILE_LATEST_NEWS_END_AD: 'home',
  HOMEPAGE_MOBILE_AFTER_TALK_OF_TOWN_AD: 'home',
  HOMEPAGE_MOBILE_AFTER_OPINION_AD: 'home',
  HOMEPAGE_MOBILE_BETWEEN_MOVIE_NEWS_GOSSIP_AD: 'home',
  HOMEPAGE_MOBILE_AFTER_MOVIE_GOSSIP_AD: 'home',
  HOMEPAGE_MOBILE_AFTER_TELANGANA_NEWS_AD: 'home',
  HOMEPAGE_MOBILE_AFTER_USA_SCHEDULE_AD: 'home',
  HOMEPAGE_MOBILE_AFTER_MOST_POPULAR_AD: 'home',
  HOMEPAGE_MOBILE_AFTER_TRENDING_TOPICS_AD: 'home',
  HOMEPAGE_AFTER_POLITICS_GOSSIP_AD: 'home',
  INNER_SIDEBAR_LEFT: 'inner',
  INNER_SIDEBAR_RIGHT: 'inner',
  INNER_TOP_BANNER: 'inner',
  INNER_MOBILE_BANNER: 'inner',
  INNER_ARTICLE_BANNER: 'inner',
  INNER_ARTICLE_MIDCONTENT_AD: 'inner',
  INNER_SIDEBAR_BOTTOM_AD: 'inner',
  BOXOFFICE_SIDEBAR_LEFT: 'boxoffice',
  BOXOFFICE_SIDEBAR_RIGHT: 'boxoffice',
  BOXOFFICE_TOP_BANNER: 'boxoffice',
  BOXOFFICE_MOBILE_BANNER: 'boxoffice',
  BOXOFFICE_STICKY_AD: 'boxoffice',
  BOXOFFICE_REVIEW_AD: 'boxoffice',
  LISTPAGE_SIDEBAR_LEFT: 'listpage',
  LISTPAGE_SIDEBAR_RIGHT: 'listpage',
  LISTPAGE_CONTENT_AD: 'listpage',
  LISTPAGE_TOP_BANNER: 'listpage',
  LISTPAGE_MOBILE_BANNER: 'listpage',
  LISTPAGE_MOBILE_MIDDLE_AD: 'listpage',
};

export const AD_PAGE_LABELS: Record<AdPage, string> = {
  home: 'Home Page',
  inner: 'Inner Page',
  boxoffice: 'Box Office',
  listpage: 'List Page',
};

// Which device(s) each zone renders on, for the Desktop/Mobile sub-tabs within a page tab.
// 'desktop'/'mobile' = a dedicated zone for that device only (confirmed via the frontend's
// CSS - e.g. sidebars are 'desktop' because mobile-responsive.css hides .local_great/
// .source-image-left/.source-image-right with display:none, and *_MOBILE_BANNER zones are
// 'mobile' because they're rendered inside the mobile-only nav/list markup). 'both' is the
// fallback for zones with no dedicated device counterpart (in-content/inline placements
// that render regardless of device and are just responsively resized) - it appears under
// both sub-tabs rather than risk hiding a zone that hasn't been confirmed device-specific.
// NOTE (2026-08-10): several Homepage zones that were 'both' (their wrapper was only ever
// resized on mobile, never hidden, so the same admin-configured ad silently showed on both
// devices) were deliberately reclassified to 'desktop' and the frontend's ga_render_ad()
// calls for them were gated with `if (!ga_is_mobile())` - see index.php. They now render
// nothing on mobile until/unless a dedicated mobile zone is built for that slot, same as
// was just done for HOMEPAGE_BIG_STORY_BANNER -> HOMEPAGE_MOBILE_AFTER_BIGSTORY_AD.
export type AdDevice = 'desktop' | 'mobile' | 'both';

export const AD_ZONE_DEVICE: Record<Exclude<AdZone, 'ROADBLOCK' | 'FULLSCREEN_INTERSTITIAL_AD' | 'BOTTOM_STICKY_AD'>, AdDevice> = {
  HOMEPAGE_SIDEBAR_LEFT: 'desktop',
  HOMEPAGE_SIDEBAR_RIGHT: 'desktop',
  HOMEPAGE_TOP_BANNER: 'desktop',
  HOMEPAGE_SECTION_INLINE: 'desktop',
  HOMEPAGE_MOBILE_BANNER: 'mobile',
  HOMEPAGE_ABOVE_HEADER_BANNER: 'desktop',
  HOMEPAGE_STRIP_BANNER_1: 'desktop',
  HOMEPAGE_STRIP_BANNER_2: 'desktop',
  HOMEPAGE_STRIP_BANNER_3: 'desktop',
  HOMEPAGE_BIG_STORY_BANNER: 'desktop',
  HOMEPAGE_LATEST_NEWS_INLINE_AD: 'mobile',
  HOMEPAGE_OPINION_BANNER: 'desktop',
  HOMEPAGE_ARTICLE_WIDGET_AD: 'desktop',
  HOMEPAGE_MOBILE_AFTER_BIGSTORY_AD: 'mobile',
  HOMEPAGE_MOBILE_BEFORE_LATEST_NEWS_AD: 'mobile',
  HOMEPAGE_MOBILE_LATEST_NEWS_END_AD: 'mobile',
  HOMEPAGE_MOBILE_AFTER_TALK_OF_TOWN_AD: 'mobile',
  HOMEPAGE_MOBILE_AFTER_OPINION_AD: 'mobile',
  HOMEPAGE_MOBILE_BETWEEN_MOVIE_NEWS_GOSSIP_AD: 'mobile',
  HOMEPAGE_MOBILE_AFTER_MOVIE_GOSSIP_AD: 'mobile',
  HOMEPAGE_MOBILE_AFTER_TELANGANA_NEWS_AD: 'mobile',
  HOMEPAGE_MOBILE_AFTER_USA_SCHEDULE_AD: 'mobile',
  HOMEPAGE_MOBILE_AFTER_MOST_POPULAR_AD: 'mobile',
  HOMEPAGE_MOBILE_AFTER_TRENDING_TOPICS_AD: 'mobile',
  HOMEPAGE_AFTER_POLITICS_GOSSIP_AD: 'desktop',
  INNER_SIDEBAR_LEFT: 'desktop',
  INNER_SIDEBAR_RIGHT: 'desktop',
  INNER_TOP_BANNER: 'desktop',
  INNER_MOBILE_BANNER: 'mobile',
  INNER_ARTICLE_BANNER: 'both',
  INNER_ARTICLE_MIDCONTENT_AD: 'both',
  INNER_SIDEBAR_BOTTOM_AD: 'both',
  BOXOFFICE_SIDEBAR_LEFT: 'desktop',
  BOXOFFICE_SIDEBAR_RIGHT: 'desktop',
  BOXOFFICE_TOP_BANNER: 'desktop',
  BOXOFFICE_MOBILE_BANNER: 'mobile',
  BOXOFFICE_STICKY_AD: 'both',
  BOXOFFICE_REVIEW_AD: 'both',
  LISTPAGE_SIDEBAR_LEFT: 'desktop',
  LISTPAGE_SIDEBAR_RIGHT: 'desktop',
  LISTPAGE_CONTENT_AD: 'both',
  LISTPAGE_TOP_BANNER: 'desktop',
  LISTPAGE_MOBILE_BANNER: 'mobile',
  LISTPAGE_MOBILE_MIDDLE_AD: 'mobile',
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
  interstitialTriggerType: InterstitialTriggerType | null;
  interstitialFromPage: GaPageType | null;
  interstitialToPage: GaPageType | null;
  interstitialTimerSeconds: number | null;
  interstitialFrequencyHours: number | null;
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
