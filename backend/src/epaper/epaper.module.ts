import { Module } from '@nestjs/common';
import { EpaperService } from './epaper.service';
import { EpaperController } from './epaper.controller';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [EpaperController],
  providers: [EpaperService],
})
export class EpaperModule {}
