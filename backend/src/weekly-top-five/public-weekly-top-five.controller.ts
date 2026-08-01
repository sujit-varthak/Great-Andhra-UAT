import { Controller, Get } from '@nestjs/common';
import { WeeklyTopFiveService } from './weekly-top-five.service';

@Controller('public/weekly-top-five')
export class PublicWeeklyTopFiveController {
  constructor(private readonly weeklyTopFiveService: WeeklyTopFiveService) {}

  @Get()
  list() {
    return this.weeklyTopFiveService.listActive();
  }
}
