import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/session.types.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { UpdateFolderDto } from './dto/update-folder.dto.js';
import { FoldersService } from './folders.service.js';

@UseGuards(AuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(
    private readonly foldersService: FoldersService,
    private readonly activityService: ActivityService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateFolderDto) {
    const created = await this.foldersService.create(user.id, dto);
    await this.activityService.record(user.id, 'folder.created', 'folder', created.id, created.name);
    return created;
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('parentId') parentId?: string) {
    return this.foldersService.listContents(user.id, parentId ?? null);
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFolderDto) {
    const updated = await this.foldersService.update(user.id, id, dto);
    if (dto.name !== undefined) {
      await this.activityService.record(user.id, 'folder.renamed', 'folder', updated.id, updated.name);
    } else if (dto.parentId !== undefined) {
      await this.activityService.record(user.id, 'folder.moved', 'folder', updated.id, updated.name);
    }
    return updated;
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const removed = await this.foldersService.remove(user.id, id);
    await this.activityService.record(user.id, 'folder.trashed', 'folder', removed.id, removed.name);
  }

  @Post(':id/restore')
  @HttpCode(200)
  async restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const restored = await this.foldersService.restore(user.id, id);
    await this.activityService.record(user.id, 'folder.restored', 'folder', restored.id, restored.name);
  }

  @Delete(':id/permanent')
  async permanentlyDelete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const deleted = await this.foldersService.permanentlyDelete(user.id, id);
    await this.activityService.record(user.id, 'folder.deleted', 'folder', deleted.id, deleted.name);
  }
}
