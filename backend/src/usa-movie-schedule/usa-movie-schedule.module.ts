import { Module } from '@nestjs/common';
import { UsaMovieScheduleService } from './usa-movie-schedule.service';
import { UsaMovieScheduleController } from './usa-movie-schedule.controller';
import { PublicUsaMovieScheduleController } from './public-usa-movie-schedule.controller';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [UsaMovieScheduleController, PublicUsaMovieScheduleController],
  providers: [UsaMovieScheduleService],
  exports: [UsaMovieScheduleService],
})
export class UsaMovieScheduleModule {}
