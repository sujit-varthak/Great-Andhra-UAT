import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { AdZone } from '@prisma/client';

@Injectable()
export class AdvertisementsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateAdvertisementDto, userId: string) {
    const data = {
      ...dto,
      createdBy: userId,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    };

    const ad = await this.prisma.advertisement.create({ data });

    await this.audit.record({
      actorId: userId,
      action: 'CREATE',
      entity: 'Advertisement',
      entityId: ad.id,
      before: null,
      after: ad,
    });
    return ad;
  }

  async findAll(
    skip: number = 0,
    take: number = 10,
    zone?: string,
    isActive?: boolean,
    type?: string,
  ) {
    const where: any = {};
    if (zone) {
      const zones = zone.split(',').filter(Boolean) as AdZone[];
      where.zone = zones.length > 1 ? { in: zones } : zones[0];
    }
    if (isActive !== undefined) where.isActive = isActive;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        skip,
        take,
        orderBy: [{ zone: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: { createdByUser: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.advertisement.findUnique({
      where: { id },
      include: { createdByUser: { select: { id: true, email: true, name: true } } },
    });
  }

  async findActiveByZone(zone: AdZone, isDesktop: boolean = true) {
    const now = new Date();

    const ads = await this.prisma.advertisement.findMany({
      where: {
        zone,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        ...(isDesktop ? { showOnDesktop: true } : { showOnMobile: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // Return random ad for rotation (show 1 at a time)
    if (ads.length === 0) return null;
    return ads[Math.floor(Math.random() * ads.length)];
  }

  async findActiveRoadblock(isDesktop: boolean = true) {
    const now = new Date();

    const ads = await this.prisma.advertisement.findMany({
      where: {
        zone: 'ROADBLOCK',
        isRoadblock: true,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        ...(isDesktop ? { showOnDesktop: true } : { showOnMobile: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // Return first (highest priority) roadblock
    return ads.length > 0 ? ads[0] : null;
  }

  async update(id: string, dto: UpdateAdvertisementDto, userId: string) {
    const before = await this.prisma.advertisement.findUnique({ where: { id } });

    const data = {
      ...dto,
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate && { endDate: new Date(dto.endDate) }),
    };

    const ad = await this.prisma.advertisement.update({
      where: { id },
      data,
    });

    await this.audit.record({
      actorId: userId,
      action: 'UPDATE',
      entity: 'Advertisement',
      entityId: id,
      before,
      after: ad,
    });
    return ad;
  }

  async delete(id: string, userId: string) {
    const before = await this.prisma.advertisement.findUnique({ where: { id } });

    await this.prisma.advertisement.delete({ where: { id } });

    await this.audit.record({
      actorId: userId,
      action: 'DELETE',
      entity: 'Advertisement',
      entityId: id,
      before,
      after: null,
    });
    return { success: true };
  }

  async bulkDelete(ids: string[], userId: string) {
    const result = await this.prisma.advertisement.deleteMany({
      where: { id: { in: ids } },
    });

    for (const id of ids) {
      await this.audit.record({
        actorId: userId,
        action: 'DELETE',
        entity: 'Advertisement',
        entityId: id,
        before: null,
        after: null,
      });
    }

    return { deleted: result.count };
  }

  async bulkUpdateActive(ids: string[], isActive: boolean, userId: string) {
    const result = await this.prisma.advertisement.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });

    for (const id of ids) {
      await this.audit.record({
        actorId: userId,
        action: 'UPDATE',
        entity: 'Advertisement',
        entityId: id,
        before: null,
        after: { isActive },
      });
    }

    return { updated: result.count };
  }
}
