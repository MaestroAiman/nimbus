import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envValidationSchema } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { SessionMiddleware } from './auth/session.middleware.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { FoldersModule } from './folders/folders.module.js';
import { FilesModule } from './files/files.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { TrashModule } from './trash/trash.module.js';
import { StorageModule } from './storage/storage.module.js';
import { ActivityModule } from './activity/activity.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    FoldersModule,
    FilesModule,
    FavoritesModule,
    TrashModule,
    StorageModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware, SessionMiddleware).forRoutes('*');
  }
}
