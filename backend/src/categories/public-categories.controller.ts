import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('public/categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list() {
    return this.categoriesService.list();
  }
}
