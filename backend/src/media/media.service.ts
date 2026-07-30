import { BadRequestException, Injectable } from '@nestjs/common';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { VercelBlobService } from './vercel-blob.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_DIMENSION = 4000;

@Injectable()
export class MediaService {
  constructor(
    private readonly storageService: VercelBlobService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadImage(actorId: string, buffer: Buffer, ipAddress?: string) {
    // Validate the real file type from its magic bytes — never trust the
    // client-supplied filename/extension (proposal §3.3).
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new BadRequestException('Unsupported or unrecognized image file');
    }

    // Re-encode through sharp: strips EXIF/embedded scripts, normalizes to
    // webp, and caps dimensions — the file that reaches storage is never the
    // raw uploaded bytes.
    const reencoded = await sharp(buffer)
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.webp`;
    const url = await this.storageService.upload(key, reencoded, 'image/webp');

    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'MediaUpload',
      entityId: key,
      after: { key, url, originalMime: detected.mime, sizeBytes: reencoded.length },
      ipAddress,
    });

    return { url, key };
  }

  // Media library: every article that currently has a featured image,
  // newest-updated first — preview + which post it's attached to. There's no
  // separate media table, so this only surfaces images actually attached to
  // an article, not ones uploaded and then abandoned before saving.
  async listLibrary(filters: { skip?: number; take?: number }) {
    const where = { featuredImageUrl: { not: null } };
    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          featuredImageUrl: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 25,
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, total };
  }
}
