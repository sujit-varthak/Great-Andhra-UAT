import { Module } from '@nestjs/common';
import { HomepageService } from './homepage.service';
import { PublicHomepageController } from './public-homepage.controller';
import { ArticlesModule } from '../articles/articles.module';
import { UsaMovieScheduleModule } from '../usa-movie-schedule/usa-movie-schedule.module';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [ArticlesModule, UsaMovieScheduleModule, TagsModule],
  controllers: [PublicHomepageController],
  providers: [HomepageService],
})
export class HomepageModule {}
