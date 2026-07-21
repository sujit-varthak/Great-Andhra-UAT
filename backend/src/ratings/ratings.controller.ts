import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/interfaces/jwt-payload.interface';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';

// Public: readers submit/read ratings for a published article.
@Controller('public/articles/:articleId/ratings')
export class PublicRatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  rate(@Param('articleId') articleId: string, @Body() dto: CreateRatingDto) {
    return this.ratingsService.rate(articleId, dto);
  }

  @Get('summary')
  summary(@Param('articleId') articleId: string) {
    return this.ratingsService.summary(articleId);
  }
}

// Admin: moderate ratings.
@Controller('ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get('article/:articleId')
  list(@Param('articleId') articleId: string) {
    return this.ratingsService.list(articleId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.ratingsService.remove(actor.sub, id);
  }
}
