import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import slugify from 'slugify';
import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SCHEDULED_PUBLISHING_QUEUE } from '../queue/queue.module';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

const articleInclude = {
  category: true,
  tags: { include: { tag: true } },
  author: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @InjectQueue(SCHEDULED_PUBLISHING_QUEUE) private readonly publishQueue: Queue,
  ) {}

  private async uniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    let slug = base;
    let suffix = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.article.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${suffix++}`;
    }
  }

  private async scheduleIfNeeded(articleId: string, status?: ArticleStatus, scheduledAt?: string) {
    // Redis/BullMQ temporarily disabled for demo purposes (no reachable Redis
    // instance) — restore the block below to re-enable scheduled-publish
    // queueing once Redis is available again.
    return;
    // if (status === 'SCHEDULED' && scheduledAt) {
    //   const delay = Math.max(0, new Date(scheduledAt).getTime() - Date.now());
    //   await this.publishQueue.add(
    //     'publish-article',
    //     { articleId },
    //     { delay, jobId: `publish-${articleId}` },
    //   );
    // } else {
    //   // Remove any stale scheduled job if the article is no longer pending schedule.
    //   const job = await this.publishQueue.getJob(`publish-${articleId}`);
    //   if (job) await job.remove();
    // }
  }

  async list(filters: { status?: ArticleStatus; categoryId?: string; tagId?: string; skip?: number; take?: number }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.tagId) where.tags = { some: { tagId: filters.tagId } };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: articleInclude,
        orderBy: { createdAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 25,
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, total };
  }

  async countByStatus() {
    const rows = await this.prisma.article.groupBy({ by: ['status'], _count: true });
    const counts: Record<string, number> = { DRAFT: 0, IN_REVIEW: 0, SCHEDULED: 0, PUBLISHED: 0, ARCHIVED: 0 };
    for (const row of rows) counts[row.status] = row._count;
    return counts;
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id }, include: articleInclude });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async create(actorId: string, dto: CreateArticleDto) {
    const slug = await this.uniqueSlug(dto.title);
    const status = dto.status ?? 'DRAFT';

    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        slug,
        body: dto.body,
        excerpt: dto.excerpt,
        categoryId: dto.categoryId,
        authorId: actorId,
        publisherName: dto.publisherName,
        featuredImageUrl: dto.featuredImageUrl,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        isHot: dto.isHot ?? false,
        isTrending: dto.isTrending ?? false,
        isTopFive: dto.isTopFive ?? false,
        isMobileVisible: dto.isMobileVisible ?? true,
        isBigStory: dto.isBigStory ?? false,
        status,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        schemaData: dto.schemaData as any,
        tags: dto.tagIds
          ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: articleInclude,
    });

    await this.scheduleIfNeeded(article.id, status, dto.scheduledAt);

    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'Article',
      entityId: article.id,
      after: article,
    });

    return article;
  }

  async update(actorId: string, id: string, dto: UpdateArticleDto) {
    const before = await this.prisma.article.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Article not found');

    const slug = dto.title ? await this.uniqueSlug(dto.title, id) : undefined;
    const wasPublished = before.status === 'PUBLISHED';
    const willBePublished = (dto.status ?? before.status) === 'PUBLISHED';

    if (dto.tagIds) {
      await this.prisma.articleTag.deleteMany({ where: { articleId: id } });
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        title: dto.title,
        slug,
        body: dto.body,
        excerpt: dto.excerpt,
        categoryId: dto.categoryId,
        publisherName: dto.publisherName,
        featuredImageUrl: dto.featuredImageUrl,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        isHot: dto.isHot,
        isTrending: dto.isTrending,
        isTopFive: dto.isTopFive,
        isMobileVisible: dto.isMobileVisible,
        isBigStory: dto.isBigStory,
        status: dto.status,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : dto.scheduledAt,
        publishedAt: !wasPublished && willBePublished ? new Date() : undefined,
        schemaData: dto.schemaData as any,
        tags: dto.tagIds ? { create: dto.tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: articleInclude,
    });

    await this.scheduleIfNeeded(id, dto.status ?? before.status, dto.scheduledAt);

    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'Article',
      entityId: id,
      before,
      after: updated,
    });

    return updated;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.article.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Article not found');

    await this.prisma.article.delete({ where: { id } });

    const job = await this.publishQueue.getJob(`publish-${id}`);
    if (job) await job.remove();

    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'Article',
      entityId: id,
      before,
    });

    return { ok: true };
  }

  // --- Public content API (published articles only, no auth) ---

  listPublished(filters: { categoryId?: string; skip?: number; take?: number }) {
    return this.prisma.article.findMany({
      where: { status: 'PUBLISHED', categoryId: filters.categoryId },
      include: articleInclude,
      orderBy: { publishedAt: 'desc' },
      skip: filters.skip ?? 0,
      take: filters.take ?? 25,
    });
  }

  async findPublishedById(id: string) {
    const article = await this.prisma.article.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: articleInclude,
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  // Big Story feed: published articles flagged isBigStory, most-recently-updated
  // first. Multiple articles can carry the flag — the caller picks the front of
  // this list as the hero and the rest as related.
  findBigStoryFeed(take = 4) {
    return this.prisma.article.findMany({
      where: { status: 'PUBLISHED', isBigStory: true },
      include: articleInclude,
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  // Trending feed: published articles flagged isTrending, most-recently-updated
  // first. Backend returns a fixed upper bound; the frontend trims to however
  // many actually fit based on title length.
  findTrendingFeed(take = 15) {
    return this.prisma.article.findMany({
      where: { status: 'PUBLISHED', isTrending: true },
      include: articleInclude,
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  // Generic category-path feed: published articles in a given sub-category,
  // filtered by slug (not id) so a future rename of either category doesn't
  // break the query. Used for every homepage section that's just "the latest
  // N published articles in category X under parent Y".
  findByCategoryPath(categorySlug: string, parentSlug: string, take = 5) {
    return this.prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        category: { slug: categorySlug, parent: { slug: parentSlug } },
      },
      include: articleInclude,
      orderBy: { publishedAt: 'desc' },
      take,
    });
  }

  findOpinionFeed(take = 5) {
    return this.findByCategoryPath('opinion', 'politics', take);
  }

  findMovieNewsFeed(take = 5) {
    return this.findByCategoryPath('movie-news', 'movies', take);
  }

  findMovieGossipFeed(take = 5) {
    return this.findByCategoryPath('movie-gossip', 'movies', take);
  }

  findAndhraNewsFeed(take = 5) {
    return this.findByCategoryPath('andhra-news', 'politics', take);
  }

  findTelanganaNewsFeed(take = 5) {
    return this.findByCategoryPath('telengana-news', 'politics', take);
  }

  findPoliticsGossipFeed(take = 5) {
    return this.findByCategoryPath('gossip', 'politics', take);
  }

  findReviewsFeed(take = 5) {
    return this.findByCategoryPath('reviews', 'movies', take);
  }

  async incrementViewCount(id: string) {
    await this.prisma.article.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return { ok: true };
  }
}
