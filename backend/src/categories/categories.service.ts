import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  list() {
    return this.prisma.category.findMany({
      include: { children: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(actorId: string, dto: CreateCategoryDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('A category with this name already exists');

    const category = await this.prisma.category.create({
      data: { name: dto.name, slug, parentId: dto.parentId ?? null },
    });

    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'Category',
      entityId: category.id,
      after: category,
    });

    return category;
  }

  async update(actorId: string, id: string, dto: UpdateCategoryDto) {
    const before = await this.prisma.category.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Category not found');

    if (dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    const data: { name?: string; slug?: string; parentId?: string | null } = {};
    if (dto.name) {
      data.name = dto.name;
      data.slug = slugify(dto.name, { lower: true, strict: true });
    }
    if (dto.parentId !== undefined) data.parentId = dto.parentId;

    const updated = await this.prisma.category.update({ where: { id }, data });

    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'Category',
      entityId: id,
      before,
      after: updated,
    });

    return updated;
  }

  async remove(actorId: string, id: string) {
    const before = await this.prisma.category.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Category not found');

    await this.prisma.category.delete({ where: { id } });

    await this.auditService.record({
      actorId,
      action: 'DELETE',
      entity: 'Category',
      entityId: id,
      before,
    });

    return { ok: true };
  }
}
