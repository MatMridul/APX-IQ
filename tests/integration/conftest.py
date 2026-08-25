"""
Integration test configuration.

These tests boot the REAL application against a REAL PostgreSQL database:
migrations are applied, services bind the actual asyncpg pool, and HTTP
calls round-trip through FastAPI. This suite exists to catch the class of
bug the 2026-08 audit found (Category A): code paths that were only ever
exercised against in-memory fallbacks.

Run explicitly — never mixed into the unit pass:

    # Local:
    docker run -d --name apxiq-pg -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=apxiq_test -p 5433:5432 postgres:16-alpine
    DATABASE_URL=postgresql://postgres:postgres@localhost:5433/apxiq_test \
        pytest -m integration

    # CI: backend-ci.yml provisions a Postgres service container and runs
    # `alembic upgrade head` + `pytest -m integration` as dedicated steps.

IMPORTANT: DATABASE_URL must be set BEFORE pytest starts (core.config
reads it once at import time). Unit tests must run WITHOUT it so they
exercise the in-memory path.
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATABASE_URL = os.getenv("DATABASE_URL", "")

requires_db = pytest.mark.skipif(
    not DATABASE_URL,
    reason="DATABASE_URL not set — integration suite needs live PostgreSQL",
)


def _run_migrations() -> None:
    """Apply all migrations once per session so schema matches HEAD."""
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"alembic upgrade head failed:\n{result.stdout}\n{result.stderr}"
        )


@pytest.fixture(scope="session", autouse=True)
def _migrated_database():
    if not DATABASE_URL:
        yield
        return
    _run_migrations()
    yield


@pytest.fixture()
def client():
    """TestClient with lifespan — services bound to the real asyncpg pool."""
    from fastapi.testclient import TestClient
    from api.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def wiped(client):
    """
    Clean slate before each test via the API's own guarded endpoints.
    Uses unique session_uids per test, so leftover sessions rows are inert.
    """
    client.delete("/telemetry/laps/clear")
    client.delete("/intelligence/reports/clear")
    yield
