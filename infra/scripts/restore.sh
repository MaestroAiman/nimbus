#!/usr/bin/env bash
# Restaure une sauvegarde Nimbus (base Postgres + stockage fichiers) produite par backup.sh.
#
# ATTENTION : ECRASE les donnees actuelles de la pile ciblee. A utiliser en cas de sinistre
# (disque du Dell corrompu, restauration sur une nouvelle machine, etc.), ou pour verifier
# qu'une sauvegarde est effectivement restaurable (voir Definition of Done de l'etape 11).
#
# Usage : ./restore.sh <postgres-dump-file> <storage-tar-file> [--yes]
#   --yes  ignore la confirmation interactive (usage scripte/CI uniquement)
#
# Variables d'environnement optionnelles :
#   COMPOSE_PROJECT  (defaut: nimbus-prod)
#   COMPOSE_FILE     (defaut: docker-compose.prod.yml)
#   ENV_FILE         (defaut: .env.prod)
set -euo pipefail

COMPOSE_PROJECT="${COMPOSE_PROJECT:-nimbus-prod}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"

POSTGRES_DUMP=""
STORAGE_TAR=""
ASSUME_YES=false
for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=true ;;
    *)
      if [ -z "$POSTGRES_DUMP" ]; then POSTGRES_DUMP="$arg";
      elif [ -z "$STORAGE_TAR" ]; then STORAGE_TAR="$arg";
      fi
      ;;
  esac
done

if [ -z "$POSTGRES_DUMP" ] || [ -z "$STORAGE_TAR" ]; then
  echo "Usage: $0 <postgres-dump-file> <storage-tar-file> [--yes]" >&2
  exit 1
fi

POSTGRES_DUMP="$(realpath "$POSTGRES_DUMP")"
STORAGE_TAR="$(realpath "$STORAGE_TAR")"

cd "$(dirname "$0")/.."

if [ ! -f "$ENV_FILE" ]; then
  echo "Fichier d'environnement introuvable : $ENV_FILE (voir .env.prod.example)" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ "$ASSUME_YES" != "true" ]; then
  read -r -p "Ceci va ECRASER les donnees actuelles de '$COMPOSE_PROJECT'. Continuer ? [y/N] " confirm
  case "$confirm" in
    y|Y) ;;
    *) echo "Annule."; exit 1 ;;
  esac
fi

echo "==> Restauration de la base Postgres depuis $POSTGRES_DUMP..."
docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore -U "${POSTGRES_USER:-nimbus}" -d "${POSTGRES_DB:-nimbus}" --clean --if-exists \
  < "$POSTGRES_DUMP"

echo "==> Restauration du volume de stockage des fichiers depuis $STORAGE_TAR..."
STORAGE_VOLUME="${COMPOSE_PROJECT}_nimbus_api_prod_storage"
docker run --rm \
  -v "${STORAGE_VOLUME}:/data" \
  -v "$(dirname "$STORAGE_TAR"):/backup:ro" \
  alpine:3 \
  sh -c "find /data -mindepth 1 -delete && tar xzf /backup/$(basename "$STORAGE_TAR") -C /data"

echo "==> Restauration terminee."
