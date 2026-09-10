import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { Pool } from 'pg';
import { createDb } from '../db/client.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://nimbus:nimbus@localhost:5432/nimbus';
const db = createDb(new Pool({ connectionString: databaseUrl }));

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', usePlural: true }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  trustedOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim()),
});
