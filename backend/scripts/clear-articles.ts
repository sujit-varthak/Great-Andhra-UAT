/**
 * Clears Article rows (and anything that only exists to reference them -
 * ArticleTag, Rating - both @@relation(onDelete: Cascade) so they go
 * automatically), plus Tag and Category, to prepare for a fresh XML import.
 *
 * Does NOT touch Users, Advertisements, EpaperImage, DontMiss, AuditLog, or
 * any other table.
 *
 * Usage:
 *   npx ts-node scripts/clear-articles.ts --verify   (read-only, prints counts)
 *   npx ts-node scripts/clear-articles.ts --apply    (deletes, in one transaction)
 *
 * Per this project's DB-caution rule: take a backup first, review --verify's
 * output, and only then run --apply.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function counts() {
  const [articles, articleTags, ratings, tags, categories] = await Promise.all([
    prisma.article.count(),
    prisma.articleTag.count(),
    prisma.rating.count(),
    prisma.tag.count(),
    prisma.category.count(),
  ]);
  return { articles, articleTags, ratings, tags, categories };
}

async function verify() {
  const c = await counts();
  console.log('--- Rows that would be deleted ---');
  console.log(`Article:                              ${c.articles}`);
  console.log(`ArticleTag (cascades with Article):    ${c.articleTags}`);
  console.log(`Rating (cascades with Article):        ${c.ratings}`);
  console.log(`Tag:                                  ${c.tags}`);
  console.log(`Category:                             ${c.categories}`);
  console.log('\nNot touched: Users, Advertisements, EpaperImage, DontMiss, AuditLog, everything else.');
  console.log('No writes made. Re-run with --apply once these numbers look right.');
}

async function apply() {
  const before = await counts();
  await prisma.$transaction([
    prisma.article.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.category.deleteMany(),
  ]);
  const after = await counts();
  console.log('--- Before -> After ---');
  console.log(`Article:     ${before.articles} -> ${after.articles}`);
  console.log(`ArticleTag:  ${before.articleTags} -> ${after.articleTags}`);
  console.log(`Rating:      ${before.ratings} -> ${after.ratings}`);
  console.log(`Tag:         ${before.tags} -> ${after.tags}`);
  console.log(`Category:    ${before.categories} -> ${after.categories}`);
}

async function main() {
  const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--verify') ? 'verify' : null;
  if (!mode) throw new Error('Pass exactly one of --verify (read-only) or --apply (deletes rows)');
  if (mode === 'verify') await verify();
  else await apply();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
