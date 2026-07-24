import { Controller, Get } from '@nestjs/common';
import { FlashNewsService } from './flash-news.service';

@Controller('public/flash-news')
export class PublicFlashNewsController {
  constructor(private readonly flashNewsService: FlashNewsService) {}

  @Get()
  list() {
    return this.flashNewsService.listActive();
  }
}
