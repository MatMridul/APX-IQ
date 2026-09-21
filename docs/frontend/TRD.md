# APX-IQ Frontend — Technical Requirements Document (TRD)

> Status: DRAFT v1 · Owner: Mridul · Last updated: 2026-09-19
> Companion docs: [`PRD.md`](./PRD.md) (why/what) · [`DESIGN_SPEC.md`](./DESIGN_SPEC.md) (frozen design)
> Grounded in the actual `ui/src` tree as of 2026-09-19 (files cited below are real).

---

## 1. Current architecture (verified, not assumed)

### 1.1 Live-data pipeline — CORRECT and exemplary
`hooks/useTelemetry.ts` implements the right 60 Hz pattern:
`Socket.IO listeners → mutable refs → single RAF loop → Zustand store (setters) → granular selectors`.
Components subscribe via `useTelemetryStore(s => s.telemetry?.speed ?? 0)`, so React never re-renders
on the 60 Hz hot path. **Keep this. Do not touch the pattern.**

### 1.2 The gap — the cockpit doesn't use it
The cockpit components render `demoFrame(t)` from `lib/cockpit/demo.ts`, not the live store. The
live pipeline (§1.1) is fully wired but **the cockpit is not subscribed to it**. This is the
central defect: infrastructure exists, the last connection is missing.

### 1.3 Honesty primitives — ALREADY EXIST
`components/cockpit/primitives.tsx` already ships `SimBadge` ("Driven by the demo signal generator
— not live telemetry"), `NoSignal` (em-dash contract), and `MicroLabel`. The seam's building
blocks exist; we need the switch that chooses live vs demo and badges accordingly.

### 1.4 Known debt (verified in code)
- **Two color-token sources with DRIFTED values:**
  - `design/system.ts` — `COLOR`/`CHANNEL`; header declares "SOURCE OF TRUTH is globals.css @theme,
    no raw hex anywhere else."
  - `lib/theme/colors.ts` — `apxColors`, a *second full palette in raw hex* that violates that rule
    and has diverged (e.g. `chartSpeed: gold` here vs `traceSpeed: yellow` in system.ts; extra
    `goldMid`, `silverDark`). **This is a live drift bug.**
- **Two panel primitives:** `f1/primitives/Panel.tsx` (rounded-lg, corner accents, dot texture) vs
  `cockpit/PanelHeader.tsx` + `cockpit/primitives.tsx`. Hand-synced, subtly different padding/borders.
- **Two component libraries:** `components/cockpit/` (live-cockpit, newer) vs `components/f1/`
  (intelligence + legacy). Different token imports, different primitives.
- **Two synthetic sources:** `lib/cockpit/demo.ts` (cockpit) and `useMockData`-style synthetic
  payload behind `TelemetryDeltaChart.tsx` (intelligence, sine curves).

---

## 2. Target architecture

### 2.1 The `useLiveOrDemo()` seam (P0-DH3, P0-CK1)
Single hook that returns a source-tagged frame:

```ts
type Provenance = "LIVE" | "SIM" | "NO_SIGNAL";
interface SourcedFrame<T> { data: T | null; source: Provenance; }

// useLiveOrDemo():
//   isConnected (from store) && telemetry present  → { data: liveFrame, source: "LIVE" }
//   demo mode enabled (offline fallback)           → { data: demoFrame(t), source: "SIM" }
//   otherwise                                       → { data: null, source: "NO_SIGNAL" }
```

- The 60 Hz canvas path stays on refs+RAF; the seam only decides *which* ref feeds the loop.
- Components stay source-agnostic. A shared `<SourceBadge source>` renders LIVE/SIM/NoSignal at the
  panel level using the existing `SimBadge`/`NoSignal` primitives.
- `demo.ts` is preserved as a first-class **offline fallback**, never deleted (laptop-era constraint:
  can't run sim + backend + UI on one machine).

### 2.2 Consolidation targets
| Debt | Action | Keep | Retire |
| :--- | :--- | :--- | :--- |
| Tokens | One source of truth | `design/system.ts` (+ globals.css @theme mirror) | `lib/theme/colors.ts` (`apxColors`) |
| Panel primitive | One primitive | cockpit primitives + a shared `Panel` recipe | `f1/primitives/Panel.tsx` after migration |
| Component libs | One home | `components/cockpit/` for cockpit; `components/intelligence/` renamed from `f1/` | `components/f1/` namespace |
| Synthetic data | One generator interface | `lib/cockpit/demo.ts` extended to physics-plausible | intelligence sine-curve mock |

Token migration is mechanical: map every `apxColors.*` reference to the `COLOR.*` equivalent,
reconciling the drifted values to `system.ts` as the winner, then delete `colors.ts`.

### 2.3 Wiring the under-surfaced backend (PRD §4)
Each is "wire existing data to an existing widget," not new features:
- Real thermals → `RaceCarTelemetry` corner blocks (backend already records thermal/ERS; DB persist fixed commit f1864ed).
- Real live delta → `DeltaBar` / `TelemetryRibbon` ghost overlay.
- Structured coaching feed → `InsightFeed` / `AiEngineerBriefingBox` (coaching pipeline wired commit a87d280; carries measured-vs-heuristic `estimated_impact_ms`).
- Real track geometry → `TrackMap` (backend `/track/{id}/layout`; currently unwired per wiring_table.md).
- Sectors/weather/ERS → status widgets.

Cross-check every wire against `docs/internal/wiring_table.md` (regenerable via
`python scripts/wiring_audit.py`) so we wire what actually exists and mark what doesn't.

---

## 3. Implementation phases (dependency-ordered)

Ordering is driven by the fact that **every valuable audit finding is blocked on data flowing**.
Fix the wire first; polish rides on top cheaply.

### Phase 0 — Design-system integrity (P0-DS1/DS2) · unblocks everything
- Collapse tokens to one source; delete `apxColors`; reconcile drift.
- Consolidate to one `Panel` primitive; migrate `f1` panels.
- No behavior change; pure de-duplication. Verifiable by build + visual diff.

### Phase 1 — The live/demo seam (P0-DH1/2/3, P0-CK1)
- Implement `useLiveOrDemo()` + `<SourceBadge>`.
- Subscribe the cockpit to the seam; demo becomes the badged fallback.
- **Live-proof mechanism** (see §4).

### Phase 2 — Wire the backend into widgets (P0-MC1/2, P1-CK2/3)
- Real delta chart + real coaching feed in Mission Control.
- Real thermals, ghost overlay, real track geometry in the cockpit.

### Phase 3 — On-lens polish (ADOPT bucket, PRD §6.1)
- Physics-plausible demo curves (replace sine waves).
- Loss-aversion messaging on existing deltas; dopamine micro-glow on real events.
- Landing standby state; `/debug` restyle onto design tokens.
- Optional audio cues (gated on MOTION switch).

Phases 2 and 3 items are independently shippable once Phases 0–1 land.

---

## 4. Live-proof strategy (the hard constraint)

Mridul is laptop-constrained: the F1 sim runs on a second laptop over UDP; running sim + backend +
UI simultaneously for iterative dev is impractical. The `useLiveOrDemo()` seam must be proven
against a **live-shaped** source without requiring the full two-laptop loop for every change.

**Recommended: recorded-frame replay.**
- Capture a real UDP session once (two-laptop setup) into a frame log.
- A replay harness feeds recorded frames through the *same* Socket.IO events (`telemetry_update`,
  `lap_update`, etc.) the live path uses.
- The seam sees LIVE-shaped data; the cockpit proves it renders live without the sim running.
- This is the frontend analogue of the in-process `prove_coaching_pipeline.py` harness already used
  on the backend.

Fallback if replay capture is blocked: keep SIM path as the dev default, and reserve one scheduled
two-laptop session to validate the LIVE path end-to-end before v1 sign-off.

---

## 5. Testing & verification
- **Phase 0:** `next build` + `tsc --noEmit` clean; visual regression on panels; grep proves zero
  `apxColors` references remain.
- **Phase 1:** unit test `useLiveOrDemo()` source selection (connected→LIVE, demo→SIM, neither→NO_SIGNAL);
  replay harness renders a captured session.
- **Phase 2:** each wire has a smoke test that the widget shows backend values (not demo constants).
- Regenerate `wiring_table.md` after Phase 2; UNWIRED count for surfaced capabilities → 0.

## 6. Explicit non-goals (TRD level)
- No rewrite of the RAF/Zustand pipeline (§1.1) — it is correct.
- No deletion of `demo.ts` — it is the sanctioned offline fallback.
- No new backend capabilities (rules out DEFER bucket features, PRD §6.2).
