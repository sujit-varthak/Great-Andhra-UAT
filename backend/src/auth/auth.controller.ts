import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService, SessionTokens } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PreAuthGuard } from './guards/pre-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AccessTokenPayload, PreAuthTokenPayload } from './interfaces/jwt-payload.interface';

const isProd = process.env.NODE_ENV === 'production';

function setSessionCookies(res: Response, tokens: SessionTokens) {
  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: tokens.accessTokenTtlMs,
    path: '/',
  });
  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: tokens.refreshTokenTtlMs,
    path: '/api/auth',
  });
}

function clearSessionCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto.inviteToken, dto.password);
  }

  @UseGuards(PreAuthGuard)
  @Post('2fa/setup')
  beginTotpSetup(@Req() req: Request) {
    const preAuth: PreAuthTokenPayload = (req as any).preAuth;
    return this.authService.beginTotpSetup(preAuth.sub);
  }

  @UseGuards(PreAuthGuard)
  @Post('2fa/confirm')
  async confirmTotpSetup(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: VerifyCodeDto,
  ) {
    const preAuth: PreAuthTokenPayload = (req as any).preAuth;
    if (preAuth.purpose !== '2fa-setup') {
      throw new UnauthorizedException('Invalid pre-auth token for this action');
    }
    const tokens = await this.authService.confirmTotpSetup(preAuth.sub, dto.code);
    setSessionCookies(res, tokens);
    return this.authService.me(preAuth.sub);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(PreAuthGuard)
  @Post('login/2fa')
  async completeTwoFactorLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: VerifyCodeDto,
  ) {
    const preAuth: PreAuthTokenPayload = (req as any).preAuth;
    if (preAuth.purpose !== '2fa-login') {
      throw new UnauthorizedException('Invalid pre-auth token for this action');
    }
    const tokens = await this.authService.completeTwoFactorLogin(preAuth.sub, dto.code);
    setSessionCookies(res, tokens);
    return this.authService.me(preAuth.sub);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.['refresh_token'];
    if (!rawRefreshToken) {
      throw new UnauthorizedException('No refresh token present');
    }
    const tokens = await this.authService.refresh(rawRefreshToken);
    setSessionCookies(res, tokens);
    return { ok: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.['refresh_token']);
    clearSessionCookies(res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.authService.me(user.sub);
  }
}
