import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SCHEDULED_PUBLISHING_QUEUE } from '../queue/queue.module';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SCHEDULED_PUBLISHING_QUEUE) private readonly publishQueue: Queue,
  ) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }

    // Exercises the real BullMQ/ioredis connection with an actual SET/GET/DEL
    // round trip - proves Redis is reachable AND writable/readable with whatever
    // host/username/password/TLS config is actually configured, not just that a
    // plain socket opens (which a bare ping() wouldn't rule out auth/permission
    // issues on either the SET or GET side).
    try {
      const client = await this.publishQueue.client as unknown as {
        set(key: string, value: string): Promise<string>;
        get(key: string): Promise<string | null>;
        del(key: string): Promise<number>;
      };
      const testKey = `health-check:${Date.now()}`;
      await client.set(testKey, 'ok');
      const value = await client.get(testKey);
      await client.del(testKey);
      if (value !== 'ok') {
        throw new Error(`round-trip returned "${value}" instead of "ok"`);
      }
    } catch (err) {
      throw new ServiceUnavailableException(`Redis unreachable: ${(err as Error).message}`);
    }

    return { status: 'ok', db: 'ok', redis: 'ok', timestamp: new Date().toISOString() };
  }
}
