import { Controller, Get } from '@nestjs/common';
import { UsaMovieScheduleService } from './usa-movie-schedule.service';

@Controller('public/usa-movie-schedule')
export class PublicUsaMovieScheduleController {
  constructor(private readonly usaMovieScheduleService: UsaMovieScheduleService) {}

  @Get()
  list() {
    return this.usaMovieScheduleService.listActive();
  }
}
