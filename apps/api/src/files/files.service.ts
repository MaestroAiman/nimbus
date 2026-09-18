import { createReadStream, existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE_DB } from '../database/database.provider.js';
import type { Database } from '../db/client.js';
import { files } from '../db/schema/index.js';
import { FoldersService } from '../folders/folders.service.js';
import type { UpdateFileDto } from './dto/update-file.dto.js';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    private readonly config: ConfigService,
    private readonly foldersService: FoldersService,
  ) {}

  async create(ownerId: string, file: Express.Multer.File, folderId: string | null) {
    if (folderId) {
      await this.foldersService.getOwnedFolder(ownerId, folderId);
    }

    const [created] = await this.db
      .insert(files)
      .values({
        id: createId(),
        name: file.originalname,
        ownerId,
        folderId,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        diskPath: file.filename,
      })
      .returning();

    return created;
  }

  async getDownloadStream(ownerId: string, id: string) {
    const file = await this.getOwnedFile(ownerId, id);
    const absolutePath = join(this.config.getOrThrow<string>('STORAGE_PATH'), file.diskPath);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Fichier physique introuvable sur le disque');
    }

    return { file, stream: createReadStream(absolutePath) };
  }

  async update(ownerId: string, id: string, dto: UpdateFileDto) {
    await this.getOwnedFile(ownerId, id);

    if (dto.folderId !== undefined && dto.folderId !== null) {
      await this.foldersService.getOwnedFolder(ownerId, dto.folderId);
    }

    const [updated] = await this.db
      .update(files)
      .set({
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.folderId !== undefined ? { folderId: dto.folderId } : {}),
        ...(dto.isFavorite !== undefined ? { isFavorite: dto.isFavorite } : {}),
        updatedAt: new Date(),
      })
      .where(eq(files.id, id))
      .returning();

    return updated;
  }

  /** Met le fichier a la corbeille (suppression reversible, voir TrashService pour la purge automatique). */
  async remove(ownerId: string, id: string) {
    await this.getOwnedFile(ownerId, id);

    const [updated] = await this.db
      .update(files)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning({ id: files.id, name: files.name });

    return updated;
  }

  async restore(ownerId: string, id: string) {
    await this.getOwnedFile(ownerId, id, { includeTrashed: true });

    const [updated] = await this.db
      .update(files)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning({ id: files.id, name: files.name });

    return updated;
  }

  /** Suppression definitive : ligne DB + fichier physique. Irreversible. */
  async permanentlyDelete(ownerId: string, id: string) {
    const file = await this.getOwnedFile(ownerId, id, { includeTrashed: true });
    const absolutePath = join(this.config.getOrThrow<string>('STORAGE_PATH'), file.diskPath);

    await this.db.delete(files).where(eq(files.id, id));

    try {
      await unlink(absolutePath);
    } catch (error) {
      this.logger.warn(`Impossible de supprimer le fichier physique ${file.diskPath} : ${String(error)}`);
    }

    return { id: file.id, name: file.name };
  }

  async getOwnedFile(ownerId: string, id: string, options?: { includeTrashed?: boolean }) {
    const condition = options?.includeTrashed
      ? and(eq(files.id, id), eq(files.ownerId, ownerId))
      : and(eq(files.id, id), eq(files.ownerId, ownerId), isNull(files.deletedAt));

    const [file] = await this.db.select().from(files).where(condition);

    if (!file) {
      throw new NotFoundException('Fichier introuvable');
    }

    return file;
  }
}
