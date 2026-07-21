import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/interfaces/jwt-payload.interface';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Post('invite')
  invite(@CurrentUser() actor: AccessTokenPayload, @Body() dto: InviteUserDto) {
    return this.usersService.invite(actor.sub, dto.email, dto.name, dto.role);
  }

  @Patch(':id/role')
  updateRole(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(actor.sub, id, dto.role);
  }

  @Post(':id/disable')
  disable(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.usersService.disable(actor.sub, id);
  }

  @Post(':id/revoke-sessions')
  revokeSessions(@CurrentUser() actor: AccessTokenPayload, @Param('id') id: string) {
    return this.usersService.revokeSessions(actor.sub, id);
  }
}
