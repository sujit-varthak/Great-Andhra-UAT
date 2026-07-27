import { Module } from '@nestjs/common';
import { HomepageService } from './homepage.service';
import { PublicHomepageController } from './public-homepage.controller';
import { ArticlesModule } from '../articles/articles.module';

@Module({
  imports: [ArticlesModule],
  controllers: [PublicHomepageController],
  providers: [HomepageService],
})
export class HomepageModule {}
