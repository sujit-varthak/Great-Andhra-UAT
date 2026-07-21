import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { RatingsController, PublicRatingsController } from './ratings.controller';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [RatingsController, PublicRatingsController],
  providers: [RatingsService],
})
export class RatingsModule {}
