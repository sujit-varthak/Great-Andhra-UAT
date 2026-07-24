import { Module } from '@nestjs/common';
import { DontMissService } from './dont-miss.service';
import { DontMissController } from './dont-miss.controller';
import { PublicDontMissController } from './public-dont-miss.controller';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthGuardsModule, AuditModule],
  controllers: [DontMissController, PublicDontMissController],
  providers: [DontMissService],
})
export class DontMissModule {}
