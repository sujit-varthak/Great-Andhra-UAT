import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFlashNewsDto, UpdateFlashNewsDto } from './dto/flash-news.dto';

@Injectable()
export class FlashNewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list() {
    return this.prisma.flashNews.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async create(actorId: string, dto: CreateFlashNewsDto) {
    const item = await this.prisma.flashNews.create({ data: dto });
    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'FlashNews',
      entityId: item.id,
      after: item,
    });
    return item;
  }

  async update(actorId: string, id: string, dto: UpdateFlashNewsDto) {
    const before = await this.prisma.flashNews.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Flash news item not found');

    const updated = await this.prisma.flashNews.update({ where: { id }, data: dto });
    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'FlashNews',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.flashNews.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Flash news item not found');

    await this.prisma.flashNews.delete({ where: { id } });
    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'FlashNews',
      entityId: id,
      before,
    });
    return { ok: true };
  }
}
