# syntax=docker/dockerfile:1

# ---- deps : dependances completes (necessaires au build ET aux migrations) ----
# npm ci echoue sur ce projet (bug connu de la resolution arborist d'npm avec les
# binaires optionnels d'esbuild quand deux versions coexistent dans l'arbre de
# dependances - cf. README, meme contournement que pour npm install en local).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# ---- dev : conteneur de developpement avec hot-reload (source montee en volume) ----
# tsx watch plutot que `nest start --watch` (tsc) : les evenements fs natifs utilises par
# le watch program de @nestjs/cli (base sur tsc) ne traversent pas les bind mounts Docker
# Desktop sur Windows/Mac, meme avec CHOKIDAR_USEPOLLING/TSC_WATCHFILE actives - constate
# en pratique lors de la mise en place de cette etape. tsx watch (esbuild) recharge
# correctement dans ce meme environnement. Verification de types complete toujours
# disponible via `npm run build` (host ou CI), non affectee par ce choix.
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["npx", "tsx", "watch", "src/main.ts"]

# ---- build : compilation TypeScript -> dist/ ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- migrator : image dediee a l'application des migrations Drizzle (garde drizzle-kit,
#      absent de l'image runtime pour la garder minimale) ----
FROM deps AS migrator
COPY drizzle.config.ts ./
COPY src/db ./src/db
CMD ["npm", "run", "db:migrate"]

# ---- runtime : image de production minimale (dependances de prod uniquement) ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
