-- Hand-authored (per this project's DB-caution rule: never run `prisma migrate dev`/`diff`
-- with a real DATABASE_URL as --shadow-database-url). NOT applied by this session — no
-- DATABASE_URL is configured in this worktree. Apply with `prisma migrate deploy` only
-- after explicit confirmation, against the real DO Postgres instance.
--
-- Fixes root causes #4/#5 from the 2026-08-20 load audit: homepage flag-feed queries
-- (findBigStoryFeed/findTrendingFeed/findTalkOfTheTownFeed/findFeaturedFeed) and the public
-- article listing had no index matching their actual {status, <filter>} + order-by shape,
-- and search.service.ts computed to_tsvector(...) on every row on every request with no
-- index backing it at all.

-- CONCURRENTLY avoids locking the articles table for writes while building each index;
-- requires running outside a transaction, which is why this file is safe to hand-apply with
-- `psql` but NOT wrappable in Prisma's normal transactional migrate step without adjustment
-- (see README note this migration should carry: run these statements one at a time).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "articles_status_isBigStory_updatedAt_idx"
  ON "articles" ("status", "isBigStory", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "articles_status_isTrending_updatedAt_idx"
  ON "articles" ("status", "isTrending", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "articles_status_isTalkOfTheTown_updatedAt_idx"
  ON "articles" ("status", "isTalkOfTheTown", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "articles_status_isFeatured_updatedAt_idx"
  ON "articles" ("status", "isFeatured", "updatedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "articles_status_publishedAt_idx"
  ON "articles" ("status", "publishedAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "articles_status_categoryId_publishedAt_idx"
  ON "articles" ("status", "categoryId", "publishedAt");

-- GIN expression index matching search.service.ts's exact WHERE clause
-- (to_tsvector('english', title || ' ' || body) @@ plainto_tsquery(...)) verbatim, so
-- Postgres can use it without any application-code change. Not represented in schema.prisma
-- (Prisma has no expression-index syntax) — this migration file is the only source of truth
-- for it; a future `prisma migrate dev` diff won't flag it as drift since the migration
-- history already accounts for it.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "articles_search_tsvector_idx"
  ON "articles" USING GIN (to_tsvector('english', title || ' ' || body));
