import { PrismaClient } from '@prisma/client';
import { CategoryDef } from './xml-category-mapping';

// Resolves (and creates if needed) a category AND its full parent chain, so
// a child category is never created floating without its parent. `seen`
// guards against a circular parent chain in the source data (shouldn't
// happen, but climbing forever on bad data is worse than stopping early).
// Takes a plain PrismaClient-shaped client so it works with both the
// standalone script's `new PrismaClient()` and Nest's injected
// PrismaService (which extends PrismaClient).
export async function resolveCategoryChain(
  prisma: PrismaClient,
  slug: string,
  categoryDefs: Map<string, CategoryDef>,
  cache: Map<string, string>,
  fallbackName: string,
  seen: Set<string> = new Set(),
): Promise<string> {
  const cached = cache.get(slug);
  if (cached) return cached;

  const def = categoryDefs.get(slug);
  const name = def?.name || fallbackName;
  let parentId: string | null = null;
  if (def?.parentSlug && def.parentSlug !== slug && !seen.has(def.parentSlug)) {
    seen.add(slug);
    parentId = await resolveCategoryChain(prisma, def.parentSlug, categoryDefs, cache, def.parentSlug, seen);
  }

  const bySlug = await prisma.category.findUnique({ where: { slug } });
  if (bySlug) {
    cache.set(slug, bySlug.id);
    return bySlug.id;
  }
  const byName = await prisma.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (byName) {
    cache.set(slug, byName.id);
    return byName.id;
  }
  const created = await prisma.category.create({ data: { name, slug, parentId } });
  cache.set(slug, created.id);
  return created.id;
}
