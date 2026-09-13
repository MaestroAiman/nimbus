# Déploiement de Nimbus sur le Dell (serveur domestique)

Procédure manuelle pour installer et faire tourner Nimbus en production sur l'ancien PC
Dell qui sert de serveur domestique. Rien de cette procédure n'est exécuté à distance
depuis Claude Code : toutes les commandes ci-dessous sont à lancer **directement sur le
Dell** (console locale, ou SSH une fois Tailscale en place), par vous-même.

## 1. Rappel des contraintes matérielles

| Caractéristique | Valeur | Implication |
|---|---|---|
| CPU | Intel i5-5300U (2 cœurs / 4 threads) | Aucun build (`npm run build`, build d'image Docker) sur le Dell : les images sont construites sur le PC de dev, puis transférées (section 3). |
| RAM | 8 Go | Budget serré une fois OS + Docker + Postgres démarrés (~1.5-2.5 Go utilisés, voir `mem_limit` du compose prod) — marge confortable si la session graphique est désactivée (section 5). |
| OS | Xubuntu ou Lubuntu 24.04 LTS | Distribution basée Debian/Ubuntu : les paquets Docker officiels s'installent normalement. |
| Stockage | Disque du Dell (capacité limitée) | Fichiers uploadés sur un volume Docker dédié (`nimbus_api_prod_storage`), à surveiller (`df -h`, `docker system df`). |
| Réseau | Tailscale, pas d'ouverture de port routeur | Un seul port publié par Docker (`WEB_PORT`, reverse proxy Nginx), atteignable uniquement via le réseau Tailscale. |

Ces contraintes justifient chaque choix ci-dessous : pas de build local, pas de Kubernetes,
Postgres réglé bas (`shared_buffers=192MB`, `work_mem=8MB`, `max_connections=20`, déjà dans
`docker-compose.prod.yml`), un seul point d'entrée réseau (Nginx).

## 2. Installation du système et de Docker

### 2.1 Système d'exploitation

Installer Xubuntu ou Lubuntu 24.04 LTS (environnement léger, adapté aux 8 Go de RAM).

### 2.2 Docker Engine + plugin Compose

**Ne pas installer Docker Desktop** (superflu et plus lourd sur Linux) : utiliser le dépôt
officiel Docker, qui fournit `docker` (Engine) et le plugin `docker compose` :

```bash
# Dépendances et clé GPG officielle Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Depot Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Installation
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Utiliser docker sans sudo (necessite une reconnexion de session)
sudo usermod -aG docker $USER
```

Vérifier : `docker --version` et `docker compose version`.

### 2.3 Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Suivre le lien d'authentification affiché pour rattacher le Dell à votre tailnet. Noter
l'adresse Tailscale attribuée (`tailscale ip -4`) ou configurer un nom MagicDNS — c'est
cette adresse/nom qui servira d'origine publique de l'application (`BETTER_AUTH_URL`,
`CORS_ORIGIN`, voir section 4).

Aucune ouverture de port n'est nécessaire sur la box/routeur : Nginx écoute uniquement sur
l'interface Tailscale du point de vue de l'utilisateur distant (le port Docker publié reste
techniquement accessible sur toutes les interfaces du Dell, mais sans port forwarding sur
le routeur, il n'est atteignable que depuis le réseau local ou via Tailscale — un pare-feu
`ufw` restreint à l'interface `tailscale0` peut être ajouté en durcissement supplémentaire,
voir Étape 11).

## 3. Transfert des images Docker (PC de dev → Dell)

Les images sont **construites sur le PC de dev**, jamais sur le Dell. Deux stratégies :

### Option A (recommandée) — `docker save` / `docker load` via Tailscale

Ne nécessite aucun registre ni compte à configurer, transfert direct entre les deux
machines déjà reliées par Tailscale.

Sur le PC de dev, après avoir construit les images (`docker compose ... build`, voir
README) :

```bash
cd infra
docker compose --env-file .env.prod -p nimbus-prod -f docker-compose.prod.yml build
docker save nimbus-prod-api nimbus-prod-web -o nimbus-images.tar
# Adapter les noms d'images si Compose les a nommees differemment : verifier avec
# `docker compose -p nimbus-prod images`
scp nimbus-images.tar <utilisateur>@<adresse-tailscale-du-dell>:/tmp/
```

Sur le Dell :

```bash
docker load -i /tmp/nimbus-images.tar
rm /tmp/nimbus-images.tar
```

À refaire à chaque mise à jour de code (rebuild sur le PC de dev, re-`save`/`scp`/`load`).

### Option B (alternative) — registre GitHub Container Registry (GHCR)

Utile si vous préférez un flux de type CI/CD classique. Le dépôt GitHub du projet étant
privé, il faut un Personal Access Token (`write:packages` pour pousser, `read:packages`
pour tirer) des deux côtés.

Sur le PC de dev :

```bash
echo <PAT> | docker login ghcr.io -u <utilisateur-github> --password-stdin
docker tag nimbus-prod-api ghcr.io/<utilisateur-github>/nimbus-api:latest
docker tag nimbus-prod-web ghcr.io/<utilisateur-github>/nimbus-web:latest
docker push ghcr.io/<utilisateur-github>/nimbus-api:latest
docker push ghcr.io/<utilisateur-github>/nimbus-web:latest
```

Sur le Dell :

```bash
echo <PAT> | docker login ghcr.io -u <utilisateur-github> --password-stdin
docker pull ghcr.io/<utilisateur-github>/nimbus-api:latest
docker pull ghcr.io/<utilisateur-github>/nimbus-web:latest
```

(nécessiterait alors d'adapter `docker-compose.prod.yml` pour utiliser `image:` au lieu de
`build:` sur le Dell — non fait par défaut, l'option A suffit pour un usage domestique.)

## 4. Transfert de la configuration et démarrage

Transférer le dossier `infra/` (compose, `nginx/nginx.conf`) sur le Dell, par exemple via
`git clone` du dépôt privé (nécessite un accès SSH/PAT configuré sur le Dell) ou `scp` :

```bash
scp -r infra <utilisateur>@<adresse-tailscale-du-dell>:/opt/nimbus/infra
```

Sur le Dell, créer le fichier d'environnement de prod (jamais commité, à écrire
directement sur le Dell) :

```bash
cd /opt/nimbus/infra
cp .env.prod.example .env.prod
nano .env.prod   # POSTGRES_PASSWORD, BETTER_AUTH_SECRET (openssl rand -base64 32),
                  # BETTER_AUTH_URL et CORS_ORIGIN = origine Tailscale (ex.
                  # http://100.x.y.z:8080 ou http://dell.tailnet-name.ts.net:8080)
```

Démarrage manuel (pour une première vérification, avant de passer au service systemd) :

```bash
docker compose --env-file .env.prod -p nimbus-prod -f docker-compose.prod.yml up -d
```

> Le `docker-compose.prod.yml` transféré référence des `build:` (context `../apps/api`,
> `../apps/web`) — sur le Dell, ces répertoires n'existent pas puisque le code n'est pas
> cloné. Avec les images déjà chargées via `docker load` (section 3, mêmes noms/tags que
> ceux que Compose aurait construits), `docker compose up -d` (sans `--build`) réutilise
> directement les images présentes localement sans tenter de les reconstruire.

## 5. Service systemd (démarrage automatique au boot)

Créer `/etc/systemd/system/nimbus.service` :

```ini
[Unit]
Description=Nimbus (stack Docker Compose de production)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/nimbus/infra
ExecStart=/usr/bin/docker compose --env-file .env.prod -p nimbus-prod -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose --env-file .env.prod -p nimbus-prod -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Activation :

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nimbus.service
sudo systemctl status nimbus.service
```

La pile Nimbus démarre alors automatiquement à chaque redémarrage du Dell, y compris sans
session graphique ouverte (voir section 6).

## 6. Recommandations documentées (à appliquer manuellement, pas exécutées à distance)

### 6.1 Désactiver la session graphique (si le Dell sert uniquement de serveur)

Xubuntu/Lubuntu démarrent par défaut en `graphical.target`. Si le Dell n'est utilisé que
comme serveur Nimbus (pas de bureau local nécessaire), libérer la RAM/CPU associés à la
session graphique en démarrant en mode texte :

```bash
sudo systemctl set-default multi-user.target
sudo reboot
```

Pour revenir temporairement à une session graphique (maintenance locale) :
`sudo systemctl isolate graphical.target`, sans changer la cible par défaut.

**Ceci est une recommandation, pas une obligation** : si vous voulez garder un accès
bureau direct sur le Dell, restez en `graphical.target` — le budget RAM (section 2.4 de
Structure.md) inclut déjà une marge, juste plus confortable sans interface graphique.

### 6.2 Swap de sécurité (2–4 Go)

Filet de sécurité mémoire recommandé, même avec les `mem_limit` déjà actifs par service :

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Vérifier : `swapon --show` et `free -h`.

## 7. Vérification post-déploiement

Depuis une machine sur le même tailnet :

```bash
curl http://<adresse-ou-nom-tailscale-du-dell>:8080/api/health
# {"status":"ok"}
```

Puis dans un navigateur : ouvrir `http://<adresse-ou-nom-tailscale-du-dell>:8080`,
s'inscrire, se connecter, créer un dossier, uploader/télécharger un fichier — le tout sur
une seule origine (plus de `VITE_API_URL` séparée, voir étape 10 du suivi de projet).

Vérifier les limites mémoire actives : `docker inspect nimbus-prod-postgres-1 nimbus-prod-api-1 nimbus-prod-web-1 --format '{{.Name}}: {{.HostConfig.Memory}}'`.

## 8. Monitoring léger (étape 11)

Pas d'agent de supervision lourd (Prometheus/Grafana serait disproportionné pour un usage
domestique) : la surveillance repose sur deux mécanismes déjà en place, suffisants pour
détecter et réagir à une panne sans consommer de ressources supplémentaires notables.

- **Healthcheck applicatif** : `GET /api/health` (NestJS) répond `{"status":"ok"}`. Point
  d'entrée unique pour une vérification manuelle (`curl`) ou un futur outil externe simple
  (ex. un check Uptime Kuma/cron déjà existant ailleurs sur votre réseau, hors périmètre de
  ce projet).
- **`HEALTHCHECK` Docker** sur les images `api` (vérifie `/api/health` en Node pur, sans
  dépendance supplémentaire) et `web` (vérifie que Nginx répond, via `wget` déjà présent
  dans l'image `nginx:alpine`). Combiné à `restart: unless-stopped`, Docker relance
  automatiquement un conteneur qui devient `unhealthy` de façon prolongée. `web` attend
  explicitement que `api` soit `healthy` (`depends_on: condition: service_healthy`) avant
  de démarrer, pour éviter de servir le frontend avant que l'API ne soit réellement prête.

Vérifier l'état de santé de la pile à tout moment :

```bash
docker compose -p nimbus-prod ps
# ou, plus detaille :
docker inspect nimbus-prod-api-1 nimbus-prod-web-1 --format '{{.Name}}: {{.State.Health.Status}}'
```

## 9. Sauvegardes (étape 11)

Scripts fournis dans `infra/scripts/` : `backup.sh` (base Postgres + volume de stockage des
fichiers) et `restore.sh` (restauration, écrase les données actuelles). Testés de bout en
bout (création de données → sauvegarde → suppression → restauration → données bien de
retour) pendant le développement de cette étape.

### 9.1 Sauvegarde manuelle

```bash
cd /opt/nimbus/infra
./scripts/backup.sh
```

Produit deux fichiers horodatés dans `infra/backups/` (créé automatiquement, exclu du
dépôt Git) :
- `postgres-<date>.dump` — dump Postgres au format custom (`pg_dump -Fc`), restaurable
  avec `pg_restore`.
- `storage-<date>.tar.gz` — archive du volume Docker contenant les fichiers uploadés.

Ne conserve que les `RETENTION_COUNT` sauvegardes les plus récentes de chaque type (7 par
défaut) pour respecter la contrainte de disque limité du Dell (section 2.2) — ajuster via
`RETENTION_COUNT=14 ./scripts/backup.sh` si l'espace disque le permet.

**Recommandation** : copier périodiquement `infra/backups/` vers un support externe (clé
USB, autre machine du réseau via Tailscale) — un backup qui reste sur le même disque que
les données qu'il protège ne protège pas contre une panne de ce disque.

### 9.2 Planification automatique (cron)

```bash
crontab -e
```

Ajouter (sauvegarde quotidienne à 3h du matin, journalisée) :

```cron
0 3 * * * cd /opt/nimbus/infra && ./scripts/backup.sh >> /var/log/nimbus-backup.log 2>&1
```

### 9.3 Restauration (à tester périodiquement, pas seulement en cas de sinistre)

```bash
cd /opt/nimbus/infra
./scripts/restore.sh backups/postgres-<date>.dump backups/storage-<date>.tar.gz
```

Demande une confirmation explicite avant d'écraser les données actuelles (`--yes` pour
l'ignorer, usage scripté uniquement). Une sauvegarde jamais restaurée avec succès ne peut
pas être considérée comme fiable : reproduire cette procédure de temps en temps, y compris
sur une pile de test, est recommandé.

## 10. Mise à jour

1. Sur le PC de dev : `git pull`, puis reconstruire et retransférer les images (section 3).
2. Sur le Dell : `docker load -i nimbus-images.tar`, puis :
   ```bash
   cd /opt/nimbus/infra
   docker compose --env-file .env.prod -p nimbus-prod -f docker-compose.prod.yml up -d
   ```
   Docker Compose recrée uniquement les conteneurs dont l'image a changé.
3. Si `infra/` a changé (compose, `nginx.conf`) : retransférer le dossier avant de relancer
   la commande ci-dessus.
4. Avant toute mise à jour importante (changement de schéma de base, montée de version
   majeure) : lancer `./scripts/backup.sh` (section 9.1) au préalable.
