import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUsaMovieScheduleDto, UpdateUsaMovieScheduleDto } from './dto/usa-movie-schedule.dto';

@Injectable()
export class UsaMovieScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list() {
    // sortOrder defaults to 0 for every new entry, so a secondary tiebreaker
    // is required - otherwise Postgres can return tied rows in a different
    // order on each query, and the list silently reshuffles between loads.
    return this.prisma.usaMovieSchedule.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listActive(take = 4) {
    return this.prisma.usaMovieSchedule.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take,
    });
  }

  async create(actorId: string, dto: CreateUsaMovieScheduleDto) {
    const item = await this.prisma.usaMovieSchedule.create({ data: dto });
    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'UsaMovieSchedule',
      entityId: item.id,
      after: item,
    });
    return item;
  }

  async update(actorId: string, id: string, dto: UpdateUsaMovieScheduleDto) {
    const before = await this.prisma.usaMovieSchedule.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('USA movie schedule entry not found');

    const updated = await this.prisma.usaMovieSchedule.update({ where: { id }, data: dto });
    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'UsaMovieSchedule',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.usaMovieSchedule.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('USA movie schedule entry not found');

    await this.prisma.usaMovieSchedule.delete({ where: { id } });
    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'UsaMovieSchedule',
      entityId: id,
      before,
    });
    return { ok: true };
  }
}
