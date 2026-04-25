#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
GIT_BRANCH="${GIT_BRANCH:-main}"
SKIP_BACKUP="${SKIP_BACKUP:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"

cd "$ROOT_DIR"

if [[ ! -f ".env" ]]; then
  echo ".env not found in $ROOT_DIR" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree on server is not clean. Refusing deploy." >&2
  git status --short >&2
  exit 1
fi

set -a
. ./.env
set +a

POSTGRES_DB="${POSTGRES_DB:-brunnenbau}"
POSTGRES_USER="${POSTGRES_USER:-brunnenbau}"
CURRENT_HEAD="$(git rev-parse --short HEAD)"

echo "Current server commit: $CURRENT_HEAD"
echo "Validating current compose configuration..."
docker compose -f "$COMPOSE_FILE" config >/dev/null

if [[ "$SKIP_BACKUP" != "1" ]]; then
  echo "Creating pre-deploy backup from current production state..."
  ./scripts/backup-stage1.sh
fi

echo "Fetching latest code from origin/$GIT_BRANCH..."
git fetch origin "$GIT_BRANCH"
git checkout "$GIT_BRANCH"
git pull --ff-only origin "$GIT_BRANCH"

TARGET_HEAD="$(git rev-parse --short HEAD)"
echo "Target server commit: $TARGET_HEAD"

echo "Validating updated compose configuration..."
docker compose -f "$COMPOSE_FILE" config >/dev/null

echo "Starting postgres..."
docker compose -f "$COMPOSE_FILE" up -d postgres

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

if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "Building backend and frontend images..."
  docker compose -f "$COMPOSE_FILE" build --pull backend frontend
fi

echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm backend npm run db:migrate:postgres

echo "Starting backend and frontend..."
docker compose -f "$COMPOSE_FILE" up -d backend frontend

echo "Waiting for backend health endpoint..."
for _ in {1..30}; do
  if docker compose -f "$COMPOSE_FILE" exec -T backend node -e "fetch('http://127.0.0.1:3001/api/health').then(async r => { const t = await r.text(); if (!r.ok) throw new Error(t); console.log(t); }).catch(err => { console.error(err.message); process.exit(1); })" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Pruning dangling images..."
docker image prune -f >/dev/null || true

echo "Deployment completed successfully: $CURRENT_HEAD -> $TARGET_HEAD"
