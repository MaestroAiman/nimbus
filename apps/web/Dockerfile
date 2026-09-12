# syntax=docker/dockerfile:1

# ---- deps : dependances completes ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev : conteneur de developpement avec hot-reload (source montee en volume) ----
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- build : build statique Vite ----
# VITE_API_URL est compile en dur dans le bundle JS (limite connue de Vite avec les
# variables d'environnement) : a reconsiderer a l'etape 10 si nginx sert l'API sur la
# meme origine que le frontend (permettrait d'utiliser des chemins relatifs /api/...
# et de supprimer ce besoin de valeur figee au build).
FROM deps AS build
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm run build

# ---- runtime : artefacts statiques serves par Nginx (pas de processus Node en prod) ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
