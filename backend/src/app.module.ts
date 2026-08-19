import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { ArticlesModule } from './articles/articles.module';
import { FlashNewsModule } from './flash-news/flash-news.module';
import { TrendingModule } from './trending/trending.module';
import { UsaMovieScheduleModule } from './usa-movie-schedule/usa-movie-schedule.module';
import { WeeklyTopFiveModule } from './weekly-top-five/weekly-top-five.module';
import { MovieBoxOfficeModule } from './movie-box-office/movie-box-office.module';
import { DontMissModule } from './dont-miss/dont-miss.module';
import { EpaperModule } from './epaper/epaper.module';
import { RatingsModule } from './ratings/ratings.module';
import { MediaModule } from './media/media.module';
import { SearchModule } from './search/search.module';
import { HomepageModule } from './homepage/homepage.module';
import { AdvertisementsModule } from './advertisements/advertisements.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    TagsModule,
    ArticlesModule,
    FlashNewsModule,
    TrendingModule,
    UsaMovieScheduleModule,
    WeeklyTopFiveModule,
    MovieBoxOfficeModule,
    DontMissModule,
    EpaperModule,
    RatingsModule,
    MediaModule,
    SearchModule,
    HomepageModule,
    AdvertisementsModule,
    CacheModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
