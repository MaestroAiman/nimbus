#!/usr/bin/env bash
# Sauvegarde la base Postgres et le stockage de fichiers de la pile de production Nimbus.
#
# A executer depuis n'importe quel repertoire (le script se replace lui-meme dans infra/) sur
# la machine qui heberge la pile Docker (le Dell, ou le PC de dev pour verification). Pense a
# etre lance regulierement via cron/systemd timer sur le Dell, voir docs/deploiement-dell.md.
#
# Conserve les RETENTION_COUNT dernieres sauvegardes de chaque type et supprime les plus
# anciennes : contrainte de disque limite documentee en section 2.2 de Structure.md.
#
# Variables d'environnement optionnelles :
#   COMPOSE_PROJECT  (defaut: nimbus-prod)
#   COMPOSE_FILE     (defaut: docker-compose.prod.yml)
#   ENV_FILE         (defaut: .env.prod)
#   BACKUP_DIR       (defaut: ./backups)
#   RETENTION_COUNT  (defaut: 7)
set -euo pipefail

COMPOSE_PROJECT="${COMPOSE_PROJECT:-nimbus-prod}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_COUNT="${RETENTION_COUNT:-7}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

cd "$(dirname "$0")/.."

if [ ! -f "$ENV_FILE" ]; then
  echo "Fichier d'environnement introuvable : $ENV_FILE (voir .env.prod.example)" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"

echo "==> Sauvegarde de la base Postgres (projet '$COMPOSE_PROJECT')..."
docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-nimbus}" -d "${POSTGRES_DB:-nimbus}" -Fc \
  > "$BACKUP_DIR/postgres-$TIMESTAMP.dump"

echo "==> Sauvegarde du volume de stockage des fichiers..."
STORAGE_VOLUME="${COMPOSE_PROJECT}_nimbus_api_prod_storage"
docker run --rm \
  -v "${STORAGE_VOLUME}:/data:ro" \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine:3 \
  tar czf "/backup/storage-$TIMESTAMP.tar.gz" -C /data .

echo "==> Rotation (conserve les $RETENTION_COUNT dernieres sauvegardes de chaque type)..."
for prefix in postgres storage; do
  # shellcheck disable=SC2012
  ls -1t "$BACKUP_DIR"/${prefix}-*.* 2>/dev/null | tail -n "+$((RETENTION_COUNT + 1))" | while read -r old; do
    echo "  suppression de $old"
    rm -f "$old"
  done
done

echo "==> Sauvegarde terminee :"
echo "    $BACKUP_DIR/postgres-$TIMESTAMP.dump"
echo "    $BACKUP_DIR/storage-$TIMESTAMP.tar.gz"
