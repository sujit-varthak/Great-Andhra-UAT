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
        },
      }),
    }),
    BullModule.registerQueue({ name: SCHEDULED_PUBLISHING_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
