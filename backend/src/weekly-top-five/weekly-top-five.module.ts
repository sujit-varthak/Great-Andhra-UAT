import { Module } from '@nestjs/common';
import { WeeklyTopFiveService } from './weekly-top-five.service';
import { WeeklyTopFiveController } from './weekly-top-five.controller';
import { PublicWeeklyTopFiveController } from './public-weekly-top-five.controller';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [WeeklyTopFiveController, PublicWeeklyTopFiveController],
  providers: [WeeklyTopFiveService],
  exports: [WeeklyTopFiveService],
})
export class WeeklyTopFiveModule {}
