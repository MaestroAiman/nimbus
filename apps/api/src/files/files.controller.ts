import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ActivityService } from '../activity/activity.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/session.types.js';
import { UpdateFileDto } from './dto/update-file.dto.js';
import { FilesService } from './files.service.js';

@UseGuards(AuthGuard)
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly activityService: ActivityService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId?: string,
  ) {
    const created = await this.filesService.create(user.id, file, folderId ?? null);
    await this.activityService.record(user.id, 'file.created', 'file', created.id, created.name);
    return created;
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.filesService.getDownloadStream(user.id, id);

    response.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
      'Content-Length': file.sizeBytes.toString(),
    });

    return new StreamableFile(stream);
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFileDto) {
    const updated = await this.filesService.update(user.id, id, dto);
    if (dto.name !== undefined) {
      await this.activityService.record(user.id, 'file.renamed', 'file', updated.id, updated.name);
    } else if (dto.folderId !== undefined) {
      await this.activityService.record(user.id, 'file.moved', 'file', updated.id, updated.name);
    }
    return updated;
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const removed = await this.filesService.remove(user.id, id);
    await this.activityService.record(user.id, 'file.trashed', 'file', removed.id, removed.name);
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const restored = await this.filesService.restore(user.id, id);
    await this.activityService.record(user.id, 'file.restored', 'file', restored.id, restored.name);
  }

  @Delete(':id/permanent')
  async permanentlyDelete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const deleted = await this.filesService.permanentlyDelete(user.id, id);
    await this.activityService.record(user.id, 'file.deleted', 'file', deleted.id, deleted.name);
  }
}
