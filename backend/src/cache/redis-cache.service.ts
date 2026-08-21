import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// A dedicated connection for HTTP response caching, separate from BullMQ's own
// Redis connection (queue.module.ts) - keeps the job queue and the cache as
// independent concerns even though they share the same Redis/Valkey instance.
@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      username: process.env.REDIS_USERNAME || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      // A slow/unreachable cache must never hang a request - fail fast and let
      // the caller (PublicCacheInterceptor) fall through to a normal DB-backed
      // response instead.
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      // Bounded backoff, capped at 3s between attempts - never gives up
      // permanently. `retryStrategy: () => null` previously meant a single
      // Valkey blip or restart would silently and permanently disable caching
      // for that instance's remaining lifetime.
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis cache connection error: ${err.message}`);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
