import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RedisCacheService } from './redis-cache.service';
import { PublicCacheInterceptor } from './public-cache.interceptor';

@Module({
  providers: [
    RedisCacheService,
    { provide: APP_INTERCEPTOR, useClass: PublicCacheInterceptor },
  ],
  exports: [RedisCacheService],
})
export class CacheModule {}
