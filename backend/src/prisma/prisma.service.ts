import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

// There was previously zero visibility into query performance - no logging at
// all, so a slow query in production couldn't be distinguished from a slow
// network hop or a cold Redis cache without guessing. This flags anything
// crossing the threshold instead of logging every query (which would be
// mostly noise at real traffic volume).
const SLOW_QUERY_THRESHOLD_MS = 200;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [{ emit: 'event', level: 'query' }],
    });
  }

  async onModuleInit() {
    // Prisma's generated $on() typing doesn't pick up the 'query' event shape
    // through a subclass's own super() call - the cast is standard for this
    // pattern, not a real type hole (the emitted event's shape is fixed by
    // the `log` option above, unaffected by the cast).
    this.$on('query' as never, (event: Prisma.QueryEvent) => {
      if (event.duration >= SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(`Slow query (${event.duration}ms): ${event.query}`);
      }
    });

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
