import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

// Better Auth ajoute lui-meme le suffixe /api/auth : baseURL doit rester une origine
// (vide = origine courante, cas Docker prod derriere le reverse proxy unique de l'etape 10).
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  plugins: [adminClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
