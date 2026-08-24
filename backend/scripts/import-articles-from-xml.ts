/**
 * Fresh bulk import of every post in a WordPress XML export directly into
 * the database - written for the full-corpus re-import that follows
 * clearing every Article/Tag/Category row (see clear-articles.ts).
 *
 * Parsing and category-mapping logic live in src/articles/import/ and are
 * shared with the admin's live XML importer (article-import.service.ts) -
 * this script is the droplet-run path for large one-off batch jobs, but
 * both paths must categorize a post identically. See
 * src/articles/import/xml-stream-parser.ts and xml-category-mapping.ts.
 *
 * Every created article:
 *  - has its featured image downloaded from the XML's original WordPress
 *    attachment URL and re-uploaded to R2 (there's no Vercel Blob URL to
 *    migrate here - this is a first-time upload for a brand-new article)
 *  - is flagged isTrending: true unconditionally, per explicit requirement
 *  - is flagged isFeatured: true when it has a real featured image
 *  - is deduped by legacyPostId, so running this again (including against a
 *    different XML file whose posts overlap with one already imported)
 *    never creates duplicates - it just skips posts already present
 *  - gets status PUBLISHED (with publishedAt from the XML's wp:post_date)
 *    if the original WordPress post was published, DRAFT otherwise
 *  - gets its category resolved through the curated parent/child hierarchy
 *    (see KNOWN_CATEGORIES in xml-category-mapping.ts)
 *
 * Usage:
 *   npx ts-node scripts/import-articles-from-xml.ts --file=/path/to/export.xml --verify
 *   npx ts-node scripts/import-articles-from-xml.ts --file=/path/to/export.xml --author=<userId> --apply
 *
 * Per this project's DB-caution rule: review --verify's output before
 * running --apply, on every file.
 */
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import slugify from 'slugify';
import { parseXml, ParsedPost } from '../src/articles/import/xml-stream-parser';
import { pickPrimaryCategory, ParsedCategory, CategoryDef } from '../src/articles/import/xml-category-mapping';
import { resolveCategoryChain } from '../src/articles/import/category-resolver';

export { parseXml, pickPrimaryCategory, resolveCategoryChain };

const prisma = new PrismaClient();

// Same values as fix-images-from-xml.ts / migrate-images-to-r2.ts - proven to
// work without stalling on a slow/unresponsive source image.
const CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 15_000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before running --apply`);
  return value;
}

function extFromUrlOrContentType(url: string, contentType: string): string {
  const fromUrl = url.split('?')[0].split('.').pop();
  if (fromUrl && fromUrl.length <= 5 && /^[a-z0-9]+$/i.test(fromUrl)) return fromUrl.toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[contentType] ?? 'bin';
}

function logMemory(label: string) {
  const m = process.memoryUsage();
  const mb = (n: number) => Math.round(n / 1024 / 1024);
  console.log(`  [memory@${label}] rss=${mb(m.rss)}MB heapUsed=${mb(m.heapUsed)}MB external=${mb(m.external)}MB`);
}

// Walks a category's ancestor chain purely from the parsed definitions (no
// DB access) - used by verify() to preview what would be created.
function ancestorChain(slug: string, categoryDefs: Map<string, CategoryDef>): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current: string | undefined = slug;
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = categoryDefs.get(current)?.parentSlug ?? undefined;
  }
  return chain;
}

async function upsertTag(tag: ParsedCategory): Promise<string> {
  const bySlug = await prisma.tag.findUnique({ where: { slug: tag.slug } });
  if (bySlug) return bySlug.id;
  const byName = await prisma.tag.findFirst({ where: { name: { equals: tag.name, mode: 'insensitive' } } });
  if (byName) return byName.id;
  const created = await prisma.tag.create({ data: { name: tag.name, slug: tag.slug } });
  return created.id;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true }) || 'post';
  let slug = base;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${suffix++}`;
  }
}

async function fetchAndUploadImage(
  url: string,
  client: S3Client,
  bucket: string,
  publicBase: string,
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = extFromUrlOrContentType(url, contentType);
    const key = `imported/${randomUUID()}.${ext}`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
    return `${publicBase}/${key}`;
  } catch {
    return null;
  }
}

async function loadExistingLegacyIds(): Promise<Set<number>> {
  const rows = await prisma.article.findMany({
    where: { legacyPostId: { not: null } },
    select: { legacyPostId: true },
  });
  return new Set(rows.map((r) => r.legacyPostId as number));
}

async function verify(xmlPath: string) {
  logMemory('before parse');
  const { posts, categoryDefs } = await parseXml(xmlPath);
  logMemory('after parse');

  const existingIds = await loadExistingLegacyIds();
  const toImport = posts.filter((p) => !existingIds.has(p.legacyPostId));
  const withImage = toImport.filter((p) => p.featuredImageUrl).length;

  const existingCategories = await prisma.category.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existingCategories.map((c) => c.slug));

  const neededSlugs = new Set<string>();
  let multiCategoryCount = 0;
  let noCategoryCount = 0;
  for (const post of toImport) {
    if (post.categories.length > 1) multiCategoryCount += 1;
    if (post.categories.length === 0) noCategoryCount += 1;
    const primary = pickPrimaryCategory(post.categories);
    if (!primary) continue;
    for (const slug of ancestorChain(primary.slug, categoryDefs)) neededSlugs.add(slug);
  }
  const newSlugs = [...neededSlugs].filter((s) => !existingSlugs.has(s));
  const describe = (slug: string) => {
    const parent = categoryDefs.get(slug)?.parentSlug;
    return parent ? `${slug} (child of ${parent})` : slug;
  };

  console.log(`${posts.length} post(s) in the XML.`);
  console.log(`${posts.length - toImport.length} already imported (matched by legacyPostId) - will be skipped.`);
  console.log(`${toImport.length} will be created.`);
  console.log(`${withImage}/${toImport.length} of those have a resolvable featured image (will be uploaded to R2 and flagged isFeatured).`);
  console.log(
    `${newSlugs.length} new categor${newSlugs.length === 1 ? 'y' : 'ies'} will be created (including any parent categories)${newSlugs.length ? ':\n  ' + newSlugs.map(describe).join('\n  ') : '.'}`,
  );
  if (multiCategoryCount > 0) {
    console.log(`${multiCategoryCount} post(s) have more than one category - the most specific non-generic one will be used.`);
  }
  if (noCategoryCount > 0) {
    console.log(`${noCategoryCount} post(s) have no category at all - will be created uncategorized.`);
  }
  console.log(`All ${toImport.length} will be flagged isTrending: true (newly-imported content defaults to trending).`);
  console.log('\nNo network requests made, no writes made. Re-run with --apply once these numbers look right.');
}

async function apply(xmlPath: string, authorId: string) {
  const bucket = requireEnv('S3_BUCKET');
  const publicBase = requireEnv('S3_PUBLIC_URL_BASE');
  const client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: requireEnv('S3_ENDPOINT'),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY'),
      secretAccessKey: requireEnv('S3_SECRET_KEY'),
    },
  });

  logMemory('before parse');
  const { posts, categoryDefs } = await parseXml(xmlPath);
  logMemory('after parse');

  const existingIds = await loadExistingLegacyIds();
  const toImport = posts.filter((p) => !existingIds.has(p.legacyPostId));
  console.log(`Importing ${toImport.length} post(s) (${posts.length - toImport.length} already present, skipped)...`);

  const categoryCache = new Map<string, string>();
  let created = 0;
  let withImage = 0;
  const failures: { legacyPostId: number; title: string; error: string }[] = [];

  for (let i = 0; i < toImport.length; i += CONCURRENCY) {
    const batch = toImport.slice(i, i + CONCURRENCY);
    const images = await Promise.all(
      batch.map((p: ParsedPost) =>
        p.featuredImageUrl ? fetchAndUploadImage(p.featuredImageUrl, client, bucket, publicBase) : Promise.resolve(null),
      ),
    );

    for (let j = 0; j < batch.length; j++) {
      const post = batch[j];
      try {
        const primary = pickPrimaryCategory(post.categories);
        const categoryId = primary
          ? await resolveCategoryChain(prisma, primary.slug, categoryDefs, categoryCache, primary.name)
          : null;
        const tagIds = await Promise.all(post.tags.map((t) => upsertTag(t)));
        const slug = await uniqueSlug(post.title);
        const isPublished = post.status === 'publish';
        const parsedDate = post.postDate ? new Date(post.postDate.replace(' ', 'T')) : null;
        const publishedAt = isPublished && parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
        const featuredImageUrl = images[j];

        await prisma.article.create({
          data: {
            title: post.title,
            slug,
            body: post.bodyHtml,
            categoryId,
            authorId,
            featuredImageUrl,
            legacyPostId: post.legacyPostId,
            isTrending: true,
            isFeatured: Boolean(featuredImageUrl),
            status: isPublished ? 'PUBLISHED' : 'DRAFT',
            publishedAt,
            tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
          },
        });
        created += 1;
        if (featuredImageUrl) withImage += 1;
      } catch (err) {
        failures.push({
          legacyPostId: post.legacyPostId,
          title: post.title,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    console.log(`  ${Math.min(i + CONCURRENCY, toImport.length)}/${toImport.length} processed (${created} created, ${withImage} with image)...`);
  }

  console.log(`\nDone: ${created}/${toImport.length} article(s) created, ${withImage} with a featured image hosted on R2.`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures) console.log(`  [${f.legacyPostId}] ${f.title}: ${f.error}`);
  }
}

async function main() {
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  if (!fileArg) throw new Error('Pass --file=/path/to/export.xml');
  const xmlPath = fileArg.slice('--file='.length);

  const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--verify') ? 'verify' : null;
  if (!mode) throw new Error('Pass exactly one of --verify (read-only) or --apply (creates articles)');

  if (mode === 'verify') {
    await verify(xmlPath);
  } else {
    const authorArg = process.argv.find((a) => a.startsWith('--author='));
    if (!authorArg) throw new Error('Pass --author=<userId> to attribute imported articles to');
    await apply(xmlPath, authorArg.slice('--author='.length));
  }
}

// Guarded so recategorize-existing.ts (and any future script) can import
// this module's functions without triggering a second CLI run.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
