import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdvertisementsService } from './advertisements.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdZone } from '@prisma/client';

@Controller('advertisements')
export class AdvertisementsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  // Admin endpoints
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  create(@Body() dto: CreateAdvertisementDto, @CurrentUser() user: AccessTokenPayload) {
    return this.advertisementsService.create(dto, user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  findAll(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '10',
    @Query('zone') zone?: string,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
  ) {
    return this.advertisementsService.findAll(
      parseInt(skip),
      parseInt(take),
      zone,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      type,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  findById(@Param('id') id: string) {
    return this.advertisementsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdvertisementDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.advertisementsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  delete(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.advertisementsService.delete(id, user.sub);
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  bulkDelete(@Body() body: { ids: string[] }, @CurrentUser() user: AccessTokenPayload) {
    return this.advertisementsService.bulkDelete(body.ids, user.sub);
  }

  @Patch('bulk-update-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'EDITOR')
  bulkUpdateActive(
    @Body() body: { ids: string[]; isActive: boolean },
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.advertisementsService.bulkUpdateActive(body.ids, body.isActive, user.sub);
  }
}

@Controller('public/advertisements')
export class PublicAdvertisementsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Get(':zone')
  async getByZone(
    @Param('zone') zone: AdZone,
    @Query('isDesktop') isDesktop: string = 'true',
  ) {
    const isDeskTop = isDesktop === 'true';
    const ad = await this.advertisementsService.findActiveByZone(zone, isDeskTop);
    return ad || {};
  }

  @Get('roadblock/active')
  async getRoadblock(@Query('isDesktop') isDesktop: string = 'true') {
    const isDeskTop = isDesktop === 'true';
    const ad = await this.advertisementsService.findActiveRoadblock(isDeskTop);
    return ad || {};
  }
}
