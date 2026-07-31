import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ArticleImportService } from './article-import.service';

const MAX_XML_BYTES = 100 * 1024 * 1024;

@Controller('articles/import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.EDITOR)
export class ArticleImportController {
  constructor(private readonly importService: ArticleImportService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_XML_BYTES } }))
  preview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.importService.preview(file.buffer);
  }

  @Post('commit')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_XML_BYTES } }))
  commit(@CurrentUser() actor: AccessTokenPayload, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.importService.commit(file.buffer, actor.sub);
  }
}
