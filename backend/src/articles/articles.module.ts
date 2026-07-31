import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { PublicArticlesController } from './public-articles.controller';
import { PublishProcessor } from './publish.processor';
import { ArticleImportService } from './import/article-import.service';
import { ArticleImportController } from './import/article-import.controller';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [AuthGuardsModule, AuditModule, QueueModule, MediaModule],
  controllers: [ArticlesController, PublicArticlesController, ArticleImportController],
  providers: [ArticlesService, PublishProcessor, ArticleImportService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
