import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('public/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') q = '', @Query('take') take?: string) {
    return this.searchService.search(q, take ? Number(take) : undefined);
  }
}
