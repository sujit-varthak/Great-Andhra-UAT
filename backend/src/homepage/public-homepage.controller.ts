import { Controller, Get } from '@nestjs/common';
import { HomepageService } from './homepage.service';

@Controller('public/homepage')
export class PublicHomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  get() {
    return this.homepageService.getHomepage();
  }
}
