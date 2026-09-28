# Nimbus — guide de développement

Application web auto-hébergée de stockage de fichiers ("Google Drive personnel"), pensée pour tourner sur un serveur domestique à faibles ressources.

## Structure du repo

```
nimbus/
├── apps/
│   ├── api/   # Backend NestJS (TypeScript strict) + Dockerfile
│   └── web/   # Frontend React + Vite + Dockerfile
└── infra/     # Docker Compose (dev et prod) + infra/nginx/nginx.conf (reverse proxy unique, etape 10)
```

## Prérequis

- Node.js ≥ 22
- npm ≥ 10
- Docker + Docker Compose (pour la base PostgreSQL locale)

## Lancer le projet en local

### Base de données (PostgreSQL, requis avant de lancer l'API)

```bash
cd infra
docker compose -f docker-compose.dev.yml up -d
```

Démarre un PostgreSQL local (utilisateur/mot de passe/base : `nimbus`) sur le port `5432`, avec des réglages mémoire bas conformes aux contraintes du serveur cible (voir le fichier de suivi local).

### Backend (`apps/api`)

```bash
cd apps/api
cp .env.example .env
npm install
npm run start:dev
```

L'API démarre par défaut sur `http://localhost:3000`, se connecte à PostgreSQL au démarrage. Toutes les routes sont préfixées par `/api` (`app.setGlobalPrefix('api')`, étape 10). Healthcheck : `GET http://localhost:3000/api/health`.

> Si `npm install` échoue avec l'erreur `Cannot read properties of null (reading 'edgesOut')`, c'est un bug connu de la résolution de dépendances d'npm (arborist) sur cette combinaison de paquets. Contournement : `npm install --legacy-peer-deps`. Pour la même raison, `npm ci` échoue aussi de façon fiable sur `apps/api` (deux versions d'`esbuild` coexistent dans l'arbre de dépendances, et npm n'écrit pas systématiquement l'entrée binaire optionnelle correspondante dans `package-lock.json`) : `apps/api/Dockerfile` utilise donc `npm install --legacy-peer-deps` plutôt que `npm ci`.

#### Base de données : migrations et seed

Une fois PostgreSQL démarré (voir ci-dessus) et les dépendances installées :

```bash
cd apps/api
npm run db:migrate   # applique les migrations SQL (src/db/migrations) sur la base
npm run db:seed       # insère un utilisateur de test (seed-test-user / test@nimbus.local)
```

Si le schéma (`src/db/schema/`) est modifié, régénérer la migration avec `npm run db:generate` avant de la rejouer avec `db:migrate`.

#### Authentification (Better Auth)

Endpoints exposés par Better Auth sous `/api/auth/*` (inscription, connexion, déconnexion, session) :

```bash
# Inscription
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@nimbus.local","password":"correct-horse-battery","name":"Alice"}'

# Connexion (récupère le cookie de session)
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@nimbus.local","password":"correct-horse-battery"}'

# Route protégée ("qui suis-je")
curl -b cookies.txt http://localhost:3000/api/auth/me   # 200 avec la session
curl http://localhost:3000/api/auth/me                   # 401 sans cookie

# Déconnexion (nécessite un en-tête Origin, comme un vrai navigateur)
curl -b cookies.txt -H "Origin: http://localhost:3000" -X POST http://localhost:3000/api/auth/sign-out
```

Ce flux complet (inscription/connexion/route protégée/refus sans session/déconnexion) est aussi couvert par un test automatisé : `apps/api/test/auth.e2e-spec.ts` (lancé via `npm run test:e2e`).

#### Dossiers et fichiers

Toutes les routes ci-dessous nécessitent le cookie de session obtenu après connexion (voir ci-dessus). Les fichiers sont stockés sur disque sous `STORAGE_PATH` (`./storage` en local par défaut, non versionné) — seule la métadonnée (nom, taille, type, chemin) est en base.

```bash
# Creer un dossier a la racine
curl -b cookies.txt -X POST http://localhost:3000/api/folders \
  -H "Content-Type: application/json" -d '{"name":"Documents"}'

# Lister le contenu de la racine (folderId omis) ou d'un dossier (?parentId=<id>)
curl -b cookies.txt http://localhost:3000/api/folders
curl -b cookies.txt "http://localhost:3000/api/folders?parentId=<id-du-dossier>"

# Renommer / deplacer un dossier (parentId: null pour remonter a la racine)
curl -b cookies.txt -X PATCH http://localhost:3000/api/folders/<id> \
  -H "Content-Type: application/json" -d '{"name":"Nouveau nom"}'

# Uploader un fichier (streame directement sur le disque, sans buffering complet en RAM)
curl -b cookies.txt -X POST http://localhost:3000/api/files \
  -F "folderId=<id-du-dossier>" -F "file=@/chemin/vers/mon-fichier.pdf"

# Telecharger
curl -b cookies.txt -o fichier-telecharge.pdf http://localhost:3000/api/files/<id>/download

# Deplacer / renommer / supprimer un fichier
curl -b cookies.txt -X PATCH http://localhost:3000/api/files/<id> \
  -H "Content-Type: application/json" -d '{"folderId":null}'
curl -b cookies.txt -X DELETE http://localhost:3000/api/files/<id>
```

Un utilisateur ne peut ni voir, ni modifier, ni supprimer les dossiers/fichiers d'un autre utilisateur (404 sinon). Couverture automatisée : `apps/api/test/files-folders.e2e-spec.ts` (arborescence, upload d'un fichier de plusieurs dizaines de Mo, téléchargement, déplacement, suppression, prévention des cycles de dossiers, isolation entre utilisateurs).

#### Tests (étape 11)

```bash
cd apps/api
npm run test        # tests unitaires
npm run test:e2e    # tests e2e (auth, dossiers/fichiers) — necessite Postgres demarre
npm run test:all    # les deux, en une seule commande
```

### Frontend (`apps/web`)

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

Le frontend démarre par défaut sur `http://localhost:5173`.

Pages disponibles :
- `/login`, `/register` — formulaires connectés à l'API Better Auth (voir ci-dessous), sans barre latérale
- `/explorer` — protégée : redirige vers `/login` si aucune session valide ; navigation dans l'arborescence, création de dossier, envoi/téléchargement/renommage/suppression de fichiers et dossiers, câblés sur l'API réelle (étape 8)

Système de CSS vanilla dans `apps/web/src/styles/` (`variables.css` pour les tokens de design, `reset.css`, `base.css`, `layout.css`, `explorer.css`), avec support clair/sombre automatique via `prefers-color-scheme`.

#### Authentification côté frontend (étape 7)

Le frontend utilise le client React de Better Auth (`apps/web/src/lib/auth-client.ts`, `baseURL` = `VITE_API_URL`). Important pour le développement local :

- **CORS** : l'API (`apps/api/.env`) doit lister l'origine du frontend dans `CORS_ORIGIN` (séparées par des virgules si Vite change de port, ex. `http://localhost:5173,http://localhost:5174`). Sans ça, le navigateur bloque les requêtes cross-origin et les cookies de session ne circulent pas.
- Les deux serveurs (API sur `:3000`, frontend sur `:5173`/`:5174`) doivent tourner en même temps pour que l'inscription/connexion fonctionnent réellement depuis l'UI.
- Route protégée : `RequireAuth` (`apps/web/src/components/RequireAuth.tsx`) vérifie la session via `useSession()` et redirige vers `/login` si absente. Déconnexion via le bouton dans la barre latérale.

### Lancer les deux en parallèle

Ouvrir deux terminaux et lancer chaque commande `npm run start:dev` / `npm run dev` ci-dessus séparément.

## Avec Docker (étape 9)

Alternative à l'installation locale de Node : tout tourne en conteneurs. Deux fichiers compose dans `infra/`, chacun avec son propre nom de projet Docker (évite toute collision entre les deux) :

### Développement (`docker-compose.dev.yml`, projet `nimbus-dev`)

```bash
cd infra
docker compose -f docker-compose.dev.yml up -d
```

Démarre Postgres (déjà présent depuis l'étape 2), l'API (`http://localhost:3000`, hot-reload via `tsx watch`) et le frontend (`http://localhost:5173`, hot-reload via Vite HMR), avec le code source de `apps/api` et `apps/web` monté en volume — les modifications faites sur l'hôte sont prises en compte automatiquement. `CHOKIDAR_USEPOLLING` est activé côté conteneurs : sur Windows/Mac, les événements de système de fichiers natifs ne traversent pas toujours les bind mounts Docker Desktop, le polling est nécessaire pour que le rechargement fonctionne réellement (constaté en pratique lors de la mise en place — voir la note technique dans `apps/api/Dockerfile`, stage `dev`). Nécessite `apps/api/.env` et `apps/web/.env` (voir sections ci-dessus).

Cette approche est un complément optionnel à `npm run start:dev` / `npm run dev` lancés directement sur l'hôte (toujours la voie la plus simple au quotidien) — utile pour développer sans installer Node localement, ou pour tester les Dockerfiles.

### Production (`docker-compose.prod.yml`, projet `nimbus-prod`)

Images figées (buildées ici, sur le PC de dev — jamais sur le futur serveur cible), limites mémoire actives par service selon le budget RAM documenté dans le fichier de suivi local (Postgres ~400 Mo, API ~300 Mo, Nginx ~64 Mo). Le frontend est un build Vite statique servi par Nginx (pas de serveur Node en prod).

```bash
cd infra
cp .env.prod.example .env.prod   # renseigner un vrai mot de passe Postgres + BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose --env-file .env.prod -p nimbus-prod -f docker-compose.prod.yml up -d --build
```

Ordre de démarrage géré automatiquement : Postgres → migrations Drizzle (conteneur `migrate`, one-shot, images buildées avec les devDependencies pour garder l'image `api` finale minimale) → API → `web`. Depuis l'étape 10, **`web` est l'unique point d'entrée** : un reverse proxy Nginx (`infra/nginx/nginx.conf`, monté dans le conteneur `web`) sert le frontend statique et proxifie `/api/*` vers l'API, qui n'est plus publiée directement sur l'hôte. Par défaut : tout est accessible sur `http://localhost:8080` (`WEB_PORT`).

Pour arrêter et nettoyer : `docker compose --env-file .env.prod -p nimbus-prod -f docker-compose.prod.yml down` (ajouter `-v` pour supprimer aussi les volumes Postgres/stockage).

## Déploiement sur le Dell (étape 10)

Procédure complète (installation Docker, Tailscale, transfert d'images, service systemd, recommandations RAM/swap) : voir [`docs/deploiement-dell.md`](deploiement-dell.md).

## Monitoring et sauvegardes (étape 11)

- **Healthcheck** : `GET /api/health`, plus un `HEALTHCHECK` Docker sur `api` et `web` (voir `docker-compose.prod.yml` — Docker relance automatiquement un conteneur `unhealthy`).
- **Sauvegardes** : `infra/scripts/backup.sh` (dump Postgres + archive du volume de stockage, horodatés, rotation automatique) et `infra/scripts/restore.sh`. Détails et planification cron : voir [`docs/deploiement-dell.md`](deploiement-dell.md#9-sauvegardes-étape-11).

## État du projet

Le développement suit une feuille de route par étapes (voir le fichier de suivi local, non versionné). Étape actuelle : **Étape 11 — Durcissement : tests, sauvegardes, monitoring léger** (dernière étape de la feuille de route initiale).
