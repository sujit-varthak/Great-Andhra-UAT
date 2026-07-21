import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  purpose: 'session';
}

export interface PreAuthTokenPayload {
  sub: string;
  purpose: '2fa-setup' | '2fa-login';
}

export type AnyTokenPayload = AccessTokenPayload | PreAuthTokenPayload;
