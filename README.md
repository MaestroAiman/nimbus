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

## Lancer le projet en local

### Backend (`apps/api`)

```bash
cd apps/api
cp .env.example .env
npm install
npm run start:dev
```

L'API démarre par défaut sur `http://localhost:3000`. Healthcheck : `GET http://localhost:3000/health`.

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

Le développement suit une feuille de route par étapes (voir le fichier de suivi local, non versionné). Étape actuelle : **Étape 1 — Initialisation du repo & environnement de dev**.
