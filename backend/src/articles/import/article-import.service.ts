import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { MediaService } from '../../media/media.service';

interface ParsedCategory {
  name: string;
  slug: string;
}

interface ParsedPost {
  legacyPostId: number;
  title: string;
  bodyHtml: string;
  categories: ParsedCategory[];
  tags: ParsedCategory[];
  featuredImageUrl?: string;
}

interface ImportWarning {
  legacyPostId: number;
  title: string;
  message: string;
}

// Category articles land in gets isTrending checked automatically - matches
// the one category->flag rule already implicit in the existing data.
const AUTO_TRENDING_CATEGORY_SLUG = 'latest-news';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

@Injectable()
export class ArticleImportService {
  private readonly logger = new Logger(ArticleImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mediaService: MediaService,
  ) {}

  // Parses the WXR (WordPress eXtended RSS) buffer into just the real posts,
  // with their category/tag names, body HTML, and resolved featured-image URL
  // (attachments live as separate <item>s in the same file, linked via a
  // _thumbnail_id postmeta pointing at the attachment's wp:post_id).
  private parsePosts(xml: Buffer): ParsedPost[] {
    const parsed = parser.parse(xml.toString('utf-8'));
    const items = asArray(parsed?.rss?.channel?.item);

    const attachmentUrlByPostId = new Map<number, string>();
    for (const item of items) {
      if (item['wp:post_type'] !== 'attachment') continue;
      const postId = Number(item['wp:post_id']);
      const url = item['wp:attachment_url'];
      if (postId && url) attachmentUrlByPostId.set(postId, String(url));
    }

    const posts: ParsedPost[] = [];
    for (const item of items) {
      if (item['wp:post_type'] !== 'post') continue;
      if (item['wp:status'] === 'trash') continue;

      const legacyPostId = Number(item['wp:post_id']);
      if (!legacyPostId) continue;

      const categoryEntries = asArray(item.category);
      const categories: ParsedCategory[] = [];
      const tags: ParsedCategory[] = [];
      for (const entry of categoryEntries) {
        const parsedEntry = {
          name: String(entry['#text'] ?? entry),
          slug: String(entry['@_nicename'] ?? slugify(String(entry['#text'] ?? entry), { lower: true, strict: true })),
        };
        if (entry['@_domain'] === 'post_tag') tags.push(parsedEntry);
        else if (entry['@_domain'] === 'category') categories.push(parsedEntry);
      }

      const thumbnailId = asArray(item['wp:postmeta'])
        .filter((m) => m?.['wp:meta_key'] === '_thumbnail_id')
        .map((m) => Number(m['wp:meta_value']))[0];
      const featuredImageUrl = thumbnailId ? attachmentUrlByPostId.get(thumbnailId) : undefined;

      posts.push({
        legacyPostId,
        title: String(item.title ?? '(untitled)'),
        bodyHtml: String(item['content:encoded'] ?? ''),
        categories,
        tags,
        featuredImageUrl,
      });
    }
    return posts;
  }

  async preview(xml: Buffer) {
    const posts = this.parsePosts(xml);
    const existing = await this.prisma.article.findMany({
      where: { legacyPostId: { in: posts.map((p) => p.legacyPostId) } },
      select: { legacyPostId: true },
    });
    const existingIds = new Set(existing.map((e) => e.legacyPostId));

    const existingCategories = await this.prisma.category.findMany({ select: { name: true, slug: true } });
    const existingSlugs = new Set(existingCategories.map((c) => c.slug));
    const existingNamesLower = new Set(existingCategories.map((c) => c.name.toLowerCase()));
    const newCategorySlugs = new Set<string>();
    for (const post of posts) {
      // Only the first category is ever actually assigned (see below) - a
      // post's 2nd/3rd listed category never gets created, so checking all
      // of them here would report categories the commit step never touches.
      // Matches upsertCategory's slug-then-name fallback, so a stale/typo'd
      // slug for a category that already exists under the same name (this
      // happened for real with "Latest News") isn't reported as "new".
      const primary = post.categories[0];
      if (!primary) continue;
      const matchesExisting =
        existingSlugs.has(primary.slug) || existingNamesLower.has(primary.name.toLowerCase());
      if (!matchesExisting) newCategorySlugs.add(primary.slug);
    }

    const toImport = posts.filter((p) => !existingIds.has(p.legacyPostId));
    const duplicates = posts.length - toImport.length;
    const multiCategoryWarnings: ImportWarning[] = posts
      .filter((p) => p.categories.length > 1)
      .map((p) => ({
        legacyPostId: p.legacyPostId,
        title: p.title,
        message: `Has ${p.categories.length} categories - only the first ("${p.categories[0].name}") will be used.`,
      }));

    return {
      totalInFile: posts.length,
      willImport: toImport.length,
      duplicatesSkipped: duplicates,
      newCategories: [...newCategorySlugs],
      warnings: multiCategoryWarnings,
    };
  }

  async commit(xml: Buffer, actorId: string) {
    const posts = this.parsePosts(xml);
    const existing = await this.prisma.article.findMany({
      where: { legacyPostId: { in: posts.map((p) => p.legacyPostId) } },
      select: { legacyPostId: true },
    });
    const existingIds = new Set(existing.map((e) => e.legacyPostId));
    const toImport = posts.filter((p) => !existingIds.has(p.legacyPostId));

    const trendingCategory = await this.prisma.category.findUnique({
      where: { slug: AUTO_TRENDING_CATEGORY_SLUG },
    });

    let created = 0;
    const warnings: ImportWarning[] = [];
    const failures: ImportWarning[] = [];

    for (const post of toImport) {
      try {
        const categoryId = post.categories.length
          ? (await this.upsertCategory(post.categories[0])).id
          : null;
        const tagIds = await Promise.all(post.tags.map((t) => this.upsertTag(t)));

        const featuredImageUrl = post.featuredImageUrl
          ? await this.reuploadImage(actorId, post.featuredImageUrl, post)
          : null;
        if (post.featuredImageUrl && !featuredImageUrl) {
          warnings.push({
            legacyPostId: post.legacyPostId,
            title: post.title,
            message: 'Imported, but its featured image could not be downloaded/re-uploaded.',
          });
        }
        const bodyHtml = await this.reuploadInlineImages(actorId, post.bodyHtml, post);

        const slug = await this.uniqueSlug(post.title);
        const isTrending = Boolean(trendingCategory && categoryId === trendingCategory.id);

        const article = await this.prisma.article.create({
          data: {
            title: post.title,
            slug,
            body: bodyHtml,
            categoryId,
            authorId: actorId,
            featuredImageUrl,
            legacyPostId: post.legacyPostId,
            isTrending,
            status: 'DRAFT',
            tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
          },
        });

        await this.auditService.record({
          actorId,
          action: 'CREATE',
          entity: 'Article',
          entityId: article.id,
          after: { source: 'xml-import', legacyPostId: post.legacyPostId, title: post.title },
        });
        created++;
      } catch (err) {
        this.logger.error(`Failed to import legacyPostId ${post.legacyPostId}`, err as Error);
        failures.push({
          legacyPostId: post.legacyPostId,
          title: post.title,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      totalInFile: posts.length,
      created,
      duplicatesSkipped: posts.length - toImport.length,
      failed: failures.length,
      warnings: [...warnings, ...failures],
    };
  }

  // Matches by slug first, then falls back to an exact (case-insensitive)
  // name match before creating anything new. Source exports can carry an
  // old/typo'd slug for a category that's since been renamed on this end
  // (this happened for real with "Latest News" - the XML still says
  // nicename="lastest-news") - without the name fallback, every import
  // would spawn a fresh duplicate under the stale slug instead of reusing
  // the category that's already there.
  private async upsertCategory(cat: ParsedCategory) {
    const bySlug = await this.prisma.category.findUnique({ where: { slug: cat.slug } });
    if (bySlug) return bySlug;

    const byName = await this.prisma.category.findFirst({
      where: { name: { equals: cat.name, mode: 'insensitive' } },
    });
    if (byName) return byName;

    return this.prisma.category.create({ data: { name: cat.name, slug: cat.slug } });
  }

  private async upsertTag(tag: ParsedCategory): Promise<string> {
    const bySlug = await this.prisma.tag.findUnique({ where: { slug: tag.slug } });
    if (bySlug) return bySlug.id;

    const byName = await this.prisma.tag.findFirst({
      where: { name: { equals: tag.name, mode: 'insensitive' } },
    });
    if (byName) return byName.id;

    const created = await this.prisma.tag.create({ data: { name: tag.name, slug: tag.slug } });
    return created.id;
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    let slug = base;
    let suffix = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.article.findUnique({ where: { slug } });
      if (!existing) return slug;
      slug = `${base}-${suffix++}`;
    }
  }

  private async reuploadImage(actorId: string, url: string, post: ParsedPost): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const uploaded = await this.mediaService.uploadImage(actorId, buffer);
      return uploaded.url;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Image re-upload failed for legacyPostId ${post.legacyPostId}: ${url} - ${reason}`,
      );
      return null;
    }
  }

  private async reuploadInlineImages(actorId: string, html: string, post: ParsedPost): Promise<string> {
    if (!html) return html;
    const srcs = new Set<string>();
    const imgTagRe = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = imgTagRe.exec(html))) srcs.add(match[1]);

    let updated = html;
    for (const src of srcs) {
      const newUrl = await this.reuploadImage(actorId, src, post);
      if (newUrl) {
        updated = updated.split(`"${src}"`).join(`"${newUrl}"`).split(`'${src}'`).join(`'${newUrl}'`);
      }
    }
    return updated;
  }
}
