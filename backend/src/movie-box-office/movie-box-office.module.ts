import { Module } from '@nestjs/common';
import { MovieBoxOfficeService } from './movie-box-office.service';
import { MovieBoxOfficeController } from './movie-box-office.controller';
import { PublicMovieBoxOfficeController } from './public-movie-box-office.controller';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [MovieBoxOfficeController, PublicMovieBoxOfficeController],
  providers: [MovieBoxOfficeService],
  exports: [MovieBoxOfficeService],
})
export class MovieBoxOfficeModule {}
