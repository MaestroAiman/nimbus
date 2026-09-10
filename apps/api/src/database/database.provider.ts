import { Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { createDb, type Database } from '../db/client.js';

export const PG_POOL = 'PG_POOL';
export const DRIZZLE_DB = 'DRIZZLE_DB';

const logger = new Logger('DatabaseModule');

export const databasePoolProvider: Provider = {
  provide: PG_POOL,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<Pool> => {
    const pool = new Pool({ connectionString: config.getOrThrow<string>('DATABASE_URL') });
    await pool.query('SELECT 1');
    logger.log('Connexion PostgreSQL etablie');
    return pool;
  },
};

export const drizzleDbProvider: Provider = {
  provide: DRIZZLE_DB,
  inject: [PG_POOL],
  useFactory: (pool: Pool): Database => createDb(pool),
};
