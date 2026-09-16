import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE_DB } from '../database/database.provider.js';
import type { Database } from '../db/client.js';
import { files, folders } from '../db/schema/index.js';
import type { CreateFolderDto } from './dto/create-folder.dto.js';
import type { UpdateFolderDto } from './dto/update-folder.dto.js';

@Injectable()
export class FoldersService {
  private readonly logger = new Logger(FoldersService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    private readonly config: ConfigService,
  ) {}

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
        .where(and(eq(folders.ownerId, ownerId), parentFolderCondition, isNull(folders.deletedAt))),
      this.db
        .select()
        .from(files)
        .where(and(eq(files.ownerId, ownerId), parentFileCondition, isNull(files.deletedAt))),
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
        ...(dto.isFavorite !== undefined ? { isFavorite: dto.isFavorite } : {}),
        updatedAt: new Date(),
      })
      .where(eq(folders.id, id))
      .returning();

    return updated;
  }

  /** Met le dossier (et tout son contenu, recursivement) a la corbeille. Reversible via restore(). */
  async remove(ownerId: string, id: string): Promise<void> {
    await this.getOwnedFolder(ownerId, id);

    const folderIds = await this.collectFolderSubtreeIds(ownerId, id);
    const now = new Date();

    await this.db
      .update(folders)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(folders.ownerId, ownerId), inArray(folders.id, folderIds)));
    await this.db
      .update(files)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(files.ownerId, ownerId), inArray(files.folderId, folderIds)));
  }

  /** Restaure le dossier et tout son contenu (meme sous-arbre que remove()). */
  async restore(ownerId: string, id: string): Promise<void> {
    await this.getOwnedFolder(ownerId, id, { includeTrashed: true });

    const folderIds = await this.collectFolderSubtreeIds(ownerId, id);
    const now = new Date();

    await this.db
      .update(folders)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(eq(folders.ownerId, ownerId), inArray(folders.id, folderIds)));
    await this.db
      .update(files)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(eq(files.ownerId, ownerId), inArray(files.folderId, folderIds)));
  }

  /** Suppression definitive du dossier et de tout son contenu : lignes DB + fichiers physiques. Irreversible. */
  async permanentlyDelete(ownerId: string, id: string): Promise<void> {
    await this.getOwnedFolder(ownerId, id, { includeTrashed: true });

    const folderIds = await this.collectFolderSubtreeIds(ownerId, id);
    const filesToDelete = await this.db
      .select()
      .from(files)
      .where(and(eq(files.ownerId, ownerId), inArray(files.folderId, folderIds)));
    const storagePath = this.config.getOrThrow<string>('STORAGE_PATH');

    // Le FK folders.parentId (onDelete: cascade) et files.folderId (onDelete: cascade)
    // se chargent de supprimer tout le sous-arbre en base a partir de la seule racine.
    await this.db.delete(folders).where(eq(folders.id, id));

    await Promise.all(
      filesToDelete.map(async (file) => {
        try {
          await unlink(join(storagePath, file.diskPath));
        } catch (error) {
          this.logger.warn(`Impossible de supprimer le fichier physique ${file.diskPath} : ${String(error)}`);
        }
      }),
    );
  }

  async getOwnedFolder(ownerId: string, id: string, options?: { includeTrashed?: boolean }) {
    const condition = options?.includeTrashed
      ? and(eq(folders.id, id), eq(folders.ownerId, ownerId))
      : and(eq(folders.id, id), eq(folders.ownerId, ownerId), isNull(folders.deletedAt));

    const [folder] = await this.db.select().from(folders).where(condition);

    if (!folder) {
      throw new NotFoundException('Dossier introuvable');
    }

    return folder;
  }

  /** Parcourt l'arborescence (peu importe l'etat de corbeille) et retourne id racine + tous ses descendants. */
  private async collectFolderSubtreeIds(ownerId: string, rootId: string): Promise<string[]> {
    const ids = [rootId];
    let frontier = [rootId];

    while (frontier.length > 0) {
      const children = await this.db
        .select({ id: folders.id })
        .from(folders)
        .where(and(eq(folders.ownerId, ownerId), inArray(folders.parentId, frontier)));

      if (children.length === 0) break;

      const childIds = children.map((child) => child.id);
      ids.push(...childIds);
      frontier = childIds;
    }

    return ids;
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
