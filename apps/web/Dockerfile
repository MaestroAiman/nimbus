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
# variables d'environnement). Vide par defaut depuis l'etape 10 : en production, Nginx
# sert l'API sur la meme origine que le frontend (proxy /api -> NestJS), donc le code
# frontend utilise des chemins relatifs /api/* et n'a plus besoin d'une origine figee au
# build. Ne definir cet ARG que pour un build ou frontend et API restent sur des origines
# separees (ex. image testee hors du reverse proxy unifie).
FROM deps AS build
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN npm run build

# ---- runtime : artefacts statiques serves par Nginx (pas de processus Node en prod) ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# Monitoring leger (etape 11) : wget deja present dans l'image nginx:alpine (BusyBox).
# 127.0.0.1 et non localhost : dans le conteneur, localhost se resout d'abord en ::1 (IPv6),
# or nginx n'ecoute qu'en IPv4 (`listen 80;`) et BusyBox wget ne retente pas en IPv4.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
