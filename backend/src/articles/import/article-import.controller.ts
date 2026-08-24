import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import * as os from 'os';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenPayload } from '../../auth/interfaces/jwt-payload.interface';
import { ArticleImportService } from './article-import.service';

const MAX_XML_BYTES = 100 * 1024 * 1024;

// Written to disk as it's received instead of buffered in memory
// (`memoryStorage()`) - the parser streams it back off disk too (see
// xml-stream-parser.ts), so at no point is a whole large export file held
// in RAM. This is what actually fixed the OOM crashes this endpoint used to
// have on files in the tens of MB range.
const uploadStorage = diskStorage({
  destination: os.tmpdir(),
  filename: (_req, _file, cb) => cb(null, `xml-import-${randomUUID()}.xml`),
});

@Controller('articles/import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.EDITOR)
export class ArticleImportController {
  constructor(private readonly importService: ArticleImportService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage, limits: { fileSize: MAX_XML_BYTES } }))
  async preview(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    try {
      return await this.importService.preview(file.path);
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  @Post('commit')
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage, limits: { fileSize: MAX_XML_BYTES } }))
  async commit(@CurrentUser() actor: AccessTokenPayload, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    try {
      return await this.importService.commit(file.path, actor.sub);
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }
}
