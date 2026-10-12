import { createReadStream, existsSync } from 'node:fs';
import { mkdir, open, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, isNull } from 'drizzle-orm';
import exifr from 'exifr';
import { DRIZZLE_DB } from '../database/database.provider.js';
import type { Database } from '../db/client.js';
import { files } from '../db/schema/index.js';
import { FoldersService } from '../folders/folders.service.js';
import type { UpdateFileDto } from './dto/update-file.dto.js';

// Extensions pour lesquelles on tente d'extraire la vignette JPEG integree (EXIF/IFD1) :
// les RAW et le HEIC embarquent presque toujours un apercu, contrairement aux autres
// formats non rendus nativement (PSD, AI...) qui n'ont pas d'equivalent exploitable.
const THUMBNAIL_EXTENSIONS = new Set(['arw', 'heic', 'heif']);

function fileExtension(name: string): string {
  return extname(name).slice(1).toLowerCase();
}

/**
 * Les RAW bases sur TIFF embarquent, en plus de la minuscule vignette EXIF standard
 * (IFD1, ~160x120, ce que lit exifr.thumbnail()), un aperçu JPEG bien plus grand —
 * souvent quasi plein format — dont la position/taille sont donnees par les tags
 * ThumbnailOffset/ThumbnailLength (0x0201/0x0202). D'ordinaire ces tags vivent dans
 * l'IFD1, mais certains fabricants (confirme sur Sony ARW) les placent directement
 * dans l'IFD0, zone qu'exifr.thumbnail() ne regarde jamais (il ne lit que l'IFD1).
 * On lit donc l'IFD0 en priorite ici, avec repli sur l'IFD1 (meme tags, au cas ou un
 * autre fabricant les y placerait) avant de retomber sur exifr.thumbnail(). Lecture
 * par decalage d'octets direct plutot que decodage du RAW (pas de dependance native
 * type libraw). exifr.thumbnail() reste le repli pour le cas standard (tags dans
 * l'IFD1) : seule la presence dans l'IFD0 est un cas particulier non couvert par lui.
 * Retourne undefined si l'IFD0 n'a pas cette structure (ex. HEIC, qui n'est pas base
 * sur TIFF, ou la plupart des autres fabricants RAW) ou si la lecture echoue.
 */
async function extractLargeRawPreview(absolutePath: string): Promise<Buffer | undefined> {
  const tags = await exifr.parse(absolutePath, { mergeOutput: false }).catch(() => undefined);
  const { ThumbnailOffset, ThumbnailLength } = tags?.ifd0 ?? {};
  if (typeof ThumbnailOffset !== 'number' || typeof ThumbnailLength !== 'number') {
    return undefined;
  }

  const handle = await open(absolutePath, 'r');
  try {
    const buffer = Buffer.alloc(ThumbnailLength);
    await handle.read(buffer, 0, ThumbnailLength, ThumbnailOffset);
    // Verifie le marqueur JPEG (SOI) avant de faire confiance a ces offsets.
    return buffer[0] === 0xff && buffer[1] === 0xd8 ? buffer : undefined;
  } finally {
    await handle.close();
  }
}

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

  /**
   * Vignette JPEG extraite de l'apercu integre au fichier (RAW/HEIC uniquement, voir
   * THUMBNAIL_EXTENSIONS). Mise en cache sur disque au premier appel : ces fichiers ne
   * sont jamais remplaces en place, un cache "pour toujours" est donc sans risque.
   */
  async getThumbnail(ownerId: string, id: string): Promise<Buffer> {
    const file = await this.getOwnedFile(ownerId, id);

    if (!THUMBNAIL_EXTENSIONS.has(fileExtension(file.name))) {
      throw new NotFoundException("Aucune vignette disponible pour ce type de fichier");
    }

    const cachePath = join(this.config.getOrThrow<string>('STORAGE_PATH'), '.thumbnails', `${file.id}.jpg`);
    if (existsSync(cachePath)) {
      return readFile(cachePath);
    }

    const absolutePath = join(this.config.getOrThrow<string>('STORAGE_PATH'), file.diskPath);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Fichier physique introuvable sur le disque');
    }

    let thumbnail: Buffer | undefined;
    try {
      thumbnail = await extractLargeRawPreview(absolutePath);
    } catch (error) {
      this.logger.warn(`Extraction de l'apercu large echouee pour ${file.diskPath} : ${String(error)}`);
    }

    if (!thumbnail) {
      try {
        const extracted = await exifr.thumbnail(absolutePath);
        thumbnail = extracted ? Buffer.from(extracted) : undefined;
      } catch (error) {
        this.logger.warn(`Extraction de vignette echouee pour ${file.diskPath} : ${String(error)}`);
      }
    }

    if (!thumbnail) {
      throw new NotFoundException("Ce fichier n'a pas d'apercu integre");
    }

    await mkdir(join(this.config.getOrThrow<string>('STORAGE_PATH'), '.thumbnails'), { recursive: true });
    await writeFile(cachePath, thumbnail);

    return thumbnail;
  }

  async getProperties(ownerId: string, id: string) {
    const file = await this.getOwnedFile(ownerId, id);

    return { path: await this.foldersService.getFolderPath(ownerId, file.folderId) };
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
    const storagePath = this.config.getOrThrow<string>('STORAGE_PATH');
    const absolutePath = join(storagePath, file.diskPath);

    await this.db.delete(files).where(eq(files.id, id));

    try {
      await unlink(absolutePath);
    } catch (error) {
      this.logger.warn(`Impossible de supprimer le fichier physique ${file.diskPath} : ${String(error)}`);
    }

    try {
      await unlink(join(storagePath, '.thumbnails', `${file.id}.jpg`));
    } catch {
      // Pas de vignette en cache pour ce fichier : rien a faire.
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
