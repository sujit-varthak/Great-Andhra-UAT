import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    actorId: string | null;
    action: AuditAction;
    entity: string;
    entityId: string | null;
    before?: unknown;
    after?: unknown;
    ipAddress?: string | null;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        beforeJson: params.before === undefined ? undefined : (params.before as any),
        afterJson: params.after === undefined ? undefined : (params.after as any),
        ipAddress: params.ipAddress ?? null,
      },
    });
  }

  async list(params: { entity?: string; actorId?: string; skip?: number; take?: number }) {
    const where: Record<string, unknown> = {};
    if (params.entity) where.entity = params.entity;
    if (params.actorId) where.actorId = params.actorId;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip ?? 0,
        take: params.take ?? 50,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}
