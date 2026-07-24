import { Controller, Get } from '@nestjs/common';
import { TagsService } from './tags.service';

@Controller('public/tags')
export class PublicTagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list() {
    return this.tagsService.list();
  }
}
