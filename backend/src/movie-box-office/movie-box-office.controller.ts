import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/interfaces/jwt-payload.interface';
import { MovieBoxOfficeService } from './movie-box-office.service';
import {
  CreateMovieBoxOfficeDto,
  ListMovieBoxOfficeQueryDto,
  UpdateMovieBoxOfficeDto,
} from './dto/movie-box-office.dto';

@Controller('movie-box-office')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovieBoxOfficeController {
  constructor(private readonly movieBoxOfficeService: MovieBoxOfficeService) {}

  @Get()
  list(@Query() query: ListMovieBoxOfficeQueryDto) {
    return this.movieBoxOfficeService.list(query.section);
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateMovieBoxOfficeDto) {
    return this.movieBoxOfficeService.create(actor.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMovieBoxOfficeDto,
  ) {
    return this.movieBoxOfficeService.update(actor.sub, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.movieBoxOfficeService.remove(actor.sub, id);
  }
}
