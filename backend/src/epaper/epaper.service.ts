import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateEpaperImageDto } from './dto/epaper.dto';

@Injectable()
export class EpaperService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list(editionDate?: string) {
    return this.prisma.epaperImage.findMany({
      where: editionDate ? { editionDate: new Date(editionDate) } : undefined,
      orderBy: [{ editionDate: 'desc' }, { pageNumber: 'asc' }],
    });
  }

  async create(actorId: string, dto: CreateEpaperImageDto) {
    const existing = await this.prisma.epaperImage.findUnique({
      where: {
        editionDate_pageNumber: {
          editionDate: new Date(dto.editionDate),
          pageNumber: dto.pageNumber,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('This edition/page combination already has an image');
    }

    const item = await this.prisma.epaperImage.create({
      data: {
        editionDate: new Date(dto.editionDate),
        pageNumber: dto.pageNumber,
        imageUrl: dto.imageUrl,
      },
    });

    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'EpaperImage',
      entityId: item.id,
      after: item,
    });

    return item;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.epaperImage.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('E-paper image not found');

    await this.prisma.epaperImage.delete({ where: { id } });
    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'EpaperImage',
      entityId: id,
      before,
    });
    return { ok: true };
  }
}
