import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { DRIZZLE_DB } from '../database/database.provider.js';
import type { Database } from '../db/client.js';
import { files, folders } from '../db/schema/index.js';
import { FilesService } from '../files/files.service.js';
import { FoldersService } from '../folders/folders.service.js';

const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class TrashService {
  private readonly logger = new Logger(TrashService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    private readonly filesService: FilesService,
    private readonly foldersService: FoldersService,
  ) {}

  /** Liste les racines des sous-arbres en corbeille (pas les descendants deja couverts par leur parent). */
  async listRoots(ownerId: string) {
    const [trashedFolders, trashedFiles] = await Promise.all([
      this.db
        .select()
        .from(folders)
        .where(and(eq(folders.ownerId, ownerId), isNotNull(folders.deletedAt))),
      this.db
        .select()
        .from(files)
        .where(and(eq(files.ownerId, ownerId), isNotNull(files.deletedAt))),
    ]);

    const trashedFolderIds = new Set(trashedFolders.map((folder) => folder.id));

    return {
      folders: trashedFolders.filter((folder) => !folder.parentId || !trashedFolderIds.has(folder.parentId)),
      files: trashedFiles.filter((file) => !file.folderId || !trashedFolderIds.has(file.folderId)),
    };
  }

  /** Purge definitivement tout element en corbeille depuis plus de 7 jours (toutes les utilisateurs). */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpired(): Promise<void> {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);

    const [expiredFolders, expiredFiles] = await Promise.all([
      this.db
        .select()
        .from(folders)
        .where(and(isNotNull(folders.deletedAt), lt(folders.deletedAt, cutoff))),
      this.db
        .select()
        .from(files)
        .where(and(isNotNull(files.deletedAt), lt(files.deletedAt, cutoff))),
    ]);

    const expiredFolderIds = new Set(expiredFolders.map((folder) => folder.id));
    // Ne purger que les racines : un descendant est supprime en cascade avec son ancetre
    // (voir FoldersService.permanentlyDelete).
    const rootExpiredFolders = expiredFolders.filter(
      (folder) => !folder.parentId || !expiredFolderIds.has(folder.parentId),
    );
    const rootExpiredFiles = expiredFiles.filter((file) => !file.folderId || !expiredFolderIds.has(file.folderId));

    for (const folder of rootExpiredFolders) {
      await this.foldersService.permanentlyDelete(folder.ownerId, folder.id);
    }
    for (const file of rootExpiredFiles) {
      await this.filesService.permanentlyDelete(file.ownerId, file.id);
    }

    if (rootExpiredFolders.length > 0 || rootExpiredFiles.length > 0) {
      this.logger.log(
        `Purge automatique de la corbeille : ${rootExpiredFolders.length} dossier(s), ${rootExpiredFiles.length} fichier(s)`,
      );
    }
  }
}
