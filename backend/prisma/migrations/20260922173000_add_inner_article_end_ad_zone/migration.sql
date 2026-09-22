-- AlterEnum: script-only ad zone after the article body on inner-page.php, replacing the
-- static #vuukle-ad-13 div (see articles.service.ts / schema.prisma AdZone comment).
ALTER TYPE "AdZone" ADD VALUE 'INNER_ARTICLE_END_AD';
