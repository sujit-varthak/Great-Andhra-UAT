import { Controller, Get, ParseEnumPipe, Query } from '@nestjs/common';
import { MovieBoxOfficeSection } from '@prisma/client';
import { MovieBoxOfficeService } from './movie-box-office.service';

@Controller('public/movie-box-office')
export class PublicMovieBoxOfficeController {
  constructor(private readonly movieBoxOfficeService: MovieBoxOfficeService) {}

  @Get()
  list(@Query('section', new ParseEnumPipe(MovieBoxOfficeSection)) section: MovieBoxOfficeSection) {
    return this.movieBoxOfficeService.listActive(section);
  }
}
