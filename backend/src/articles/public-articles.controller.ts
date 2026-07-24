import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';

// Unauthenticated read-only endpoints for the public-facing site's content
// feed — the admin panel and its mutating routes stay behind auth (proposal
// §3.3: "admin panel isolated ... least-privilege"), this is the read surface.
@Controller('public/articles')
export class PublicArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  list(
    @Query('categoryId') categoryId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.articlesService.listPublished({
      categoryId,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.articlesService.findPublishedById(id);
  }

  @Post(':id/view')
  incrementView(@Param('id') id: string) {
    return this.articlesService.incrementViewCount(id);
  }
}
