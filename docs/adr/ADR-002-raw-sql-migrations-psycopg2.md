# ADR-002: Raw-SQL migrations on psycopg2; runtime stays asyncpg

- Status: Accepted
- Date: 2026-08-25
- Deciders: MatMridul, opencode agent

## Context

The audit found migrations were effectively unrunnable: `alembic` and any
sync driver were absent from requirements, and the first integration run
showed asyncpg cannot execute the multi-statement SQL blocks every
migration file uses (prepared-statement protocol limitation). Runtime code
is fully async on asyncpg.

## Decision

Keep alembic migrations as raw SQL executed by the **sync** `psycopg2`
driver (declared as a migration-only dependency). The application runtime
continues exclusively on asyncpg. No ORM; schema truth lives in SQL files.

## Consequences

+ Multi-statement DDL works unchanged across all existing migrations.
+ One dialect for humans reading schema history.
− Two Postgres drivers in the tree — acceptable, scoped to tooling;
  documented in `alembic/env.py` header and database_schema.md.
− Raw SQL means no autogenerate; schema drift is caught by integration
  tests round-tripping real tables.

Reversal cost: low per-migration (statements are portable), moderate for
the no-ORM stance itself.
