-- Three of the four flag-feed indexes added in 20260820120000_add_article_performance_indexes
-- end in "updatedAt", but findBigStoryFeed/findTrendingFeed/findTalkOfTheTownFeed all order by
-- publishedAt desc (only findFeaturedFeed orders by updatedAt desc, and its index is already
-- correct) - so those three couldn't actually satisfy their own ORDER BY via an index scan.
-- Postgres can't change an index's key columns in place, so this drops and recreates them.
--
-- Not CONCURRENTLY, same reasoning as the original migration: prisma migrate deploy wraps
-- this in a transaction, which CONCURRENTLY can't run inside. Brief write-lock on ~19,500
-- rows, acceptable given current traffic.
DROP INDEX IF EXISTS "articles_status_isBigStory_updatedAt_idx";
DROP INDEX IF EXISTS "articles_status_isTrending_updatedAt_idx";
DROP INDEX IF EXISTS "articles_status_isTalkOfTheTown_updatedAt_idx";

CREATE INDEX IF NOT EXISTS "articles_status_isBigStory_publishedAt_idx"
  ON "articles" ("status", "isBigStory", "publishedAt");

CREATE INDEX IF NOT EXISTS "articles_status_isTrending_publishedAt_idx"
  ON "articles" ("status", "isTrending", "publishedAt");

CREATE INDEX IF NOT EXISTS "articles_status_isTalkOfTheTown_publishedAt_idx"
  ON "articles" ("status", "isTalkOfTheTown", "publishedAt");
