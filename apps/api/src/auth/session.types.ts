import type { auth } from './auth.js';

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;
