import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TotpService } from './totp.service';
import { AuthGuardsModule } from './auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, TotpService],
  exports: [AuthService, AuthGuardsModule],
})
export class AuthModule {}
