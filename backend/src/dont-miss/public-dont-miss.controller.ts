import { Controller, Get } from '@nestjs/common';
import { DontMissService } from './dont-miss.service';

@Controller('public/dont-miss')
export class PublicDontMissController {
  constructor(private readonly dontMissService: DontMissService) {}

  @Get()
  list() {
    return this.dontMissService.listActive();
  }
}
