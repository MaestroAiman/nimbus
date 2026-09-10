import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/session.types.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { UpdateFolderDto } from './dto/update-folder.dto.js';
import { FoldersService } from './folders.service.js';

@UseGuards(AuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('parentId') parentId?: string) {
    return this.foldersService.listContents(user.id, parentId ?? null);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFolderDto) {
    return this.foldersService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.foldersService.remove(user.id, id);
  }
}
