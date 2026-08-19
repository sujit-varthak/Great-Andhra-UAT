import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const SCHEDULED_PUBLISHING_QUEUE = 'scheduled-publishing';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
          username: process.env.REDIS_USERNAME || undefined,
          password: process.env.REDIS_PASSWORD || undefined,
          // Managed Redis/Valkey (e.g. DO's) requires TLS; local dev Redis doesn't
          // speak TLS at all, so this is opt-in via REDIS_TLS rather than assumed.
          tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        },
      }),
    }),
    BullModule.registerQueue({ name: SCHEDULED_PUBLISHING_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
