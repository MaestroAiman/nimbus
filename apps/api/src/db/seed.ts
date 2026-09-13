import 'dotenv/config';

// Le compte de demo doit exister via Better Auth (mot de passe hache dans sa propre table
// `accounts`) pour pouvoir se connecter depuis le front : un insert Drizzle direct dans
// `users` (comme l'ancien seed) ne suffit pas. On passe donc par les vraies routes HTTP de
// l'API en cours d'execution (`npm run start:dev` ou le conteneur dev), exactement comme le
// ferait le front. Note : un bootstrap Nest ephemere (Test.createTestingModule) dans ce
// script tsx echoue a resoudre certains providers (bug d'interaction esbuild/decorateurs
// specifique a tsx, absent sous vitest) — d'ou ce choix de passer par le serveur reel plutot
// que de re-bootstraper l'app en memoire.
const API_URL = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const BASE = `${API_URL}/api`;

const DEMO_EMAIL = 'demo@nimbus.local';
const DEMO_PASSWORD = 'demopassword123';
const DEMO_NAME = 'Compte de demonstration';

// Better Auth rejette (403 MISSING_OR_NULL_ORIGIN) les requetes de mutation sans en-tete
// Origin correspondant a une origine de confiance (protection CSRF) — contrairement a curl,
// le fetch de Node n'envoie jamais cet en-tete automatiquement, il faut donc le fournir
// explicitement en reprenant une des origines autorisees par CORS_ORIGIN.
const TRUSTED_ORIGIN = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',')[0].trim();

function toCookieHeader(setCookieValues: string[]): string {
  return setCookieValues.map((cookie) => cookie.split(';')[0]).join('; ');
}

async function signUpOrSignIn(): Promise<string> {
  const signUpResponse = await fetch(`${BASE}/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: TRUSTED_ORIGIN },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME }),
  });

  if (signUpResponse.ok) {
    const cookies = signUpResponse.headers.getSetCookie();
    if (cookies.length > 0) return toCookieHeader(cookies);
  }

  const signInResponse = await fetch(`${BASE}/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: TRUSTED_ORIGIN },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });

  if (!signInResponse.ok) {
    throw new Error(`Connexion du compte de demonstration impossible (${signInResponse.status})`);
  }

  const cookies = signInResponse.headers.getSetCookie();
  if (cookies.length === 0) {
    throw new Error('Aucun cookie de session recu pour le compte de demonstration');
  }
  return toCookieHeader(cookies);
}

async function getRootListing(cookie: string): Promise<{ folders: unknown[]; files: unknown[] }> {
  const response = await fetch(`${BASE}/folders`, { headers: { Cookie: cookie } });
  if (!response.ok) {
    throw new Error(`Lecture de la racine impossible (${response.status})`);
  }
  return response.json();
}

async function createFolder(cookie: string, name: string, parentId?: string): Promise<string> {
  const response = await fetch(`${BASE}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(parentId ? { name, parentId } : { name }),
  });
  if (!response.ok) {
    throw new Error(`Creation du dossier "${name}" impossible (${response.status})`);
  }
  const body = await response.json();
  return body.id;
}

async function uploadFile(cookie: string, filename: string, content: string, folderId?: string): Promise<void> {
  const form = new FormData();
  if (folderId) form.append('folderId', folderId);
  form.append('file', new Blob([content]), filename);

  const response = await fetch(`${BASE}/files`, { method: 'POST', headers: { Cookie: cookie }, body: form });
  if (!response.ok) {
    throw new Error(`Envoi de "${filename}" impossible (${response.status})`);
  }
}

async function seed() {
  const cookie = await signUpOrSignIn();

  const rootListing = await getRootListing(cookie);
  if (rootListing.folders.length > 0 || rootListing.files.length > 0) {
    console.log('Seed ignore : le compte de demonstration contient deja des donnees.');
  } else {
    const documentsId = await createFolder(cookie, 'Documents');
    const photosId = await createFolder(cookie, 'Photos');

    await uploadFile(cookie, 'facture_electricite.pdf', 'Facture electricite - aout 2026');
    await uploadFile(cookie, 'notes.txt', 'Notes diverses');
    await uploadFile(cookie, 'budget_2026.xlsx', 'Budget previsionnel 2026', documentsId);
    await uploadFile(cookie, 'cv.pdf', 'Curriculum vitae', documentsId);
    await uploadFile(cookie, 'photo_vacances.jpg', 'Photo de vacances (contenu simule)', photosId);
    await uploadFile(cookie, 'photo_famille.jpg', 'Photo de famille (contenu simule)', photosId);

    console.log('Seed termine : 2 dossiers et 6 fichiers crees.');
  }

  console.log(`Compte de demonstration : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seed().catch((error: unknown) => {
  console.error('Echec du seed :', error);
  console.error(`(L'API doit tourner sur ${API_URL} — verifiez "npm run start:dev" ou le conteneur dev.)`);
  process.exit(1);
});
