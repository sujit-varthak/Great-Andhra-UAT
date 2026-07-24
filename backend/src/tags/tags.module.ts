import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { PublicTagsController } from './public-tags.controller';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [TagsController, PublicTagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
