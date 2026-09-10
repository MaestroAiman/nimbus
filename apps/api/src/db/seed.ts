import 'dotenv/config';
import { Pool } from 'pg';
import { createDb } from './client.js';
import { users } from './schema/index.js';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL manquant');
  }

  const db = createDb(new Pool({ connectionString: databaseUrl }));

  await db
    .insert(users)
    .values({
      id: 'seed-test-user',
      name: 'Utilisateur de test',
      email: 'test@nimbus.local',
      emailVerified: true,
    })
    .onConflictDoNothing({ target: users.id });

  console.log('Seed termine : utilisateur de test present (id=seed-test-user, email=test@nimbus.local)');
  process.exit(0);
}

seed().catch((error: unknown) => {
  console.error('Echec du seed :', error);
  process.exit(1);
});
