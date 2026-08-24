-- Hand-authored (per this project's DB-caution rule: never run `prisma migrate dev`/`diff`
-- with a real DATABASE_URL as --shadow-database-url). Apply with `prisma migrate deploy`
-- against the real DO Postgres instance.
--
-- Fixes root causes #4/#5 from the 2026-08-20 load audit: homepage flag-feed queries
-- (findBigStoryFeed/findTrendingFeed/findTalkOfTheTownFeed/findFeaturedFeed) and the public
-- article listing had no index matching their actual {status, <filter>} + order-by shape,
-- and search.service.ts computed to_tsvector(...) on every row on every request with no
-- index backing it at all.
--
-- Not CONCURRENTLY: that variant can't run inside a transaction, which is how `prisma
-- migrate deploy` wraps every migration - it would just fail with a Postgres error. Plain
-- CREATE INDEX takes a brief write-lock on the articles table per index (~19,500 rows - a
-- B-tree index here builds near-instantly; the GIN index a few seconds at most), acceptable
-- given this app's current near-zero real traffic. Re-run as CONCURRENTLY by hand via psql
-- instead if applying this at a time with meaningful live write traffic.
CREATE INDEX IF NOT EXISTS "articles_status_isBigStory_updatedAt_idx"
  ON "articles" ("status", "isBigStory", "updatedAt");

CREATE INDEX IF NOT EXISTS "articles_status_isTrending_updatedAt_idx"
  ON "articles" ("status", "isTrending", "updatedAt");

CREATE INDEX IF NOT EXISTS "articles_status_isTalkOfTheTown_updatedAt_idx"
  ON "articles" ("status", "isTalkOfTheTown", "updatedAt");

CREATE INDEX IF NOT EXISTS "articles_status_isFeatured_updatedAt_idx"
  ON "articles" ("status", "isFeatured", "updatedAt");

CREATE INDEX IF NOT EXISTS "articles_status_publishedAt_idx"
  ON "articles" ("status", "publishedAt");

CREATE INDEX IF NOT EXISTS "articles_status_categoryId_publishedAt_idx"
  ON "articles" ("status", "categoryId", "publishedAt");

-- GIN expression index matching search.service.ts's exact WHERE clause
-- (to_tsvector('english', title || ' ' || body) @@ plainto_tsquery(...)) verbatim, so
-- Postgres can use it without any application-code change. Not represented in schema.prisma
-- (Prisma has no expression-index syntax) — this migration file is the only source of truth
-- for it; a future `prisma migrate dev` diff won't flag it as drift since the migration
-- history already accounts for it.
CREATE INDEX IF NOT EXISTS "articles_search_tsvector_idx"
  ON "articles" USING GIN (to_tsvector('english', title || ' ' || body));
