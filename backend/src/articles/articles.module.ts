import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { PublicArticlesController } from './public-articles.controller';
import { PublishProcessor } from './publish.processor';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AuthGuardsModule, AuditModule, QueueModule],
  controllers: [ArticlesController, PublicArticlesController],
  providers: [ArticlesService, PublishProcessor],
  exports: [ArticlesService],
})
export class ArticlesModule {}
