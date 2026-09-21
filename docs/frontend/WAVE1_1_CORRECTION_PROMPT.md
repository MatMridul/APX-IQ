# APX-IQ — Wave 1.1 Correction Seed Prompt for Antigravity

> Paste the block below into Antigravity. Scoped to VERIFIED defects only — Kiro checked every
> claim against the actual `ingestion/` and `ui/src/` code, not the report.
> Reviewer note: Kiro's earlier suspicion about the lap-delta field names was WRONG and is
> retracted — `universal_adapter.py:95` already handles the `MSPart`/`MinutesPart` split correctly
> with a `hasattr` guard and cross-version fallback. Do NOT touch that code.

---

Antigravity — Wave 1 is a real improvement and most of it is verified correct. Before Wave 2, one
confirmed defect and two verification-gaps must be closed. This is a small correction pass
(Wave 1.1), not a redo.

**What I verified as genuinely done (credit — no action needed):**
- Honesty regressions purged: zero matches for `4.8 KB/s`, `0.4ms`, `JITTER`, `apxColors` in `ui/src`. The fake connection monitor is gone.
- Phase 0 consolidation real: `components/f1/` gone, `components/intelligence/` migrated, `lib/theme/` deleted.
- Adapter extractors real: `extract_session` + `extract_participants` exist and are substantive; the four existing extractors gained their dropped fields with safe `getattr` defaults.
- Lap-delta + sector handling is CORRECT — it properly reads the split `m_deltaToCarInFront{MSPart,MinutesPart}` fields with a cross-version `hasattr` fallback. Leave it as-is.
- BattlePanel honestly badges the unmeasured chaser gap with `<SimBadge/>` instead of faking it. Correct.

**DEFECT 1 (confirmed against `ingestion/main.py`) — Session is claimed ✅ but is NEVER emitted.**
`extract_session()` exists in the adapter, but `main.py`'s packet dispatch loop has branches only for
packet ids 0 (motion), 4 (participants), 6 (telemetry), 2 (lap), 7 (status). **There is no
`packet_type_id == 1` branch and no `session_update` emit.** So `extract_session()` is dead code —
weather, track/air temp, safety-car status, session timer, totalLaps never leave the backend, and
StatusBar silently falls back to demo despite the report claiming "real trackTemp/airTemp/safetyCarStatus."
Fix:
1. Add an `elif packet_type_id == 1:` branch in `main.py` that calls `adapter.extract_session(packet)`
   and `await sio.emit("session_update", {...})` with the camelCase fields (trackTemp, airTemp,
   weather, totalLaps, trackLength, trackId, safetyCarStatus, sessionTimeLeft, sessionDuration, etc.).
2. Add the `session_update` socket handler in `ui/src/hooks/useTelemetry.ts`, extend the `SessionData`
   store type/fields, and wire it into the store (same refs→RAF→Zustand pattern, do not rewrite it).
3. Confirm StatusBar (and any weather surface) reads the real store fields, falling back to
   NoSignal/SIM only when genuinely absent.

**GAP 2 — the matrix ticked Session ✅ before it was true.** In
`docs/frontend/PROTOCOL_COMPLETENESS_MATRIX.md` §2, Session (ID 1) shows Adapt/Store/Render ✅, but
per Defect 1 it is Adapt-written-but-not-emitted. Correction rule going forward, and applied now:
**a cell is ✅ ONLY when a real value has been traced from packet → pixel, not when the code that
should do it was written.** After fixing Defect 1, Session ✅ becomes true; until then it must read ⚠️.
Also fix the stray blank line splitting the §2 table between the Car Status (7) and Final
Classification (8) rows — it breaks the table rendering.

**GAP 3 — prove it, don't assert it.** `tsc`/`pytest` green proves compilation and struct decoding,
not that a live value reaches the widget. For each newly-"live" widget (StatusBar weather/flag,
BattlePanel names/gaps, TrackMap yaw heading, BottomInstruments brake bias, RaceCarTelemetry
compound/age), add ONE assertion — via the recorded-frame replay harness — that the rendered value
is the real packet value (non-zero / non-default) when fed a real captured frame. This closes the
"`getattr` default silently hides a dead wire" gap that let Session look done.

**Process:** small single-concern fixes; re-verify against `main.py` + `useTelemetry.ts` (not the
report); update the matrix cells to reflect VERIFIED end-to-end truth after each fix. Post a short
confirmation (which branch now emits session, the store field names, the widget that renders it,
and the replay assertion result) before moving to Wave 2.

---
