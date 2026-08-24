/**
 * Re-applies the (now-corrected) category-picking logic from
 * import-articles-from-xml.ts to articles that are ALREADY in the database,
 * matched back to a WordPress export by legacyPostId. Does not create or
 * touch anything else about the article - only categoryId, and only when
 * the corrected pick actually differs from what's there now.
 *
 * Why this exists: pickPrimaryCategory originally took the first non-generic
 * category in a post's list, with no notion of parent/child specificity. A
 * post tagged both "Politics" and its own child "Telangana News" got mapped
 * to plain Politics whenever Politics happened to appear first in the XML -
 * silently mis-categorizing every post like that (confirmed: all 90
 * Telangana-News-tagged posts in file 9 landed under Politics). Once fixed,
 * already-imported articles from that mapping still need a one-time
 * correction - this script does that without re-importing/re-creating them.
 *
 * Usage:
 *   npx ts-node scripts/recategorize-existing.ts --file=/path/to/export.xml --verify
 *   npx ts-node scripts/recategorize-existing.ts --file=/path/to/export.xml --apply
 */
import { PrismaClient } from '@prisma/client';
import { parseXml, pickPrimaryCategory, resolveCategoryChain } from './import-articles-from-xml';

const prisma = new PrismaClient();

async function run(xmlPath: string, apply: boolean) {
  const { posts, categoryDefs } = await parseXml(xmlPath);

  const legacyIds = posts.map((p) => p.legacyPostId);
  const existing = await prisma.article.findMany({
    where: { legacyPostId: { in: legacyIds } },
    select: { id: true, title: true, legacyPostId: true, category: { select: { id: true, slug: true } } },
  });
  const existingByLegacyId = new Map(existing.map((a) => [a.legacyPostId as number, a]));

  const categoryCache = new Map<string, string>();
  const mismatches: { title: string; from: string; to: string }[] = [];

  for (const post of posts) {
    const article = existingByLegacyId.get(post.legacyPostId);
    if (!article) continue;

    const primary = pickPrimaryCategory(post.categories);
    const currentSlug = article.category?.slug ?? null;
    if (currentSlug === (primary?.slug ?? null)) continue;

    mismatches.push({ title: article.title, from: currentSlug ?? '(none)', to: primary?.slug ?? '(none)' });

    if (apply) {
      const categoryId = primary
        ? await resolveCategoryChain(primary.slug, categoryDefs, categoryCache, primary.name)
        : null;
      await prisma.article.update({ where: { id: article.id }, data: { categoryId } });
    }
  }

  console.log(`${existing.length} article(s) from this file already exist in the database.`);
  console.log(`${mismatches.length} of those have a different category than the corrected logic would pick.`);
  const byTarget = new Map<string, number>();
  for (const m of mismatches) byTarget.set(m.to, (byTarget.get(m.to) ?? 0) + 1);
  for (const [to, count] of byTarget) console.log(`  ${count} -> ${to}`);

  if (!apply) {
    console.log('\nNo writes made. Re-run with --apply once these numbers look right.');
  } else {
    console.log(`\nDone: ${mismatches.length} article(s) recategorized.`);
  }
}

async function main() {
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  if (!fileArg) throw new Error('Pass --file=/path/to/export.xml');
  const xmlPath = fileArg.slice('--file='.length);

  const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--verify') ? 'verify' : null;
  if (!mode) throw new Error('Pass exactly one of --verify (read-only) or --apply (updates categories)');

  await run(xmlPath, mode === 'apply');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
