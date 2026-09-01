import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'greatandhra-media';
    this.client = new S3Client({
      // R2 doesn't use AWS regions - 'auto' is Cloudflare's documented value.
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
    });
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Every key is `uploads/{date}/{randomUUID()}.{ext}` (see media.service.ts) - never
        // reused or overwritten - so it's safe to tell browsers/CDN to cache it forever.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    // Strip any trailing slash so a misconfigured env var (e.g.
    // S3_PUBLIC_URL_BASE with a trailing "/") can't produce a doubled slash
    // before the key - R2 serves that as a 404, a distinct object key, not
    // the same file.
    const publicBase = (process.env.S3_PUBLIC_URL_BASE || `${process.env.S3_ENDPOINT}/${this.bucket}`).replace(/\/+$/, '');
    return `${publicBase}/${key}`;
  }
}
