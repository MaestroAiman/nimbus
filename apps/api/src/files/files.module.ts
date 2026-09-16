import { existsSync, mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { createId } from '@paralleldrive/cuid2';
import { diskStorage } from 'multer';
import { FoldersModule } from '../folders/folders.module.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

@Module({
  imports: [
    FoldersModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const storagePath = config.getOrThrow<string>('STORAGE_PATH');

        if (!existsSync(storagePath)) {
          mkdirSync(storagePath, { recursive: true });
        }

        return {
          storage: diskStorage({
            destination: storagePath,
            filename: (_request, file, callback) => {
              callback(null, `${createId()}${extname(file.originalname)}`);
            },
          }),
        };
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
