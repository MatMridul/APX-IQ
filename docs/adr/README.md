# Architecture Decision Records

Short-lived context dies; decisions shouldn't. One ADR per significant,
hard-to-reverse choice. Format: context → decision → consequences.
Statuses: Accepted | Superseded by ADR-XXX.

Index:
- ADR-001: Split ingestion and API into two processes
- ADR-002: Raw-SQL migrations on psycopg2; runtime stays asyncpg
- ADR-003: Storage behind Protocol + factory (DB/memory swap)
- ADR-004: Socket.IO is the only realtime path
- ADR-005: Defer TimescaleDB despite shipping the image

New ADRs: copy `_template.md`, increment number, link from here.
