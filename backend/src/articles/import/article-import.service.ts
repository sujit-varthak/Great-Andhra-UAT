import { Injectable, Logger } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { MediaService } from '../../media/media.service';
import { parseXml, ParsedPost } from './xml-stream-parser';
import { pickPrimaryCategory, ParsedCategory } from './xml-category-mapping';
import { resolveCategoryChain } from './category-resolver';

interface ImportWarning {
  legacyPostId: number;
  title: string;
  message: string;
}

@Injectable()
export class ArticleImportService {
  private readonly logger = new Logger(ArticleImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mediaService: MediaService,
  ) {}

  // xmlPath points at a temp file on disk (see article-import.controller.ts's
  // diskStorage config) - streamed via `sax` instead of loading the whole
  // file and a full parsed DOM into memory, which is what repeatedly
  // OOM-crashed this endpoint on large export files.
  async preview(xmlPath: string) {
    const { posts, categoryDefs } = await parseXml(xmlPath);
    const existing = await this.prisma.article.findMany({
      where: { legacyPostId: { in: posts.map((p) => p.legacyPostId) } },
      select: { legacyPostId: true },
    });
    const existingIds = new Set(existing.map((e) => e.legacyPostId));
    const toImport = posts.filter((p) => !existingIds.has(p.legacyPostId));

    const existingCategories = await this.prisma.category.findMany({ select: { slug: true } });
    const existingSlugs = new Set(existingCategories.map((c) => c.slug));
    const newCategorySlugs = new Set<string>();
    const multiCategoryWarnings: ImportWarning[] = [];
    for (const post of toImport) {
      if (post.categories.length > 1) {
        multiCategoryWarnings.push({
          legacyPostId: post.legacyPostId,
          title: post.title,
          message: `Has ${post.categories.length} categories - the most specific one will be used.`,
        });
      }
      const primary = pickPrimaryCategory(post.categories);
      if (!primary) continue;
      for (const slug of ancestorChain(primary.slug, categoryDefs)) {
        if (!existingSlugs.has(slug)) newCategorySlugs.add(slug);
      }
    }

    const duplicates = posts.length - toImport.length;
    const withImage = toImport.filter((p) => p.featuredImageUrl).length;

    return {
      totalInFile: posts.length,
      willImport: toImport.length,
      duplicatesSkipped: duplicates,
      willHaveFeaturedImage: withImage,
      newCategories: [...newCategorySlugs],
      warnings: multiCategoryWarnings,
    };
  }

  async commit(xmlPath: string, actorId: string) {
    const { posts, categoryDefs } = await parseXml(xmlPath);
    const existing = await this.prisma.article.findMany({
      where: { legacyPostId: { in: posts.map((p) => p.legacyPostId) } },
      select: { legacyPostId: true },
    });
    const existingIds = new Set(existing.map((e) => e.legacyPostId));
    const toImport = posts.filter((p) => !existingIds.has(p.legacyPostId));

    let created = 0;
    const categoryCache = new Map<string, string>();
    const warnings: ImportWarning[] = [];
    const failures: ImportWarning[] = [];

    for (const post of toImport) {
      try {
        const primary = pickPrimaryCategory(post.categories);
        const categoryId = primary
          ? await resolveCategoryChain(this.prisma, primary.slug, categoryDefs, categoryCache, primary.name)
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
        const isPublished = post.status === 'publish';
        const parsedDate = post.postDate ? new Date(post.postDate.replace(' ', 'T')) : null;
        const publishedAt = isPublished && parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

        const article = await this.prisma.article.create({
          data: {
            title: post.title,
            slug,
            body: bodyHtml,
            categoryId,
            authorId: actorId,
            featuredImageUrl,
            legacyPostId: post.legacyPostId,
            // Freshly-imported content defaults to trending, matching how a
            // manually-created article in the admin normally starts with
            // Trending selected - not conditioned on any one category tag,
            // since which categories a given export batch carries varies.
            isTrending: true,
            // A real featured image is what "featured" content means here -
            // matches the criteria applied to the file-9 backfill (mark
            // every article that has one, leave the rest unmarked).
            isFeatured: Boolean(featuredImageUrl),
            status: isPublished ? 'PUBLISHED' : 'DRAFT',
            publishedAt,
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
    const base = slugify(title, { lower: true, strict: true }) || 'post';
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
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
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

function ancestorChain(slug: string, categoryDefs: Map<string, import('./xml-category-mapping').CategoryDef>): string[] {
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
