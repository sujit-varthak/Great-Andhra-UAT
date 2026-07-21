import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/interfaces/jwt-payload.interface';
import { TrendingService } from './trending.service';
import { CreateTrendingDto, UpdateTrendingDto } from './dto/trending.dto';

@Controller('trending')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get()
  list() {
    return this.trendingService.list();
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateTrendingDto) {
    return this.trendingService.create(actor.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTrendingDto,
  ) {
    return this.trendingService.update(actor.sub, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.trendingService.remove(actor.sub, id);
  }
}
