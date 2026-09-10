import { Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

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
