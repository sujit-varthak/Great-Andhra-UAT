import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDontMissDto, UpdateDontMissDto } from './dto/dont-miss.dto';

@Injectable()
export class DontMissService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list() {
    return this.prisma.dontMiss.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  listActive() {
    return this.prisma.dontMiss.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(actorId: string, dto: CreateDontMissDto) {
    const item = await this.prisma.dontMiss.create({ data: dto });
    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'DontMiss',
      entityId: item.id,
      after: item,
    });
    return item;
  }

  async update(actorId: string, id: string, dto: UpdateDontMissDto) {
    const before = await this.prisma.dontMiss.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Don't Miss item not found");

    const updated = await this.prisma.dontMiss.update({ where: { id }, data: dto });
    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'DontMiss',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.dontMiss.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Don't Miss item not found");

    await this.prisma.dontMiss.delete({ where: { id } });
    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'DontMiss',
      entityId: id,
      before,
    });
    return { ok: true };
  }
}
