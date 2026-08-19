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

  // Liveness check - what DO's health probe (and any autoscaling/restart
  // decision) should hit. Deliberately does zero I/O: proves only that the
  // Node process is up and answering HTTP, nothing about DB/Redis. A probe
  // used for scale/restart decisions must never depend on external services -
  // a slow/cold DB or Redis connection previously made this endpoint take up
  // to ~15s (seen in DO's own P95 metrics), which is exactly the kind of thing
  // that gets a perfectly fine instance killed and replaced.
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // Deep/diagnostic check - for manual verification only (curl this by hand
  // when debugging), never wired to DO's automated health probe. This is the
  // original /api/health behavior, moved here so it can no longer influence
  // scaling/restart decisions.
  @Get('diagnostics')
  async diagnostics() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }

    // Exercises the real BullMQ/ioredis connection with an actual SET/GET/DEL
    // round trip - proves Redis is reachable AND writable/readable with whatever
    // host/username/password/TLS config is actually configured, not just that a
    // plain socket opens (which a bare ping() wouldn't rule out auth/permission
    // issues on either the SET or GET side). Bounded with a timeout because a
    // misconfigured host/port/TLS/firewall typically hangs the TCP handshake
    // rather than rejecting fast - an unbounded await here would hang the whole
    // health check (and anything waiting on it) indefinitely.
    try {
      await Promise.race([
        (async () => {
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
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timed out after 5s - check host/port/TLS/firewall')), 5000),
        ),
      ]);
    } catch (err) {
      throw new ServiceUnavailableException(`Redis unreachable: ${(err as Error).message}`);
    }

    return { status: 'ok', db: 'ok', redis: 'ok', timestamp: new Date().toISOString() };
  }
}
