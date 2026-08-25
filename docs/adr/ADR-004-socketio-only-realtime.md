# ADR-004: Socket.IO is the only realtime path

- Status: Accepted
- Date: 2026-08-25
- Deciders: MatMridul, opencode agent

## Context

The API carried a complete WebSocket fan-out (`/ws`, ConnectionManager,
broadcast queue + worker) that the audit proved dead: zero producers, and
the UI actually consumes live telemetry from ingestion's Socket.IO server
on :3001. Two realtime channels invited drift and confusion.

## Decision

Delete the API's WebSocket layer entirely. Ingestion's Socket.IO endpoint
is the single live-telemetry channel (60 Hz-throttled, stealth_mode-
gated). The API remains request/response REST only.

## Consequences

+ One transport, one owner, one reconnect story in the UI.
+ Less surface for the security pass to cover.
− API consumers wanting push updates must subscribe to :3001 rather than
  the API — documented in AGENTS.md and api_map.md.

Reversal cost: low if ever needed — the deleted code is small and lives
in git history.
