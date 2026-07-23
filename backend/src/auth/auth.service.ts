import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TotpService } from './totp.service';
import { AccessTokenPayload, PreAuthTokenPayload } from './interfaces/jwt-payload.interface';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL = '15m';
const PREAUTH_TOKEN_TTL = '10m';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenTtlMs: number;
  refreshTokenTtlMs: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly totpService: TotpService,
    private readonly auditService: AuditService,
  ) {}

  private signAccessToken(payload: Omit<AccessTokenPayload, 'purpose'>): string {
    return this.jwtService.sign(
      { ...payload, purpose: 'session' },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  private signPreAuthToken(payload: PreAuthTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_PREAUTH_SECRET,
      expiresIn: PREAUTH_TOKEN_TTL,
    });
  }

  private async issueSession(userId: string): Promise<SessionTokens> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const accessToken = this.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      accessTokenTtlMs: 15 * 60 * 1000,
      refreshTokenTtlMs: REFRESH_TOKEN_TTL_MS,
    };
  }

  async acceptInvite(inviteToken: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { inviteToken } });

    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invite link is invalid or has expired');
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });

    await this.auditService.record({
      actorId: user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      after: { status: 'ACTIVE', event: 'invite_accepted' },
    });

    // 2FA temporarily disabled for demo purposes — restore this block (and
    // remove the issueSession call below) to make 2FA enrollment mandatory
    // before first login again.
    // const preAuthToken = this.signPreAuthToken({ sub: user.id, purpose: '2fa-setup' });
    // return { preAuthToken };

    const tokens = await this.issueSession(user.id);
    return { ...tokens, userId: user.id };
  }

  async beginTotpSetup(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = user.totpSecret ?? this.totpService.generateSecret();
    if (!user.totpSecret) {
      await this.prisma.user.update({ where: { id: userId }, data: { totpSecret: secret } });
    }

    const qrCodeDataUrl = await this.totpService.generateQrCodeDataUrl(user.email, secret);
    return { qrCodeDataUrl, secret };
  }

  async confirmTotpSetup(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.totpSecret) {
      throw new BadRequestException('2FA setup has not been started');
    }

    if (!this.totpService.verify(code, user.totpSecret)) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    await this.auditService.record({
      actorId: userId,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      after: { event: '2fa_enabled' },
    });

    return this.issueSession(userId);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Constant-shape response whether the account exists or not.
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Account locked until ${user.lockedUntil.toISOString()} due to repeated failed logins`,
      );
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockedUntil =
        failedLoginCount >= LOCKOUT_THRESHOLD ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount, lockedUntil },
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is not active');
    }

    // 2FA temporarily disabled for demo purposes — restore this block (and
    // remove the issueSession call below) to require TOTP again at login.
    // if (!user.totpEnabled) {
    //   // Safety net: an active account must have completed 2FA enrollment.
    //   const preAuthToken = this.signPreAuthToken({ sub: user.id, purpose: '2fa-setup' });
    //   return { requiresTwoFactorSetup: true, preAuthToken };
    // }
    // const preAuthToken = this.signPreAuthToken({ sub: user.id, purpose: '2fa-login' });
    // return { requiresTwoFactor: true, preAuthToken };

    const tokens = await this.issueSession(user.id);
    return { ...tokens, userId: user.id };
  }

  async completeTwoFactorLogin(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.totpEnabled || !user.totpSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled for this account');
    }

    if (!this.totpService.verify(code, user.totpSecret)) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    await this.auditService.record({
      actorId: userId,
      action: 'UPDATE',
      entity: 'User',
      entityId: userId,
      after: { event: 'login_success' },
    });

    return this.issueSession(userId);
  }

  async refresh(rawRefreshToken: string): Promise<SessionTokens> {
    const tokenHash = hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const rawNewToken = randomBytes(48).toString('hex');
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date(), replacedBy: hashToken(rawNewToken) },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: hashToken(rawNewToken),
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: existing.userId } });
    const accessToken = this.signAccessToken({ sub: user.id, email: user.email, role: user.role });

    return {
      accessToken,
      refreshToken: rawNewToken,
      accessTokenTtlMs: 15 * 60 * 1000,
      refreshTokenTtlMs: REFRESH_TOKEN_TTL_MS,
    };
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, totpEnabled: true, lastLoginAt: true },
    });
    return user;
  }
}
