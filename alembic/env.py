"""Alembic environment — reads DATABASE_URL from .env / environment.

Driver note: migrations deliberately use the SYNC psycopg2 driver,
because every migration file issues multi-statement SQL blocks, which
asyncpg's prepared-statement protocol cannot execute. psycopg2 is a
migration-only dependency (see requirements.txt); the application
runtime remains fully async on asyncpg.

Audit follow-up fixed here: previously neither alembic nor any sync
driver was declared in requirements.txt at all — `alembic upgrade
head` could not run on a machine built from requirements alone.
"""

import os
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv

# Load .env so DATABASE_URL is available
load_dotenv()

config = context.config

# Override sqlalchemy.url from environment
database_url = os.getenv("DATABASE_URL", "")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# No ORM metadata — we manage raw SQL migrations
target_metadata = None


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    from sqlalchemy import engine_from_config, pool

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
