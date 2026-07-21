import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { S3Service } from './s3.service';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [MediaController],
  providers: [MediaService, S3Service],
})
export class MediaModule {}
