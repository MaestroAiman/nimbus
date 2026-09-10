import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PG_POOL, databasePoolProvider } from './database.provider.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [databasePoolProvider],
  exports: [PG_POOL],
})
export class DatabaseModule {}
