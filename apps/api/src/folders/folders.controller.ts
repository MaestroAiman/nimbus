import { join } from 'node:path';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZipArchive } from 'archiver';
import type { Response } from 'express';
import { ActivityService } from '../activity/activity.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/session.types.js';
import { buildContentDisposition } from '../common/content-disposition.js';
import { CreateFolderTreeDto } from './dto/create-folder-tree.dto.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { UpdateFolderDto } from './dto/update-folder.dto.js';
import { FoldersService } from './folders.service.js';

@UseGuards(AuthGuard)
@Controller('folders')
export class FoldersController {
  private readonly logger = new Logger(FoldersController.name);

  constructor(
    private readonly foldersService: FoldersService,
    private readonly activityService: ActivityService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateFolderDto) {
    const created = await this.foldersService.create(user.id, dto);
    await this.activityService.record(user.id, 'folder.created', 'folder', created.id, created.name);
    return created;
  }

  // Envoi d'un dossier : un seul evenement d'activite pour la racine (les fichiers sont envoyes
  // ensuite avec `silent`), sinon le fil de notifications serait noye par l'envoi.
  @Post('tree')
  async createTree(@CurrentUser() user: AuthUser, @Body() dto: CreateFolderTreeDto) {
    const created = await this.foldersService.createTree(user.id, dto);
    await this.activityService.record(user.id, 'folder.created', 'folder', created.root.id, created.root.name);
    return created;
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { folder, directories, files } = await this.foldersService.getDownloadEntries(user.id, id);
    const storagePath = this.config.getOrThrow<string>('STORAGE_PATH');

    // Niveau 1 : les fichiers sont deja en majorite compresses (images, videos, archives),
    // inutile de faire chauffer le CPU du serveur pour quelques octets gagnes.
    const archive = new ZipArchive({ zlib: { level: 1 } });

    // Un blob manquant sur le disque n'interrompt pas l'archive : l'entree est simplement absente.
    archive.on('warning', (warning) => this.logger.warn(`ZIP du dossier ${id} : ${warning.message}`));
    archive.on('error', (error) => this.logger.error(`ZIP du dossier ${id} : ${error.message}`));
    // Le client a annule le telechargement : on arrete de lire le disque.
    response.once('close', () => {
      if (!response.writableFinished) archive.abort();
    });

    for (const directory of directories) {
      archive.append('', { name: directory });
    }
    for (const file of files) {
      archive.file(join(storagePath, file.diskPath), { name: file.entryName });
    }
    archive.finalize().catch((error: unknown) => this.logger.error(`ZIP du dossier ${id} : ${String(error)}`));

    response.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': buildContentDisposition(`${folder.name}.zip`),
      // Taille inconnue (archive generee a la volee) : pas de Content-Length. Nginx ne doit pas
      // mettre le flux en tampon sur disque avant de l'envoyer au client.
      'X-Accel-Buffering': 'no',
    });

    return new StreamableFile(archive);
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
