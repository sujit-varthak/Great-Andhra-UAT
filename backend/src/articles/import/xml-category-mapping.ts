/**
 * Category-mapping rules shared by the admin's live XML importer
 * (article-import.service.ts) and the standalone bulk-import script
 * (backend/scripts/import-articles-from-xml.ts), so both paths categorize
 * a post identically - one is the self-service UI path, the other is for
 * large one-off batch jobs run from a droplet, but the mapping logic must
 * never diverge between them.
 */

export interface ParsedCategory {
  name: string;
  slug: string;
}

// The channel-level taxonomy definition for one category - <wp:category
// nicename="movie-news">, with its <wp:category_parent> (empty for a
// top-level category). Distinct from the per-post <category domain="..."
// nicename="..."> tags, which only say "this post has this category" with
// no hierarchy information.
export interface CategoryDef {
  name: string;
  parentSlug: string | null;
}

// Most WordPress exports carry multiple categories per post (an
// auto-assigned catch-all like "Uncategorized"/"Articles"/"Movies" alongside
// whatever real category was assigned). Picking whichever category happens
// to come first would often land an article in a generic bucket instead of
// its actual topic, so prefer the first non-generic category.
export const GENERIC_CATEGORY_SLUGS = new Set(['uncategorized', 'articles', 'movies']);

// These are homepage-feed/UI markers in the source site, not real topics -
// "Latest News" (WordPress nicename "lastest-news", a typo baked into the
// export itself - matching "latest-news" too in case a differently-exported
// file spells it correctly) and "Talk Of The Town", which in THIS system is
// the isTalkOfTheTown boolean flag, not a Category row. A post carrying
// either should never have it picked as its actual assigned category - skip
// past it to whatever real topic category the post also has.
export const LATEST_NEWS_SLUGS = new Set(['lastest-news', 'latest-news', 'talk-of-the-town']);

// Some categories only exist in a given WordPress export as a near-duplicate
// of a real, already-curated category (different slug, same topic) -
// confirmed by hand after reviewing what showed up outside the curated set.
// Not a generic heuristic - each entry here was a specific reviewed
// decision, not something to guess at for new slugs automatically.
export const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  'movies-gossip': 'movie-gossip',
};

// The real parent/child structure and canonical names, hand-curated by
// admins in the live panel over 2026-07-22 through 2026-07-30 (extracted
// from a database snapshot taken before an unrelated cleanup script reset
// the categories table - see project memory). WordPress exports do not
// reliably carry this hierarchy (most of this project's export files have
// zero <wp:category> definition blocks at all), so this is the actual
// source of truth for it, not something derived from any one XML file.
// A category slug not listed here is created flat, same as before.
export const KNOWN_CATEGORIES: Record<string, CategoryDef> = {
  politics: { name: 'Politics', parentSlug: null },
  movies: { name: 'Movies', parentSlug: null },
  sports: { name: 'Sports', parentSlug: null },
  business: { name: 'Business', parentSlug: null },
  technology: { name: 'Technology', parentSlug: null },
  articles: { name: 'Articles', parentSlug: null },
  'special-news': { name: 'Special News', parentSlug: null },
  audio: { name: 'Audio', parentSlug: null },
  'box-office': { name: 'Box Office', parentSlug: null },
  'political-news': { name: 'Political News', parentSlug: null },
  interviews: { name: 'Interviews', parentSlug: null },
  'about-us': { name: 'About Us', parentSlug: null },
  uncategorized: { name: 'Uncategorized', parentSlug: null },
  'big-story': { name: 'Big Story', parentSlug: null },
  'latest-news': { name: 'Latest News', parentSlug: null },
  'movie-news': { name: 'Movie-news', parentSlug: 'movies' },
  opinion: { name: 'Opinion', parentSlug: 'politics' },
  'movie-gossip': { name: 'movie-gossip', parentSlug: 'movies' },
  'andhra-news': { name: 'andhra-news', parentSlug: 'politics' },
  reviews: { name: 'reviews', parentSlug: 'movies' },
  'special-articles': { name: 'Special Articles', parentSlug: 'articles' },
  'telangana-news': { name: 'Telangana News', parentSlug: 'politics' },
  gossip: { name: 'Gossip', parentSlug: 'politics' },
};

// Picks which of a post's categories becomes its actual assigned category.
// Excludes UI-marker categories entirely, then prefers a more specific
// (child) category over its own parent when a post is tagged with both -
// e.g. "Politics" + "Telangana News" should use Telangana News, not lose it
// to whichever happened to come first in the XML's arbitrary per-post
// category order. Without this, every post that also carries its category's
// parent gets mapped to the broader parent instead.
export function pickPrimaryCategory(categories: ParsedCategory[]): ParsedCategory | undefined {
  const candidates = categories.filter((c) => !LATEST_NEWS_SLUGS.has(c.slug));
  if (candidates.length === 0) return undefined;

  const normalized = candidates.map((c) => {
    const aliasedSlug = CATEGORY_SLUG_ALIASES[c.slug];
    return aliasedSlug ? { name: KNOWN_CATEGORIES[aliasedSlug]?.name ?? aliasedSlug, slug: aliasedSlug } : c;
  });

  const specific = normalized.filter((c) => {
    const hasChildAlsoPresent = normalized.some(
      (other) => other.slug !== c.slug && KNOWN_CATEGORIES[other.slug]?.parentSlug === c.slug,
    );
    return !hasChildAlsoPresent;
  });
  const pool = specific.length > 0 ? specific : normalized;

  return pool.find((c) => !GENERIC_CATEGORY_SLUGS.has(c.slug)) ?? pool[0];
}
