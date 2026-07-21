import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/interfaces/jwt-payload.interface';
import { EpaperService } from './epaper.service';
import { CreateEpaperImageDto } from './dto/epaper.dto';

@Controller('epaper')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EpaperController {
  constructor(private readonly epaperService: EpaperService) {}

  @Get()
  list(@Query('editionDate') editionDate?: string) {
    return this.epaperService.list(editionDate);
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateEpaperImageDto) {
    return this.epaperService.create(actor.sub, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.epaperService.remove(actor.sub, id);
  }
}
