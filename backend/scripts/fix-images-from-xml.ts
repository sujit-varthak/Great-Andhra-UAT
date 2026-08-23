/**
 * Fix already-broken article images by re-fetching them from the ORIGINAL
 * WordPress XML export instead of the now-dead Vercel Blob URLs, uploading
 * to R2.
 *
 * Background: article-import.service.ts skips any post whose legacyPostId
 * already exists in the database, so a plain re-import never touches
 * already-imported articles' images - it only imports genuinely new posts.
 * This script targets exactly the OPPOSITE set: already-existing articles
 * whose current featuredImageUrl still points at Vercel Blob (confirmed
 * returning HTTP 403 for everyone, from every network, as of 2026-08-21 -
 * that store is dead). For each one that also has a matching post in this
 * XML, it re-fetches the image from the XML's original WordPress attachment
 * URL (a completely different host than Vercel Blob) and re-uploads it to
 * R2, then updates that article's row.
 *
 * Usage:
 *   1. Set S3_ENDPOINT/S3_REGION/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY/
 *      S3_PUBLIC_URL_BASE and DATABASE_URL in the environment (same as
 *      migrate-images-to-r2.ts).
 *   2. `npm run fix-images-from-xml -- --file=/path/to/export.xml --verify`
 *      - read-only, no network requests, no writes. Reports how many
 *      already-broken articles this XML can actually fix. Review this
 *      number before doing anything else.
 *   3. Only after reviewing:
 *      `npm run fix-images-from-xml -- --file=/path/to/export.xml --apply`
 *
 * Per this project's DB-caution rule: never run --apply against the real
 * database without reviewing --verify's output first.
 */
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import * as sax from 'sax';

const prisma = new PrismaClient();

const VERCEL_BLOB_HOST_RE = /\.public\.blob\.vercel-storage\.com\//;
// Same values as migrate-images-to-r2.ts - proven to work without stalling
// on a single unresponsive URL (the original bug that stalled that script).
const CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 15_000;

interface XmlImageRef {
  legacyPostId: number;
  originalImageUrl: string;
}

// This has to run reliably on a small (512MB RAM) droplet no matter how
// large the WordPress export is. The original approach - readFileSync() the
// whole file, then fast-xml-parser's full-DOM parse() - loads the entire
// file plus a full in-memory tree (including every article's full HTML
// body, the bulk of a WXR export's size, which this script never even
// needs) and got OOM-killed (exit 137) on a real export.
//
// Fixed with a true streaming (SAX) parser that never buffers article body
// text and never builds a document tree - only the handful of short fields
// this script actually cares about (post_id, post_type, attachment_url,
// postmeta key/value) ever get held in memory, as small string values, not
// the surrounding multi-KB/MB text nodes.
//
// Two passes are used rather than one because a post's <item> and the
// attachment <item> its _thumbnail_id points at can appear in either order
// in the file - a single pass can't guarantee every thumbnail is resolvable
// yet when it's encountered. Each pass is still constant-memory: pass 1
// holds only attachment id->url pairs, pass 2 holds only post id+thumbnailId
// pairs - both small relative to file size regardless of how large the
// export is.

function collectAttachmentUrls(xmlPath: string): Promise<Map<number, string>> {
  return new Promise((resolve, reject) => {
    const attachmentUrlByPostId = new Map<number, string>();
    const parser = sax.createStream(true, { trim: true });

    let inItem = false;
    let leafTag = '';
    let textBuffer = '';
    let postType = '';
    let postId: number | null = null;
    let attachmentUrl: string | null = null;

    parser.on('opentag', (node: sax.Tag) => {
      leafTag = node.name;
      textBuffer = '';
      if (node.name === 'item') {
        inItem = true;
        postType = '';
        postId = null;
        attachmentUrl = null;
      }
    });
    parser.on('text', (text: string) => {
      if (inItem) textBuffer += text;
    });
    parser.on('cdata', (text: string) => {
      if (inItem) textBuffer += text;
    });
    parser.on('closetag', (name: string) => {
      if (inItem && name === leafTag) {
        const value = textBuffer.trim();
        if (name === 'wp:post_type') postType = value;
        else if (name === 'wp:post_id') postId = Number(value);
        else if (name === 'wp:attachment_url') attachmentUrl = value;
      }
      if (name === 'item') {
        if (postType === 'attachment' && postId && attachmentUrl) {
          attachmentUrlByPostId.set(postId, attachmentUrl);
        }
        inItem = false;
      }
    });
    parser.on('error', reject);
    parser.on('end', () => resolve(attachmentUrlByPostId));

    createReadStream(xmlPath).pipe(parser as unknown as NodeJS.WritableStream);
  });
}

interface PostThumbRef {
  legacyPostId: number;
  thumbnailId: number;
}

function collectPostThumbnailRefs(xmlPath: string): Promise<PostThumbRef[]> {
  return new Promise((resolve, reject) => {
    const refs: PostThumbRef[] = [];
    const parser = sax.createStream(true, { trim: true });

    let inItem = false;
    let inPostmeta = false;
    let leafTag = '';
    let textBuffer = '';
    let postType = '';
    let postId: number | null = null;
    let metaKey = '';
    let metaValue = '';
    let thumbnailId: number | null = null;

    parser.on('opentag', (node: sax.Tag) => {
      leafTag = node.name;
      textBuffer = '';
      if (node.name === 'item') {
        inItem = true;
        postType = '';
        postId = null;
        thumbnailId = null;
      } else if (node.name === 'wp:postmeta') {
        inPostmeta = true;
        metaKey = '';
        metaValue = '';
      }
    });
    parser.on('text', (text: string) => {
      if (inItem) textBuffer += text;
    });
    parser.on('cdata', (text: string) => {
      if (inItem) textBuffer += text;
    });
    parser.on('closetag', (name: string) => {
      if (inItem && name === leafTag) {
        const value = textBuffer.trim();
        if (name === 'wp:post_type') postType = value;
        else if (name === 'wp:post_id') postId = Number(value);
        else if (inPostmeta && name === 'wp:meta_key') metaKey = value;
        else if (inPostmeta && name === 'wp:meta_value') metaValue = value;
      }
      if (name === 'wp:postmeta') {
        if (metaKey === '_thumbnail_id' && metaValue) thumbnailId = Number(metaValue);
        inPostmeta = false;
      } else if (name === 'item') {
        if (postType === 'post' && postId && thumbnailId) {
          refs.push({ legacyPostId: postId, thumbnailId });
        }
        inItem = false;
      }
    });
    parser.on('error', reject);
    parser.on('end', () => resolve(refs));

    createReadStream(xmlPath).pipe(parser as unknown as NodeJS.WritableStream);
  });
}

async function parseImageRefs(xmlPath: string): Promise<XmlImageRef[]> {
  const attachmentUrlByPostId = await collectAttachmentUrls(xmlPath);
  const postRefs = await collectPostThumbnailRefs(xmlPath);

  const refs: XmlImageRef[] = [];
  for (const { legacyPostId, thumbnailId } of postRefs) {
    const originalImageUrl = attachmentUrlByPostId.get(thumbnailId);
    if (originalImageUrl) refs.push({ legacyPostId, originalImageUrl });
  }
  return refs;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} to your Cloudflare R2 value before running --apply`);
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

interface BrokenArticle {
  articleId: string;
  legacyPostId: number;
  originalImageUrl: string;
}

async function findBrokenArticles(refs: XmlImageRef[]): Promise<BrokenArticle[]> {
  const legacyIds = refs.map((r) => r.legacyPostId);
  const articles = await prisma.article.findMany({
    where: { legacyPostId: { in: legacyIds } },
    select: { id: true, legacyPostId: true, featuredImageUrl: true },
  });
  const refByLegacyId = new Map(refs.map((r) => [r.legacyPostId, r]));

  const broken: BrokenArticle[] = [];
  for (const a of articles) {
    if (!a.featuredImageUrl || !VERCEL_BLOB_HOST_RE.test(a.featuredImageUrl)) continue;
    if (a.legacyPostId === null) continue;
    const ref = refByLegacyId.get(a.legacyPostId);
    if (!ref) continue;
    broken.push({ articleId: a.id, legacyPostId: a.legacyPostId, originalImageUrl: ref.originalImageUrl });
  }
  return broken;
}

async function verify(xmlPath: string) {
  const refs = await parseImageRefs(xmlPath);
  console.log(`${refs.length} post(s) in the XML have a resolvable featured image.`);
  const broken = await findBrokenArticles(refs);
  console.log(
    `${broken.length} already-existing article(s) currently have a dead Vercel Blob image AND a matching entry in this XML - these are what --apply would fix.`,
  );
  console.log('No network requests made, no writes made. Re-run with --apply once this number looks right.');
}

async function fixOne(
  item: BrokenArticle,
  client: S3Client,
  bucket: string,
  publicBase: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(item.originalImageUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = extFromUrlOrContentType(item.originalImageUrl, contentType);
    const key = `migrated/${randomUUID()}.${ext}`;

    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }),
    );
    const newUrl = `${publicBase}/${key}`;

    await prisma.article.update({ where: { id: item.articleId }, data: { featuredImageUrl: newUrl } });
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'TimeoutError'
        ? `timed out after ${FETCH_TIMEOUT_MS}ms`
        : (err as Error).message;
    return { ok: false, error: message };
  }
}

async function apply(xmlPath: string) {
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

  const refs = await parseImageRefs(xmlPath);
  const broken = await findBrokenArticles(refs);
  console.log(
    `Fixing ${broken.length} article image(s) from the original WordPress URLs in the XML (concurrency ${CONCURRENCY})...`,
  );

  let fixed = 0;
  const failures: { legacyPostId: number; error: string }[] = [];

  for (let i = 0; i < broken.length; i += CONCURRENCY) {
    const batch = broken.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((item) => fixOne(item, client, bucket, publicBase)));
    results.forEach((result, j) => {
      if (result.ok) fixed += 1;
      else failures.push({ legacyPostId: batch[j].legacyPostId, error: result.error });
    });
    console.log(`  ${Math.min(i + CONCURRENCY, broken.length)}/${broken.length} processed (${fixed} fixed so far)...`);
  }

  console.log(`\nDone: ${fixed}/${broken.length} article image(s) fixed.`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} failure(s) - these articles still point at the dead Vercel Blob URL:`);
    for (const f of failures) console.log(`  legacyPostId ${f.legacyPostId}: ${f.error}`);
  }
}

async function main() {
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  if (!fileArg) throw new Error('Pass --file=/path/to/export.xml');
  const xmlPath = fileArg.slice('--file='.length);

  const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--verify') ? 'verify' : null;
  if (!mode) {
    throw new Error('Pass exactly one of --verify (read-only) or --apply (does the fix)');
  }
  if (mode === 'verify') await verify(xmlPath);
  else await apply(xmlPath);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
