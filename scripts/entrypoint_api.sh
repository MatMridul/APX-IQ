#!/usr/bin/env sh
set -e

echo "=== APX-IQ Backend Startup ==="

# Check and execute database migrations if DATABASE_URL is configured
if [ -n "$DATABASE_URL" ]; then
    echo "[APX-IQ] DATABASE_URL detected. Applying schema migrations..."
    alembic upgrade head || echo "[APX-IQ] Warning: Alembic upgrade encountered an issue or was skipped."
else
    echo "[APX-IQ] No DATABASE_URL set. Running in stateless in-memory mode."
fi

PORT="${PORT:-8000}"
echo "[APX-IQ] Launching FastAPI on 0.0.0.0:${PORT}..."
exec uvicorn api.main:app --host 0.0.0.0 --port "${PORT}"
