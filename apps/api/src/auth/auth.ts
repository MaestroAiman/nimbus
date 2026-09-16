import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { createDb } from '../db/client.js';
import { users } from '../db/schema/index.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://nimbus:nimbus@localhost:5432/nimbus';
const db = createDb(new Pool({ connectionString: databaseUrl }));

// Seul ce compte doit obtenir le role ADMIN ; tous les autres restent USER (role par defaut
// de la colonne). On bascule via un hook "after" plutot que de surcharger le hook "before" deja
// utilise en interne par le plugin admin pour poser le defaultRole, afin d'eviter toute
// ambiguite sur l'ordre de fusion des hooks.
const ADMIN_EMAIL = 'boutrabaaiman007@gmail.com';

// Marqueur de "banReason" utilise pour distinguer une inscription en attente de validation
// admin d'un veritable bannissement (meme colonne `banned`, reutilisee comme portail
// d'approbation). Doit rester identique a la valeur lue par apps/web/src/lib/users-api.ts.
const PENDING_APPROVAL_REASON = 'pending-signup-approval';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', usePlural: true }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  trustedOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim()),
  // Le controle d'acces interne du plugin indexe "roles" par la valeur exacte de user.role
  // (sensible a la casse) : sans cette option il ne connait que les cles par defaut "admin"/"user"
  // et refuserait tout, alors que nos comptes stockent "ADMIN"/"USER".
  plugins: [
    admin({ defaultRole: 'USER', adminRoles: ['ADMIN'], roles: { ADMIN: adminAc, USER: userAc } }),
  ],
  databaseHooks: {
    user: {
      create: {
        // Le hook "before" est attendu avant l'insertion elle-meme (voir dist/db/with-hooks.mjs) :
        // c'est le seul endroit garanti de s'executer avant la creation de session declenchee par
        // l'auto-sign-in de /sign-up/email. Le hook "after" ci-dessous est en revanche mis en file
        // via queueAfterTransactionHook et n'est PAS garanti de s'executer avant cette meme creation
        // de session (constate : la ligne passait bien banned=true en base, mais trop tard pour
        // empecher la session d'etre emise) — d'ou la separation entre les deux hooks.
        before: async (user, ctx) => {
          if (user.email !== ADMIN_EMAIL && ctx?.path === '/sign-up/email') {
            return { data: { banned: true, banReason: PENDING_APPROVAL_REASON } };
          }
        },
        after: async (user) => {
          if (user.email === ADMIN_EMAIL) {
            await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, user.id));
          }
        },
      },
    },
  },
});
