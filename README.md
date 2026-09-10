# Nimbus

Application web auto-hébergée de stockage de fichiers ("Google Drive personnel"), pensée pour tourner sur un serveur domestique à faibles ressources.

## Structure du repo

```
nimbus/
├── apps/
│   ├── api/   # Backend NestJS (TypeScript strict)
│   └── web/   # Frontend React + Vite
└── infra/     # Docker Compose, configuration Nginx (à partir de l'étape 9/10)
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

L'API démarre par défaut sur `http://localhost:3000`, se connecte à PostgreSQL au démarrage. Healthcheck : `GET http://localhost:3000/health`.

> Si `npm install` échoue avec l'erreur `Cannot read properties of null (reading 'edgesOut')`, c'est un bug connu de la résolution de dépendances d'npm (arborist) sur cette combinaison de paquets. Contournement : `npm install --legacy-peer-deps`.

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
curl -b cookies.txt http://localhost:3000/auth/me   # 200 avec la session
curl http://localhost:3000/auth/me                   # 401 sans cookie

# Déconnexion (nécessite un en-tête Origin, comme un vrai navigateur)
curl -b cookies.txt -H "Origin: http://localhost:3000" -X POST http://localhost:3000/api/auth/sign-out
```

Ce flux complet (inscription/connexion/route protégée/refus sans session/déconnexion) est aussi couvert par un test automatisé : `apps/api/test/auth.e2e-spec.ts` (lancé via `npm run test:e2e`).

### Frontend (`apps/web`)

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

Le frontend démarre par défaut sur `http://localhost:5173`.

### Lancer les deux en parallèle

Ouvrir deux terminaux et lancer chaque commande `npm run start:dev` / `npm run dev` ci-dessus séparément.

## État du projet

Le développement suit une feuille de route par étapes (voir le fichier de suivi local, non versionné). Étape actuelle : **Étape 4 — Authentification (Better Auth) de bout en bout**.
