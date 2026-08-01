import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateWeeklyTopFiveDto, UpdateWeeklyTopFiveDto } from './dto/weekly-top-five.dto';

@Injectable()
export class WeeklyTopFiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list() {
    // sortOrder defaults to 0 for every new entry, so a secondary tiebreaker
    // is required - otherwise Postgres can return tied rows in a different
    // order on each query, and the list silently reshuffles between loads.
    return this.prisma.weeklyTopFive.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listActive(take = 5) {
    return this.prisma.weeklyTopFive.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take,
    });
  }

  async create(actorId: string, dto: CreateWeeklyTopFiveDto) {
    const item = await this.prisma.weeklyTopFive.create({ data: dto });
    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'WeeklyTopFive',
      entityId: item.id,
      after: item,
    });
    return item;
  }

  async update(actorId: string, id: string, dto: UpdateWeeklyTopFiveDto) {
    const before = await this.prisma.weeklyTopFive.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Weekly top five entry not found');

    const updated = await this.prisma.weeklyTopFive.update({ where: { id }, data: dto });
    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'WeeklyTopFive',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.weeklyTopFive.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Weekly top five entry not found');

    await this.prisma.weeklyTopFive.delete({ where: { id } });
    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'WeeklyTopFive',
      entityId: id,
      before,
    });
    return { ok: true };
  }
}
