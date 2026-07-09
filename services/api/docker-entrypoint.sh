#!/bin/sh
set -e

echo "Running database migrations..."
if alembic upgrade head; then
  echo "Migrations OK"
else
  echo "WARNING: migrations failed — starting API anyway (check DATABASE_URL)"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
