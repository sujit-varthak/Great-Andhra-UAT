/**
 * Legacy MySQL → GreatAndhra CMS (PostgreSQL) migration.
 *
 * This is a runnable TEMPLATE, not a tested migration — no recovered MySQL
 * dump was available when this repo was built (proposal §4 describes the
 * schema from a structural review, not a live database this script could be
 * developed against). Column names below are the ones named in the proposal;
 * confirm them against the actual `SHOW CREATE TABLE` output once the client
 * hands over the real backup, and adjust the `SELECT` statements accordingly.
 *
 * Usage:
 *   1. Restore the recovered MySQL dump to a scratch/staging MySQL instance.
 *   2. Set LEGACY_MYSQL_URL (mysql://user:pass@host:3306/dbname) and
 *      DATABASE_URL (the new Postgres) in the environment.
 *   3. Run against staging first: `npm run migrate:legacy --workspace backend`
 *   4. Have the editorial team verify the staging result before ever
 *      pointing this at a database the live site depends on.
 *
 * Per proposal §3.3/§4: legacy `chkum` credentials are never imported. Every
 * migrated user is created with a fresh invite token and must set a new
 * password and enroll 2FA before they can log in.
 */
import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function main() {
  const legacyUrl = process.env.LEGACY_MYSQL_URL;
  if (!legacyUrl) {
    throw new Error('Set LEGACY_MYSQL_URL to the recovered MySQL backup connection string');
  }

  const legacy = await mysql.createConnection(legacyUrl);
  console.log('Connected to legacy MySQL database.');

  // --- chkum -> users (no legacy passwords are ever imported) ---
  const [legacyUsers] = await legacy.query<any[]>(
    'SELECT id, username, email, role FROM chkum', // TODO: confirm actual column names
  );
  const userIdMap = new Map<string | number, string>();
  for (const row of legacyUsers as any[]) {
    const email = row.email || `${row.username}@greatandhra.com`;
    const inviteToken = randomBytes(32).toString('hex');
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: row.username || email,
        role: 'EDITOR',
        status: 'INVITED',
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    userIdMap.set(row.id, user.id);
  }
  console.log(`Migrated ${userIdMap.size} legacy admin accounts (invite-only, no password reuse).`);

  // --- newscategory -> categories (hierarchy preserved) ---
  const [legacyCategories] = await legacy.query<any[]>(
    'SELECT id, name, parent_id FROM newscategory', // TODO: confirm actual column names
  );
  const categoryIdMap = new Map<string | number, string>();
  for (const row of legacyCategories as any[]) {
    const slug = slugify(row.name, { lower: true, strict: true });
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name: row.name, slug },
    });
    categoryIdMap.set(row.id, category.id);
  }
  for (const row of legacyCategories as any[]) {
    if (row.parent_id) {
      const id = categoryIdMap.get(row.id);
      const parentId = categoryIdMap.get(row.parent_id);
      if (id && parentId) {
        await prisma.category.update({ where: { id }, data: { parentId } });
      }
    }
  }
  console.log(`Migrated ${categoryIdMap.size} categories.`);

  // --- tags / tags1 -> tags (de-duplicated by name) ---
  const [legacyTags] = await legacy.query<any[]>(
    "SELECT name FROM tags UNION SELECT name FROM tags1", // TODO: confirm actual table/columns
  );
  const tagIdMap = new Map<string, string>();
  for (const row of legacyTags as any[]) {
    const slug = slugify(row.name, { lower: true, strict: true });
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name: row.name, slug },
    });
    tagIdMap.set(row.name.toLowerCase(), tag.id);
  }
  console.log(`Migrated ${tagIdMap.size} de-duplicated tags.`);

  // --- news -> articles (slugs generated, schema_data folded into JSON) ---
  const [legacyNews] = await legacy.query<any[]>(
    `SELECT n.id, n.title, n.body, n.category_id, n.author_id, n.publisher_name,
            n.featured_image, n.seo_title, n.seo_description, n.is_hot,
            n.is_trending, n.is_top_five, n.is_mobile_visible, n.status,
            n.created_at, n.published_at, n.view_count,
            s.cast_json, s.director, s.rating
     FROM news n
     LEFT JOIN schema_data s ON s.news_id = n.id`, // TODO: confirm actual column names
  );

  for (const row of legacyNews as any[]) {
    const baseSlug = slugify(row.title, { lower: true, strict: true });
    let slug = baseSlug;
    let suffix = 2;
    // eslint-disable-next-line no-await-in-loop
    while (await prisma.article.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const authorId = userIdMap.get(row.author_id) ?? [...userIdMap.values()][0];
    if (!authorId) continue; // no users migrated yet — nothing to attribute authorship to

    await prisma.article.create({
      data: {
        title: row.title,
        slug,
        body: row.body,
        categoryId: categoryIdMap.get(row.category_id) ?? null,
        authorId,
        publisherName: row.publisher_name ?? null,
        featuredImageUrl: row.featured_image ?? null,
        seoTitle: row.seo_title ?? null,
        seoDescription: row.seo_description ?? null,
        isHot: Boolean(row.is_hot),
        isTrending: Boolean(row.is_trending),
        isTopFive: Boolean(row.is_top_five),
        isMobileVisible: row.is_mobile_visible === undefined ? true : Boolean(row.is_mobile_visible),
        status: row.status === 'published' ? 'PUBLISHED' : 'DRAFT',
        publishedAt: row.published_at ?? null,
        viewCount: row.view_count ?? 0,
        schemaData:
          row.cast_json || row.director || row.rating
            ? { cast: row.cast_json ? JSON.parse(row.cast_json) : [], director: row.director, rating: row.rating }
            : undefined,
      },
    });
  }
  console.log(`Migrated ${(legacyNews as any[]).length} articles.`);

  // --- flashnews / trending / dontmiss / epaperimg -> equivalent tables ---
  const [legacyFlashNews] = await legacy.query<any[]>('SELECT headline, link_url FROM flashnews');
  for (const row of legacyFlashNews as any[]) {
    await prisma.flashNews.create({ data: { headline: row.headline, linkUrl: row.link_url ?? null } });
  }

  const [legacyTrending] = await legacy.query<any[]>('SELECT title, link_url FROM trending');
  for (const row of legacyTrending as any[]) {
    await prisma.trendingLink.create({ data: { title: row.title, linkUrl: row.link_url } });
  }

  const [legacyDontMiss] = await legacy.query<any[]>('SELECT title, link_url, image_url FROM dontmiss');
  for (const row of legacyDontMiss as any[]) {
    await prisma.dontMiss.create({
      data: { title: row.title, linkUrl: row.link_url, imageUrl: row.image_url ?? null },
    });
  }

  const [legacyEpaper] = await legacy.query<any[]>(
    'SELECT edition_date, page_number, image_url FROM epaperimg',
  );
  for (const row of legacyEpaper as any[]) {
    await prisma.epaperImage
      .create({
        data: { editionDate: row.edition_date, pageNumber: row.page_number, imageUrl: row.image_url },
      })
      .catch(() => {
        /* duplicate edition/page — skip */
      });
  }

  console.log('Migrated flash news, trending, don\'t-miss, and e-paper widgets.');
  console.log('Done. Verify everything on staging before this ever touches production data.');

  await legacy.end();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
