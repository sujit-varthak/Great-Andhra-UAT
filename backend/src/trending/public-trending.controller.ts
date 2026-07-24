import { Controller, Get } from '@nestjs/common';
import { TrendingService } from './trending.service';

@Controller('public/trending')
export class PublicTrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get()
  list() {
    return this.trendingService.listActive();
  }
}
