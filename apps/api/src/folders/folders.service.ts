import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { and, asc, count, eq, inArray, isNull, sum } from 'drizzle-orm';
import { DRIZZLE_DB } from '../database/database.provider.js';
import type { Database } from '../db/client.js';
import { files, folders } from '../db/schema/index.js';
import type { CreateFolderTreeDto } from './dto/create-folder-tree.dto.js';
import type { CreateFolderDto } from './dto/create-folder.dto.js';
import type { UpdateFolderDto } from './dto/update-folder.dto.js';

export interface DownloadEntries {
  folder: typeof folders.$inferSelect;
  /** Chemins de dossiers dans l'archive, avec "/" final (dossiers vides inclus). */
  directories: string[];
  files: { diskPath: string; entryName: string }[];
}

const INSERT_BATCH_SIZE = 5000;

// Un segment de nom de dossier : non vide, sans separateur, ni "." ni "..".
function isValidSegment(segment: string): boolean {
  return segment.length > 0 && segment.length <= 255 && !/[/\\]/.test(segment) && segment !== '.' && segment !== '..';
}

// Nom utilisable comme segment de chemin dans une archive : jamais de separateur, de caractere
// de controle, ni de "." / ".." (les noms de fichiers ne sont pas contraints a l'ecriture).
function toEntrySegment(name: string): string {
  // oxlint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\x00-\x1f/\\]/g, '_');
  return cleaned === '' || cleaned === '.' || cleaned === '..' ? '_' : cleaned;
}

// Deux noms qui ne different que par la casse ecraseraient l'un l'autre a l'extraction sous Windows.
function uniqueSegment(used: Set<string>, segment: string): string {
  let candidate = segment;
  for (let n = 2; used.has(candidate.toLowerCase()); n += 1) {
    const dot = segment.lastIndexOf('.');
    candidate = dot > 0 ? `${segment.slice(0, dot)} (${n})${segment.slice(dot)}` : `${segment} (${n})`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

// Drizzle enveloppe l'erreur pg : le code SQLSTATE est sur `cause` (ou sur l'erreur elle-meme).
function isUniqueViolation(error: unknown): boolean {
  const { code, cause } = error as { code?: string; cause?: { code?: string } };
  return (code ?? cause?.code) === '23505';
}

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

  /**
   * Cree en une transaction un dossier racine (renomme "Nom (2)", "Nom (3)"... s'il existe deja)
   * et tous ses sous-dossiers. `folders` associe chaque chemin relatif a l'id cree ("" = racine).
   */
  async createTree(ownerId: string, dto: CreateFolderTreeDto) {
    const parentId = dto.parentId ?? null;
    if (parentId) {
      await this.getOwnedFolder(ownerId, parentId);
    }

    if (!isValidSegment(dto.rootName)) {
      throw new BadRequestException('Nom de dossier invalide');
    }

    // Un chemin "a/b" implique "a" : on complete les ancetres pour ne jamais avoir de parent manquant.
    const paths = new Set<string>();
    for (const dir of dto.dirs) {
      const segments = dir.split('/');
      if (!segments.every(isValidSegment)) {
        throw new BadRequestException(`Chemin de dossier invalide : ${dir}`);
      }
      for (let depth = 1; depth <= segments.length; depth += 1) {
        paths.add(segments.slice(0, depth).join('/'));
      }
    }

    const byDepth = new Map<number, string[]>();
    for (const path of paths) {
      const depth = path.split('/').length;
      const level = byDepth.get(depth);
      if (level) level.push(path);
      else byDepth.set(depth, [path]);
    }

    const rootName = await this.findAvailableName(ownerId, parentId, dto.rootName);

    try {
      return await this.db.transaction(async (tx) => {
        const [root] = await tx.insert(folders).values({ id: createId(), name: rootName, ownerId, parentId }).returning();

        const idByPath = new Map<string, string>([['', root.id]]);
        for (let depth = 1; byDepth.has(depth); depth += 1) {
          const rows = byDepth.get(depth)!.map((path) => {
            const segments = path.split('/');
            return {
              path,
              id: createId(),
              name: segments[segments.length - 1],
              parentId: idByPath.get(segments.slice(0, -1).join('/'))!,
            };
          });

          // Par paquets : Postgres limite une requete a 65 535 parametres (4 par ligne ici).
          for (let start = 0; start < rows.length; start += INSERT_BATCH_SIZE) {
            const batch = rows.slice(start, start + INSERT_BATCH_SIZE);
            await tx.insert(folders).values(batch.map(({ path: _path, ...row }) => ({ ...row, ownerId })));
          }
          for (const row of rows) idByPath.set(row.path, row.id);
        }

        return { root, folders: Object.fromEntries(idByPath) };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Un dossier de ce nom existe deja, reessayez');
      }
      throw error;
    }
  }

  /** Premier nom libre dans le dossier parent : `name`, puis `name (2)`, `name (3)`... */
  async findAvailableName(ownerId: string, parentId: string | null, name: string): Promise<string> {
    const siblings = await this.db
      .select({ name: folders.name })
      .from(folders)
      .where(
        and(
          eq(folders.ownerId, ownerId),
          parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId),
          isNull(folders.deletedAt),
        ),
      );
    const taken = new Set(siblings.map((sibling) => sibling.name));

    let candidate = name;
    for (let n = 2; taken.has(candidate); n += 1) {
      candidate = `${name} (${n})`;
    }
    return candidate;
  }

  /**
   * Contenu d'un dossier pour son archive ZIP. Contrairement a collectFolderSubtreeIds (qui inclut la
   * corbeille pour supprimer/restaurer), ignore ici tout ce qui est en corbeille.
   */
  async getDownloadEntries(ownerId: string, id: string): Promise<DownloadEntries> {
    const folder = await this.getOwnedFolder(ownerId, id);
    const rootSegment = toEntrySegment(folder.name);

    const directories = [`${rootSegment}/`];
    const pathById = new Map<string, string>([[id, rootSegment]]);
    // Noms deja pris dans chaque dossier de l'archive, pour dedoublonner dossiers et fichiers.
    const usedByFolder = new Map<string, Set<string>>([[id, new Set()]]);
    let frontier = [id];

    while (frontier.length > 0) {
      const children = await this.db
        .select({ id: folders.id, name: folders.name, parentId: folders.parentId })
        .from(folders)
        .where(and(eq(folders.ownerId, ownerId), inArray(folders.parentId, frontier), isNull(folders.deletedAt)))
        .orderBy(asc(folders.name));

      for (const child of children) {
        const used = usedByFolder.get(child.parentId!)!;
        const path = `${pathById.get(child.parentId!)}/${uniqueSegment(used, toEntrySegment(child.name))}`;
        pathById.set(child.id, path);
        usedByFolder.set(child.id, new Set());
        directories.push(`${path}/`);
      }
      frontier = children.map((child) => child.id);
    }

    const rows = await this.db
      .select({ folderId: files.folderId, name: files.name, diskPath: files.diskPath })
      .from(files)
      .where(and(eq(files.ownerId, ownerId), inArray(files.folderId, [...pathById.keys()]), isNull(files.deletedAt)))
      .orderBy(asc(files.name));

    const entries = rows.map((row) => ({
      diskPath: row.diskPath,
      entryName: `${pathById.get(row.folderId!)}/${uniqueSegment(usedByFolder.get(row.folderId!)!, toEntrySegment(row.name))}`,
    }));

    return { folder, directories, files: entries };
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
  async remove(ownerId: string, id: string) {
    const folder = await this.getOwnedFolder(ownerId, id);

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

    return { id: folder.id, name: folder.name };
  }

  /** Restaure le dossier et tout son contenu (meme sous-arbre que remove()). */
  async restore(ownerId: string, id: string) {
    const folder = await this.getOwnedFolder(ownerId, id, { includeTrashed: true });

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

    return { id: folder.id, name: folder.name };
  }

  /** Suppression definitive du dossier et de tout son contenu : lignes DB + fichiers physiques. Irreversible. */
  async permanentlyDelete(ownerId: string, id: string) {
    const folder = await this.getOwnedFolder(ownerId, id, { includeTrashed: true });

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

    return { id: folder.id, name: folder.name };
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

  /** Noms des dossiers ancetres, de la racine jusqu'a `folderId` inclus (vide si `folderId` est null : racine). */
  async getFolderPath(ownerId: string, folderId: string | null): Promise<string[]> {
    const path: string[] = [];
    let currentId = folderId;

    while (currentId !== null) {
      const [folder] = await this.db
        .select({ name: folders.name, parentId: folders.parentId })
        .from(folders)
        .where(and(eq(folders.id, currentId), eq(folders.ownerId, ownerId)));

      if (!folder) break;

      path.unshift(folder.name);
      currentId = folder.parentId;
    }

    return path;
  }

  /** Emplacement, taille cumulee et contenu d'un dossier (la corbeille est ignoree). */
  async getProperties(ownerId: string, id: string) {
    const folder = await this.getOwnedFolder(ownerId, id);

    const folderIds = await this.collectFolderSubtreeIds(ownerId, id, { excludeTrashed: true });
    const [totals] = await this.db
      .select({ fileCount: count(), sizeBytes: sum(files.sizeBytes) })
      .from(files)
      .where(and(eq(files.ownerId, ownerId), inArray(files.folderId, folderIds), isNull(files.deletedAt)));

    return {
      path: await this.getFolderPath(ownerId, folder.parentId),
      sizeBytes: Number(totals.sizeBytes ?? 0),
      fileCount: totals.fileCount,
      folderCount: folderIds.length - 1,
    };
  }

  /**
   * Parcourt l'arborescence et retourne id racine + tous ses descendants. Inclut la corbeille par defaut
   * (suppression/restauration), sauf avec `excludeTrashed`.
   */
  private async collectFolderSubtreeIds(
    ownerId: string,
    rootId: string,
    options?: { excludeTrashed?: boolean },
  ): Promise<string[]> {
    const ids = [rootId];
    let frontier = [rootId];

    while (frontier.length > 0) {
      const children = await this.db
        .select({ id: folders.id })
        .from(folders)
        .where(
          and(
            eq(folders.ownerId, ownerId),
            inArray(folders.parentId, frontier),
            options?.excludeTrashed ? isNull(folders.deletedAt) : undefined,
          ),
        );

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
