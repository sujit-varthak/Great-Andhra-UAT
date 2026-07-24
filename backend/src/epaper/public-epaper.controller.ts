import { Controller, Get, Query } from '@nestjs/common';
import { EpaperService } from './epaper.service';

@Controller('public/epaper')
export class PublicEpaperController {
  constructor(private readonly epaperService: EpaperService) {}

  @Get()
  list(@Query('editionDate') editionDate?: string) {
    return this.epaperService.list(editionDate);
  }
}
