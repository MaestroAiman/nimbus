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

Le développement suit une feuille de route par étapes (voir le fichier de suivi local, non versionné). Étape actuelle : **Étape 2 — Backend : squelette NestJS + configuration**.
