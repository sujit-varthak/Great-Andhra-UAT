import { BadRequestException, Injectable } from '@nestjs/common';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { S3Service } from './s3.service';
import { AuditService } from '../audit/audit.service';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_DIMENSION = 4000;

@Injectable()
export class MediaService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly auditService: AuditService,
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
    const url = await this.s3Service.upload(key, reencoded, 'image/webp');

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
}
