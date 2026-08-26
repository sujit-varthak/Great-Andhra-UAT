/**
 * Re-applies the (now-corrected) category-picking logic from
 * import-articles-from-xml.ts to articles that are ALREADY in the database,
 * matched back to a WordPress export by legacyPostId. Touches only
 * categoryId and isBigStory, and only when the corrected values actually
 * differ from what's there now.
 *
 * Why this exists: pickPrimaryCategory originally took the first non-generic
 * category in a post's list, with no notion of parent/child specificity, and
 * (until the big-story fix) didn't exclude "Big Story" as a UI/flag marker
 * either. A post tagged both "Politics" and its own child "Telangana News"
 * got mapped to plain Politics whenever Politics happened to appear first in
 * the XML - silently mis-categorizing every post like that (confirmed: all
 * 90 Telangana-News-tagged posts in file 9 landed under Politics). And any
 * post carrying the WordPress "Big Story" category got that picked as its
 * permanent URL category instead of its real topic - confirmed live via
 * /{id}/big-story/{slug} URLs. Once the picking logic is fixed, already-
 * imported articles still need a one-time correction - this script does
 * that without re-importing/re-creating them.
 *
 * The isBigStory boolean flag is set to true for every post that carried
 * the WordPress "Big Story" category, regardless of whether its categoryId
 * also needed correcting - that WordPress tag meant "this is a big story",
 * which in this system is the flag, not a real topic category. Never
 * cleared for a post that doesn't carry the tag - only ever set, never
 * unset, by this script.
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
    select: {
      id: true,
      title: true,
      legacyPostId: true,
      isBigStory: true,
      category: { select: { id: true, slug: true } },
    },
  });
  const existingByLegacyId = new Map(existing.map((a) => [a.legacyPostId as number, a]));

  const categoryCache = new Map<string, string>();
  const changes: { title: string; categoryFrom: string; categoryTo: string; categoryChanged: boolean; flagChanged: boolean }[] = [];

  for (const post of posts) {
    const article = existingByLegacyId.get(post.legacyPostId);
    if (!article) continue;

    const primary = pickPrimaryCategory(post.categories);
    const currentSlug = article.category?.slug ?? null;
    const targetSlug = primary?.slug ?? null;
    const categoryChanged = currentSlug !== targetSlug;

    const hasBigStoryTag = post.categories.some((c) => c.slug === 'big-story');
    const flagChanged = hasBigStoryTag && !article.isBigStory;

    if (!categoryChanged && !flagChanged) continue;

    changes.push({
      title: article.title,
      categoryFrom: currentSlug ?? '(none)',
      categoryTo: targetSlug ?? '(none)',
      categoryChanged,
      flagChanged,
    });

    if (apply) {
      const data: { categoryId?: string | null; isBigStory?: boolean } = {};
      if (categoryChanged) {
        data.categoryId = primary
          ? await resolveCategoryChain(prisma, primary.slug, categoryDefs, categoryCache, primary.name)
          : null;
      }
      if (flagChanged) data.isBigStory = true;
      await prisma.article.update({ where: { id: article.id }, data });
    }
  }

  const categoryChanges = changes.filter((c) => c.categoryChanged);
  const flagChanges = changes.filter((c) => c.flagChanged);

  console.log(`${existing.length} article(s) from this file already exist in the database.`);
  console.log(`${categoryChanges.length} of those have a different category than the corrected logic would pick.`);
  const byTarget = new Map<string, number>();
  for (const c of categoryChanges) byTarget.set(c.categoryTo, (byTarget.get(c.categoryTo) ?? 0) + 1);
  for (const [to, count] of byTarget) console.log(`  ${count} -> ${to}`);
  console.log(`${flagChanges.length} of those carry the WordPress "Big Story" category and need isBigStory set to true.`);

  if (!apply) {
    console.log('\nNo writes made. Re-run with --apply once these numbers look right.');
  } else {
    console.log(`\nDone: ${categoryChanges.length} article(s) recategorized, ${flagChanges.length} flagged isBigStory.`);
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
