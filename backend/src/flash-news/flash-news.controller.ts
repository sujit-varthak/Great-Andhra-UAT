import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/interfaces/jwt-payload.interface';
import { FlashNewsService } from './flash-news.service';
import { CreateFlashNewsDto, UpdateFlashNewsDto } from './dto/flash-news.dto';

@Controller('flash-news')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FlashNewsController {
  constructor(private readonly flashNewsService: FlashNewsService) {}

  @Get()
  list() {
    return this.flashNewsService.list();
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateFlashNewsDto) {
    return this.flashNewsService.create(actor.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.MODERATOR)
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFlashNewsDto,
  ) {
    return this.flashNewsService.update(actor.sub, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.flashNewsService.remove(actor.sub, id);
  }
}
