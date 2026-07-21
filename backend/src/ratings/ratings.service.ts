import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async rate(articleId: string, dto: CreateRatingDto) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException('Article not found');

    const rating = await this.prisma.rating.upsert({
      where: { articleId_fingerprint: { articleId, fingerprint: dto.fingerprint } },
      update: { value: dto.value },
      create: { articleId, value: dto.value, fingerprint: dto.fingerprint },
    });

    return rating;
  }

  async summary(articleId: string) {
    const agg = await this.prisma.rating.aggregate({
      where: { articleId },
      _avg: { value: true },
      _count: { value: true },
    });
    return { average: agg._avg.value ?? 0, count: agg._count.value };
  }

  list(articleId: string) {
    return this.prisma.rating.findMany({ where: { articleId }, orderBy: { createdAt: 'desc' } });
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.rating.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Rating not found');

    await this.prisma.rating.delete({ where: { id } });
    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'Rating',
      entityId: id,
      before,
    });
    return { ok: true };
  }
}
