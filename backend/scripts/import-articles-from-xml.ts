/**
 * Fresh bulk import of every post in a WordPress XML export directly into
 * the database - written for the full-corpus re-import that follows
 * clearing every Article/Tag/Category row (see clear-articles.ts).
 *
 * Streams the XML via `sax` (same single-pass approach as
 * fix-images-from-xml.ts) instead of fast-xml-parser's full-DOM parse, which
 * is what OOM-crashes article-import.service.ts on files this size. Never
 * holds more than one item's fields in memory at a time.
 *
 * Every created article:
 *  - has its featured image downloaded from the XML's original WordPress
 *    attachment URL and re-uploaded to R2 (there's no Vercel Blob URL to
 *    migrate here - this is a first-time upload for a brand-new article)
 *  - is flagged isTrending: true unconditionally, per explicit requirement
 *  - is deduped by legacyPostId, so running this again (including against a
 *    different XML file whose posts overlap with one already imported)
 *    never creates duplicates - it just skips posts already present
 *  - gets status PUBLISHED (with publishedAt from the XML's wp:post_date)
 *    if the original WordPress post was published, DRAFT otherwise
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
import { createReadStream } from 'fs';
import * as sax from 'sax';
import slugify from 'slugify';

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

interface ParsedCategory {
  name: string;
  slug: string;
}

interface ParsedPost {
  legacyPostId: number;
  title: string;
  bodyHtml: string;
  status: string;
  postDate: string | null;
  categories: ParsedCategory[];
  tags: ParsedCategory[];
  featuredImageUrl?: string;
}

// Single-pass streaming parse, mirroring fix-images-from-xml.ts's parseXml():
// one walk of the file builds both the attachment-id->url map and the post
// list, since a post's <item> and the attachment <item> its _thumbnail_id
// points at can appear in either order in the file.
function parseXml(filePath: string): Promise<{ posts: ParsedPost[] }> {
  return new Promise((resolve, reject) => {
    const parser = sax.createStream(true, { trim: false });
    const attachmentUrlByPostId = new Map<number, string>();
    const rawPosts: Array<{
      postId: number | null;
      title: string;
      bodyHtml: string;
      status: string;
      postDate: string | null;
      postType: string | null;
      categories: ParsedCategory[];
      tags: ParsedCategory[];
      thumbnailId: number | null;
      attachmentUrl: string | null;
      catDomain: string | undefined;
      catNicename: string | undefined;
    }> = [];

    let inItem = false;
    let currentText = '';
    let current: (typeof rawPosts)[number] | null = null;
    let pendingMetaKey: string | null = null;
    let itemCount = 0;

    parser.on('opentag', (node) => {
      currentText = '';
      if (node.name === 'item') {
        inItem = true;
        current = {
          postId: null,
          title: '',
          bodyHtml: '',
          status: '',
          postDate: null,
          postType: null,
          categories: [],
          tags: [],
          thumbnailId: null,
          attachmentUrl: null,
          catDomain: undefined,
          catNicename: undefined,
        };
      } else if (inItem && current && node.name === 'category') {
        current.catDomain = typeof node.attributes.domain === 'string' ? node.attributes.domain : undefined;
        current.catNicename = typeof node.attributes.nicename === 'string' ? node.attributes.nicename : undefined;
      } else if (inItem && node.name === 'wp:postmeta') {
        pendingMetaKey = null;
      }
    });

    parser.on('text', (text) => {
      currentText += text;
    });
    parser.on('cdata', (text) => {
      currentText += text;
    });

    parser.on('closetag', (name) => {
      if (!inItem || !current) return;
      switch (name) {
        case 'title':
          if (!current.title) current.title = currentText.trim();
          break;
        case 'wp:post_id':
          current.postId = Number(currentText.trim());
          break;
        case 'wp:post_type':
          current.postType = currentText.trim();
          break;
        case 'wp:status':
          current.status = currentText.trim();
          break;
        case 'wp:post_date':
          current.postDate = currentText.trim();
          break;
        case 'content:encoded':
          current.bodyHtml = currentText;
          break;
        case 'wp:attachment_url':
          current.attachmentUrl = currentText.trim();
          break;
        case 'category': {
          const name = currentText.trim();
          if (name) {
            const entry = {
              name,
              slug: current.catNicename || slugify(name, { lower: true, strict: true }),
            };
            if (current.catDomain === 'post_tag') current.tags.push(entry);
            else if (current.catDomain === 'category') current.categories.push(entry);
          }
          current.catDomain = undefined;
          current.catNicename = undefined;
          break;
        }
        case 'wp:meta_key':
          pendingMetaKey = currentText.trim();
          break;
        case 'wp:meta_value':
          if (pendingMetaKey === '_thumbnail_id') {
            const id = Number(currentText.trim());
            if (id) current.thumbnailId = id;
          }
          pendingMetaKey = null;
          break;
        case 'item': {
          itemCount += 1;
          if (current.postType === 'attachment' && current.postId && current.attachmentUrl) {
            attachmentUrlByPostId.set(current.postId, current.attachmentUrl);
          } else if (current.postType === 'post' && current.postId && current.status !== 'trash') {
            rawPosts.push(current);
          }
          current = null;
          inItem = false;
          if (itemCount % 5000 === 0) logMemory(`parsing item ${itemCount}`);
          break;
        }
      }
      currentText = '';
    });

    parser.on('error', (err) => reject(err));
    parser.on('end', () => {
      const posts: ParsedPost[] = rawPosts.map((p) => ({
        legacyPostId: p.postId as number,
        title: p.title || '(untitled)',
        bodyHtml: p.bodyHtml,
        status: p.status,
        postDate: p.postDate,
        categories: p.categories,
        tags: p.tags,
        featuredImageUrl: p.thumbnailId ? attachmentUrlByPostId.get(p.thumbnailId) : undefined,
      }));
      resolve({ posts });
    });

    createReadStream(filePath).pipe(parser as unknown as NodeJS.WritableStream);
  });
}

async function upsertCategory(cat: ParsedCategory) {
  const bySlug = await prisma.category.findUnique({ where: { slug: cat.slug } });
  if (bySlug) return bySlug;
  const byName = await prisma.category.findFirst({ where: { name: { equals: cat.name, mode: 'insensitive' } } });
  if (byName) return byName;
  return prisma.category.create({ data: { name: cat.name, slug: cat.slug } });
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
  const { posts } = await parseXml(xmlPath);
  logMemory('after parse');

  const existingIds = await loadExistingLegacyIds();
  const toImport = posts.filter((p) => !existingIds.has(p.legacyPostId));
  const withImage = toImport.filter((p) => p.featuredImageUrl).length;

  const existingCategories = await prisma.category.findMany({ select: { name: true, slug: true } });
  const existingSlugs = new Set(existingCategories.map((c) => c.slug));
  const existingNamesLower = new Set(existingCategories.map((c) => c.name.toLowerCase()));
  const newCategorySlugs = new Set<string>();
  let multiCategoryCount = 0;
  for (const post of toImport) {
    if (post.categories.length > 1) multiCategoryCount += 1;
    const primary = post.categories[0];
    if (!primary) continue;
    if (!existingSlugs.has(primary.slug) && !existingNamesLower.has(primary.name.toLowerCase())) {
      newCategorySlugs.add(primary.slug);
    }
  }

  console.log(`${posts.length} post(s) in the XML.`);
  console.log(`${posts.length - toImport.length} already imported (matched by legacyPostId) - will be skipped.`);
  console.log(`${toImport.length} will be created.`);
  console.log(`${withImage}/${toImport.length} of those have a resolvable featured image (will be uploaded to R2).`);
  console.log(
    `${newCategorySlugs.size} new categor${newCategorySlugs.size === 1 ? 'y' : 'ies'} will be created${newCategorySlugs.size ? ': ' + [...newCategorySlugs].join(', ') : ''}.`,
  );
  if (multiCategoryCount > 0) {
    console.log(`${multiCategoryCount} post(s) have more than one category - only the first will be used.`);
  }
  console.log('Every created article will be flagged isTrending: true.');
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
  const { posts } = await parseXml(xmlPath);
  logMemory('after parse');

  const existingIds = await loadExistingLegacyIds();
  const toImport = posts.filter((p) => !existingIds.has(p.legacyPostId));
  console.log(`Importing ${toImport.length} post(s) (${posts.length - toImport.length} already present, skipped)...`);

  let created = 0;
  let withImage = 0;
  const failures: { legacyPostId: number; title: string; error: string }[] = [];

  for (let i = 0; i < toImport.length; i += CONCURRENCY) {
    const batch = toImport.slice(i, i + CONCURRENCY);
    const images = await Promise.all(
      batch.map((p) =>
        p.featuredImageUrl ? fetchAndUploadImage(p.featuredImageUrl, client, bucket, publicBase) : Promise.resolve(null),
      ),
    );

    for (let j = 0; j < batch.length; j++) {
      const post = batch[j];
      try {
        const categoryId = post.categories.length ? (await upsertCategory(post.categories[0])).id : null;
        const tagIds = await Promise.all(post.tags.map((t) => upsertTag(t)));
        const slug = await uniqueSlug(post.title);
        const isPublished = post.status === 'publish';
        const parsedDate = post.postDate ? new Date(post.postDate.replace(' ', 'T')) : null;
        const publishedAt = isPublished && parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

        await prisma.article.create({
          data: {
            title: post.title,
            slug,
            body: post.bodyHtml,
            categoryId,
            authorId,
            featuredImageUrl: images[j],
            legacyPostId: post.legacyPostId,
            isTrending: true,
            status: isPublished ? 'PUBLISHED' : 'DRAFT',
            publishedAt,
            tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
          },
        });
        created += 1;
        if (images[j]) withImage += 1;
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

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
