import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { S3Service } from './s3.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_DIMENSION = 4000;

const ALLOWED_VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly storageService: S3Service,
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
    // raw uploaded bytes. { animated: true } reads every frame of a multi-frame
    // GIF/WebP input instead of just the first — without it, an animated ad
    // banner GIF silently flattens into a single static frame.
    const reencoded = await sharp(buffer, { animated: true })
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.webp`;
    const url = await this.uploadToStorage(key, reencoded, 'image/webp');

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

  // Video: same magic-byte validation as images, but no re-encoding (that
  // would need ffmpeg, out of scope) - the validated raw buffer is uploaded
  // as-is under its detected extension.
  async uploadVideo(actorId: string, buffer: Buffer, ipAddress?: string) {
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_VIDEO_MIME_TYPES.has(detected.mime)) {
      throw new BadRequestException('Unsupported or unrecognized video file');
    }

    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${detected.ext}`;
    const url = await this.uploadToStorage(key, buffer, detected.mime);

    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'MediaUpload',
      entityId: key,
      after: { key, url, originalMime: detected.mime, sizeBytes: buffer.length },
      ipAddress,
    });

    return { url, key };
  }

  // The storage layer's own errors (e.g. missing/invalid credentials, an
  // outage) were previously left to propagate uncaught, surfacing as an
  // opaque "Internal server error" with zero context to whoever's uploading.
  private async uploadToStorage(key: string, body: Buffer, contentType: string): Promise<string> {
    try {
      return await this.storageService.upload(key, body, contentType);
    } catch (err) {
      this.logger.error(`Storage upload failed for ${key}`, err as Error);
      throw new ServiceUnavailableException(
        'Media storage is currently unavailable. Please try again shortly.',
      );
    }
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
