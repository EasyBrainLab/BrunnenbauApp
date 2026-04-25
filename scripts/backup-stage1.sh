#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups/stage1}"

cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  echo ".env not found in $ROOT_DIR" >&2
  exit 1
fi

set -a
. ./.env
set +a

POSTGRES_DB="${POSTGRES_DB:-brunnenbau}"
POSTGRES_USER="${POSTGRES_USER:-brunnenbau}"

mkdir -p "$BACKUP_ROOT"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"
mkdir -p "$BACKUP_DIR"

echo "Starting postgres for backup..."
docker compose -f "$COMPOSE_FILE" up -d postgres >/dev/null

echo "Waiting for postgres..."
for _ in {1..30}; do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
  echo "Postgres did not become ready in time." >&2
  exit 1
fi

echo "Ensuring backend is available for upload backup..."
docker compose -f "$COMPOSE_FILE" up -d backend >/dev/null

BACKEND_CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps -q backend)"
if [[ -z "$BACKEND_CONTAINER_ID" ]]; then
  echo "Could not resolve backend container id." >&2
  exit 1
fi

echo "Dumping postgres..."
docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_DIR/postgres.sql"

echo "Copying uploads..."
docker cp "$BACKEND_CONTAINER_ID:/app/uploads" "$BACKUP_DIR/uploads"
tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$BACKUP_DIR" uploads
rm -rf "$BACKUP_DIR/uploads"

cat > "$BACKUP_DIR/manifest.json" <<EOF
{
  "created_at": "$(date -Iseconds)",
  "compose_file": "$COMPOSE_FILE",
  "postgres_db": "$POSTGRES_DB",
  "postgres_user": "$POSTGRES_USER",
  "artifacts": [
    "postgres.sql",
    "uploads.tar.gz"
  ]
}
EOF

echo "Backup created: $BACKUP_DIR"
