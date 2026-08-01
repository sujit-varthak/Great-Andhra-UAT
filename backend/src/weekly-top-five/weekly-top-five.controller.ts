import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/interfaces/jwt-payload.interface';
import { WeeklyTopFiveService } from './weekly-top-five.service';
import { CreateWeeklyTopFiveDto, UpdateWeeklyTopFiveDto } from './dto/weekly-top-five.dto';

@Controller('weekly-top-five')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WeeklyTopFiveController {
  constructor(private readonly weeklyTopFiveService: WeeklyTopFiveService) {}

  @Get()
  list() {
    return this.weeklyTopFiveService.list();
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateWeeklyTopFiveDto) {
    return this.weeklyTopFiveService.create(actor.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateWeeklyTopFiveDto,
  ) {
    return this.weeklyTopFiveService.update(actor.sub, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.weeklyTopFiveService.remove(actor.sub, id);
  }
}
