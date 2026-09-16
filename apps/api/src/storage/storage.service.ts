import { statfs } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StorageUsage {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
}

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  /** Espace du volume de stockage des fichiers (STORAGE_PATH), pas un quota par utilisateur. */
  async getUsage(): Promise<StorageUsage> {
    const storagePath = this.config.getOrThrow<string>('STORAGE_PATH');
    const stats = await statfs(storagePath);

    const totalBytes = stats.bsize * stats.blocks;
    const freeBytes = stats.bsize * stats.bavail;

    return { totalBytes, freeBytes, usedBytes: totalBytes - freeBytes };
  }
}
