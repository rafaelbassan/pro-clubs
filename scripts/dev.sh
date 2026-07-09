#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Starting Postgres + API (Docker)..."
docker compose -f infra/docker-compose.yml up postgres api -d

echo "==> Waiting for API..."
for i in {1..30}; do
  if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    echo "API ready."
    break
  fi
  sleep 1
done

if ! curl -sf http://localhost:8000/health >/dev/null 2>&1; then
  echo "ERROR: API not responding on :8000"
  exit 1
fi

echo "==> Starting Next.js..."
cd apps/web
exec npm run dev
