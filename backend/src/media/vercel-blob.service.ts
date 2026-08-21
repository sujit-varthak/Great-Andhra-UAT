import { Injectable } from '@nestjs/common';
import { put } from '@vercel/blob';

@Injectable()
export class VercelBlobService {
  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    // key is already unique (uploads/<date>/<uuid>.webp) — skip Vercel's own
    // random-suffix behavior so the returned URL matches the key exactly.
    //
    // Old store (blocked as of 2026-07-29, store id dlutvdzgkgxfieyl) — replaced below:
    // const { url } = await put(key, body, { access: 'public', contentType, addRandomSuffix: false });
    const { url } = await put(key, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return url;
  }
}
