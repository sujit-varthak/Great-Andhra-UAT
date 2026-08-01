import { Injectable, NotFoundException } from '@nestjs/common';
import { MovieBoxOfficeSection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMovieBoxOfficeDto, UpdateMovieBoxOfficeDto } from './dto/movie-box-office.dto';

@Injectable()
export class MovieBoxOfficeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list(section?: MovieBoxOfficeSection) {
    // sortOrder defaults to 0 for every new entry, so a secondary tiebreaker
    // is required - otherwise Postgres can return tied rows in a different
    // order on each query, and the list silently reshuffles between loads.
    return this.prisma.movieBoxOffice.findMany({
      where: section ? { section } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listActive(section: MovieBoxOfficeSection, take = 5) {
    return this.prisma.movieBoxOffice.findMany({
      where: { section, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take,
    });
  }

  async create(actorId: string, dto: CreateMovieBoxOfficeDto) {
    const item = await this.prisma.movieBoxOffice.create({ data: dto });
    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'MovieBoxOffice',
      entityId: item.id,
      after: item,
    });
    return item;
  }

  async update(actorId: string, id: string, dto: UpdateMovieBoxOfficeDto) {
    const before = await this.prisma.movieBoxOffice.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Movie box office entry not found');

    const updated = await this.prisma.movieBoxOffice.update({ where: { id }, data: dto });
    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'MovieBoxOffice',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.movieBoxOffice.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Movie box office entry not found');

    await this.prisma.movieBoxOffice.delete({ where: { id } });
    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'MovieBoxOffice',
      entityId: id,
      before,
    });
    return { ok: true };
  }
}
