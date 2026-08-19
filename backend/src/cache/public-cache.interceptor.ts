import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisCacheService } from './redis-cache.service';

const CACHE_TTL_SECONDS = 45;
const CACHE_KEY_PREFIX = 'cache:public:';

// Applied globally (see cache.module.ts). Caches every GET under /api/public/*
// by its full path + query string, so distinct query combinations (category,
// page, zone, etc.) get distinct cache entries automatically. Non-GET requests
// (e.g. the POST under public/articles/:id/ratings) and everything outside
// /api/public are passed straight through untouched.
@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  constructor(private readonly cache: RedisCacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();

    if (request.method !== 'GET' || !request.originalUrl?.startsWith('/api/public')) {
      return next.handle();
    }

    const key = CACHE_KEY_PREFIX + request.originalUrl;

    try {
      const cached = await this.cache.get(key);
      if (cached !== null) {
        return of(JSON.parse(cached));
      }
    } catch {
      // Redis unreachable/degraded - fall through to a normal DB-backed
      // response rather than failing the request over a caching problem.
    }

    return next.handle().pipe(
      tap((response) => {
        this.cache.set(key, JSON.stringify(response), CACHE_TTL_SECONDS).catch(() => {
          // A failed cache write must never surface as a failed request -
          // the response has already been sent to the client by this point.
        });
      }),
    );
  }
}
