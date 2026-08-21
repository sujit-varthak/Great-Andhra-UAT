/**
 * Vercel Blob -> Cloudflare R2 image backfill.
 *
 * Every image URL already stored in the database points at Vercel Blob
 * (`*.public.blob.vercel-storage.com`). Switching MediaModule's provider to
 * S3Service (see backend/src/media/) only changes where NEW uploads go -
 * every article/ad/etc created before the switch still points at the old
 * Vercel URL. This script downloads each of those images and re-uploads them
 * to R2, then rewrites the DB rows that reference them.
 *
 * Target columns (no separate media/asset table exists in this schema):
 *   Article.featuredImageUrl, Advertisement.imageUrlDesktop,
 *   Advertisement.imageUrlMobile, DontMiss.imageUrl, EpaperImage.imageUrl
 *
 * Usage:
 *   1. Set S3_ENDPOINT/S3_REGION/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY/
 *      S3_PUBLIC_URL_BASE in the environment to your R2 credentials (see
 *      backend/.env.example) and DATABASE_URL to the target Postgres.
 *   2. Run `npm run migrate:images-to-r2 -- --verify` first - read-only, just
 *      reports counts (how many rows per model, how many distinct Vercel
 *      Blob URLs, how many already look migrated). No network upload, no
 *      writes. Review these numbers before doing anything else.
 *   3. Only after reviewing: `npm run migrate:images-to-r2 -- --apply`.
 *   4. Spot-check a handful of migrated articles/ads in a real browser
 *      afterward - this script only confirms the DB rows updated, not that
 *      the images render correctly end-to-end.
 *
 * Per this project's DB-caution rule: never run this against a real database
 * without reviewing --verify's output first, and the --apply run prints a
 * before/after row count for every target column when it finishes.
 */
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const VERCEL_BLOB_HOST_RE = /\.public\.blob\.vercel-storage\.com\//;

type FieldRef = { model: 'article' | 'advertisement' | 'dontMiss' | 'epaperImage'; field: string };

const TARGET_FIELDS: FieldRef[] = [
  { model: 'article', field: 'featuredImageUrl' },
  { model: 'advertisement', field: 'imageUrlDesktop' },
  { model: 'advertisement', field: 'imageUrlMobile' },
  { model: 'dontMiss', field: 'imageUrl' },
  { model: 'epaperImage', field: 'imageUrl' },
];

async function countsByField() {
  const rows: { model: string; field: string; total: number; nonNull: number; vercelBlob: number }[] = [];
  for (const { model, field } of TARGET_FIELDS) {
    const delegate = (prisma as any)[model];
    const total = await delegate.count();
    const nonNull = await delegate.count({ where: { [field]: { not: null } } });
    const all: Array<Record<string, string | null>> = await delegate.findMany({
      where: { [field]: { not: null } },
      select: { [field]: true },
    });
    const vercelBlob = all.filter((r) => {
      const url = r[field];
      return typeof url === 'string' && VERCEL_BLOB_HOST_RE.test(url);
    }).length;
    rows.push({ model, field, total, nonNull, vercelBlob });
  }
  return rows;
}

async function distinctVercelUrls(): Promise<Map<string, FieldRef[]>> {
  const urlToFields = new Map<string, FieldRef[]>();
  for (const ref of TARGET_FIELDS) {
    const delegate = (prisma as any)[ref.model];
    const rows: Array<Record<string, string | null>> = await delegate.findMany({
      where: { [ref.field]: { not: null } },
      select: { [ref.field]: true },
    });
    for (const row of rows) {
      const url = row[ref.field];
      if (typeof url === 'string' && VERCEL_BLOB_HOST_RE.test(url)) {
        const existing = urlToFields.get(url) ?? [];
        if (!existing.includes(ref)) existing.push(ref);
        urlToFields.set(url, existing);
      }
    }
  }
  return urlToFields;
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

async function verify() {
  console.log('--- Row counts per target column ---');
  for (const row of await countsByField()) {
    console.log(
      `${row.model}.${row.field}: ${row.total} rows total, ${row.nonNull} non-null, ${row.vercelBlob} pointing at Vercel Blob`,
    );
  }
  const urls = await distinctVercelUrls();
  console.log(`\n${urls.size} distinct Vercel Blob URL(s) referenced across the columns above.`);
  console.log('No network requests made, no writes made. Re-run with --apply once these numbers look right.');
}

async function apply() {
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

  const before = await countsByField();
  const urls = await distinctVercelUrls();
  console.log(`Migrating ${urls.size} distinct Vercel Blob URL(s) to R2 bucket "${bucket}"...`);

  let migrated = 0;
  let rowsUpdated = 0;
  const failures: { url: string; error: string }[] = [];

  for (const [oldUrl, refs] of urls) {
    try {
      const res = await fetch(oldUrl);
      if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = extFromUrlOrContentType(oldUrl, contentType);
      const key = `migrated/${randomUUID()}.${ext}`;

      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }),
      );
      const newUrl = `${publicBase}/${key}`;

      for (const ref of refs) {
        const delegate = (prisma as any)[ref.model];
        const result = await delegate.updateMany({
          where: { [ref.field]: oldUrl },
          data: { [ref.field]: newUrl },
        });
        rowsUpdated += result.count;
      }

      migrated += 1;
      if (migrated % 25 === 0) console.log(`  ${migrated}/${urls.size} images migrated...`);
    } catch (err) {
      failures.push({ url: oldUrl, error: (err as Error).message });
    }
  }

  console.log(`\nDone: ${migrated}/${urls.size} images migrated, ${rowsUpdated} DB row(s) updated.`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} failure(s) - these rows still point at Vercel Blob, safe to re-run this script to retry them:`);
    for (const f of failures) console.log(`  ${f.url}: ${f.error}`);
  }

  console.log('\n--- Row counts per target column (before -> after) ---');
  const after = await countsByField();
  for (let i = 0; i < before.length; i++) {
    const b = before[i];
    const a = after[i];
    console.log(
      `${a.model}.${a.field}: total ${b.total} -> ${a.total} (should be unchanged), vercelBlob ${b.vercelBlob} -> ${a.vercelBlob}`,
    );
  }
}

async function main() {
  const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--verify') ? 'verify' : null;
  if (!mode) {
    throw new Error('Pass exactly one of --verify (read-only) or --apply (does the migration)');
  }
  if (mode === 'verify') await verify();
  else await apply();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
