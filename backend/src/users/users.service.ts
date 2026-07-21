import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        totpEnabled: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invite(actorId: string, email: string, name: string, role: Role) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const inviteToken = randomBytes(32).toString('hex');
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        role,
        status: 'INVITED',
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    await this.auditService.record({
      actorId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      after: { email, name, role },
    });

    // In production this token is emailed to the invitee, never returned over
    // an authenticated admin API — surfaced here since this app has no mailer.
    return { userId: user.id, inviteToken };
  }

  async updateRole(actorId: string, userId: string, role: Role) {
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role } });

    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      before: { role: before.role },
      after: { role: updated.role },
    });

    return updated;
  }

  async disable(actorId: string, userId: string) {
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { status: 'DISABLED' } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      before: { status: before.status },
      after: { status: 'DISABLED' },
    });

    return { ok: true };
  }

  async revokeSessions(actorId: string, userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      actorId,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      after: { event: 'sessions_revoked' },
    });

    return { ok: true };
  }
}
