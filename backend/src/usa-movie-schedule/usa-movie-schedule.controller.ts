import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/interfaces/jwt-payload.interface';
import { UsaMovieScheduleService } from './usa-movie-schedule.service';
import { CreateUsaMovieScheduleDto, UpdateUsaMovieScheduleDto } from './dto/usa-movie-schedule.dto';

@Controller('usa-movie-schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsaMovieScheduleController {
  constructor(private readonly usaMovieScheduleService: UsaMovieScheduleService) {}

  @Get()
  list() {
    return this.usaMovieScheduleService.list();
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateUsaMovieScheduleDto) {
    return this.usaMovieScheduleService.create(actor.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUsaMovieScheduleDto,
  ) {
    return this.usaMovieScheduleService.update(actor.sub, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.usaMovieScheduleService.remove(actor.sub, id);
  }
}
