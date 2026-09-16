import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module.js';
import { FoldersModule } from '../folders/folders.module.js';
import { TrashController } from './trash.controller.js';
import { TrashService } from './trash.service.js';

@Module({
  imports: [FilesModule, FoldersModule],
  controllers: [TrashController],
  providers: [TrashService],
})
export class TrashModule {}
