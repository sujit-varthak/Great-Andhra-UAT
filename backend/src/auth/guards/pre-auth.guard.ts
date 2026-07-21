import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PreAuthTokenPayload } from '../interfaces/jwt-payload.interface';

/**
 * Guards routes that require a short-lived pre-auth token (2FA setup or 2FA
 * login challenge) rather than a full session — sent as `Authorization: Bearer <token>`.
 */
@Injectable()
export class PreAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header = request.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing pre-auth token');
    }

    try {
      const payload = this.jwtService.verify<PreAuthTokenPayload>(token, {
        secret: process.env.JWT_PREAUTH_SECRET,
      });

      if (payload.purpose !== '2fa-setup' && payload.purpose !== '2fa-login') {
        throw new UnauthorizedException('Invalid pre-auth token');
      }

      request.preAuth = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired pre-auth token');
    }
  }
}
