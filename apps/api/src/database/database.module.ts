import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DRIZZLE_DB, PG_POOL, databasePoolProvider, drizzleDbProvider } from './database.provider.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [databasePoolProvider, drizzleDbProvider],
  exports: [PG_POOL, DRIZZLE_DB],
})
export class DatabaseModule {}
