import { Module } from '@nestjs/common';
import { HomepageService } from './homepage.service';
import { PublicHomepageController } from './public-homepage.controller';
import { ArticlesModule } from '../articles/articles.module';
import { UsaMovieScheduleModule } from '../usa-movie-schedule/usa-movie-schedule.module';

@Module({
  imports: [ArticlesModule, UsaMovieScheduleModule],
  controllers: [PublicHomepageController],
  providers: [HomepageService],
})
export class HomepageModule {}
