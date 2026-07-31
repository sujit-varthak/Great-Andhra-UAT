import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  // Used by the admin tag-picker autocomplete — capped and only queried
  // once the admin has actually typed something, since the full tag list
  // is now in the thousands.
  search(query: string) {
    if (!query) return [];
    return this.prisma.tag.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  // Admin management view: searchable, paginated, with a per-tag count of
  // PUBLISHED articles - optionally restricted to a recent day-range window
  // instead of all-time. Distinct from search() above, which stays a fast,
  // uncounted, unpaginated autocomplete for the article editor's tag picker.
  async listWithStats(params: {
    search?: string;
    skip?: number;
    take?: number;
    days?: number;
  }) {
    const where = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' as const } },
            { slug: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [tags, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: params.skip ?? 0,
        take: params.take ?? 25,
      }),
      this.prisma.tag.count({ where }),
    ]);

    if (tags.length === 0) return { items: [], total };

    const publishedAt = params.days
      ? { gte: new Date(Date.now() - params.days * 24 * 60 * 60 * 1000) }
      : undefined;

    const counts = await this.prisma.articleTag.groupBy({
      by: ['tagId'],
      where: {
        tagId: { in: tags.map((t) => t.id) },
        article: { status: 'PUBLISHED', ...(publishedAt ? { publishedAt } : {}) },
      },
      _count: { articleId: true },
    });

    const countByTagId = new Map(counts.map((c) => [c.tagId, c._count.articleId]));
    const items = tags.map((t) => ({ ...t, articleCount: countByTagId.get(t.id) ?? 0 }));

    return { items, total };
  }

  async create(actorId: string, name: string) {
    const slug = slugify(name, { lower: true, strict: true });
    const existing = await this.prisma.tag.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('This tag already exists');

    const tag = await this.prisma.tag.create({ data: { name, slug } });
    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'Tag',
      entityId: tag.id,
      after: tag,
    });
    return tag;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.tag.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Tag not found');

    await this.prisma.tag.delete({ where: { id } });
    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'Tag',
      entityId: id,
      before,
    });
    return { ok: true };
  }
}
