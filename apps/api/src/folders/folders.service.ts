import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE_DB } from '../database/database.provider.js';
import type { Database } from '../db/client.js';
import { files, folders } from '../db/schema/index.js';
import type { CreateFolderDto } from './dto/create-folder.dto.js';
import type { UpdateFolderDto } from './dto/update-folder.dto.js';

@Injectable()
export class FoldersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async create(ownerId: string, dto: CreateFolderDto) {
    if (dto.parentId) {
      await this.getOwnedFolder(ownerId, dto.parentId);
    }

    const [folder] = await this.db
      .insert(folders)
      .values({ id: createId(), name: dto.name, ownerId, parentId: dto.parentId ?? null })
      .returning();

    return folder;
  }

  async listContents(ownerId: string, parentId: string | null) {
    if (parentId) {
      await this.getOwnedFolder(ownerId, parentId);
    }

    const parentFolderCondition = parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId);
    const parentFileCondition = parentId ? eq(files.folderId, parentId) : isNull(files.folderId);

    const [subfolders, folderFiles] = await Promise.all([
      this.db
        .select()
        .from(folders)
        .where(and(eq(folders.ownerId, ownerId), parentFolderCondition)),
      this.db
        .select()
        .from(files)
        .where(and(eq(files.ownerId, ownerId), parentFileCondition)),
    ]);

    return { folders: subfolders, files: folderFiles };
  }

  async update(ownerId: string, id: string, dto: UpdateFolderDto) {
    const folder = await this.getOwnedFolder(ownerId, id);

    if (dto.parentId !== undefined && dto.parentId !== folder.parentId && dto.parentId !== null) {
      await this.getOwnedFolder(ownerId, dto.parentId);
      await this.assertNoCycle(ownerId, id, dto.parentId);
    }

    const [updated] = await this.db
      .update(folders)
      .set({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(folders.id, id))
      .returning();

    return updated;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.getOwnedFolder(ownerId, id);
    await this.db.delete(folders).where(eq(folders.id, id));
  }

  async getOwnedFolder(ownerId: string, id: string) {
    const [folder] = await this.db
      .select()
      .from(folders)
      .where(and(eq(folders.id, id), eq(folders.ownerId, ownerId)));

    if (!folder) {
      throw new NotFoundException('Dossier introuvable');
    }

    return folder;
  }

  private async assertNoCycle(ownerId: string, movingFolderId: string, newParentId: string): Promise<void> {
    let currentId: string | null = newParentId;

    while (currentId !== null) {
      if (currentId === movingFolderId) {
        throw new BadRequestException("Impossible de deplacer un dossier dans lui-meme ou l'un de ses sous-dossiers");
      }

      const [parent] = await this.db
        .select()
        .from(folders)
        .where(and(eq(folders.id, currentId), eq(folders.ownerId, ownerId)));

      currentId = parent?.parentId ?? null;
    }
  }
}
