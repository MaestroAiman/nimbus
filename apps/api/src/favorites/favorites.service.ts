import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE_DB } from '../database/database.provider.js';
import type { Database } from '../db/client.js';
import { files, folders } from '../db/schema/index.js';

@Injectable()
export class FavoritesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async list(ownerId: string) {
    const [favoriteFolders, favoriteFiles] = await Promise.all([
      this.db
        .select()
        .from(folders)
        .where(and(eq(folders.ownerId, ownerId), eq(folders.isFavorite, true), isNull(folders.deletedAt))),
      this.db
        .select()
        .from(files)
        .where(and(eq(files.ownerId, ownerId), eq(files.isFavorite, true), isNull(files.deletedAt))),
    ]);

    return { folders: favoriteFolders, files: favoriteFiles };
  }
}
