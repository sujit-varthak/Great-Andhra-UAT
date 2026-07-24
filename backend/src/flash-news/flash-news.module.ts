import { Module } from '@nestjs/common';
import { FlashNewsService } from './flash-news.service';
import { FlashNewsController } from './flash-news.controller';
import { PublicFlashNewsController } from './public-flash-news.controller';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [FlashNewsController, PublicFlashNewsController],
  providers: [FlashNewsService],
})
export class FlashNewsModule {}
