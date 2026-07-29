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
