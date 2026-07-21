import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PreAuthGuard } from './guards/pre-auth.guard';

// Split out from AuthModule so feature modules (and AuditModule) can use the
// guards without pulling in AuthModule itself — AuthModule depends on
// AuditModule for audit logging, so AuditModule importing AuthModule back
// would be a circular dependency.
@Module({
  imports: [JwtModule.register({})],
  providers: [JwtAuthGuard, RolesGuard, PreAuthGuard],
  exports: [JwtAuthGuard, RolesGuard, PreAuthGuard, JwtModule],
})
export class AuthGuardsModule {}
