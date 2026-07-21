import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTrendingDto, UpdateTrendingDto } from './dto/trending.dto';

@Injectable()
export class TrendingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list() {
    return this.prisma.trendingLink.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async create(actorId: string, dto: CreateTrendingDto) {
    const item = await this.prisma.trendingLink.create({ data: dto });
    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'TrendingLink',
      entityId: item.id,
      after: item,
    });
    return item;
  }

  async update(actorId: string, id: string, dto: UpdateTrendingDto) {
    const before = await this.prisma.trendingLink.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Trending link not found');

    const updated = await this.prisma.trendingLink.update({ where: { id }, data: dto });
    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'TrendingLink',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.trendingLink.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Trending link not found');

    await this.prisma.trendingLink.delete({ where: { id } });
    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'TrendingLink',
      entityId: id,
      before,
    });
    return { ok: true };
  }
}
