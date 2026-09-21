# APX-IQ Frontend — Product Requirements Document (PRD)

> Status: DRAFT v1 · Owner: Mridul · Last updated: 2026-09-19
> Companion docs: [`TRD.md`](./TRD.md) (how) · [`DESIGN_SPEC.md`](./DESIGN_SPEC.md) (frozen design)
> Inputs: internal 3-agent frontend audit (2026-09-18), Antigravity external UI audit (2026-09-19)

---

## 1. Why this document exists

The UI was built without a PRD, grew organically, and was rebuilt mid-project. Both audits
confirm the *visual thesis is genuinely good* (cockpit rated 8–9/10, "not AI slop") but the
platform's rich backend is under-surfaced and the cockpit renders synthetic demo data, not live
telemetry. This PRD freezes **what the frontend is for and who it serves** so future work stops
being organic and starts being spec-driven.

This is not a rewrite mandate. It is a consolidate-and-wire mandate.

---

## 2. Product definition (the north star)

**APX-IQ is a personal sim-racing cockpit and an F1-application flagship — a real race
engineer's workbench, not a consumer engagement product.**

Two lenses, in priority order:

1. **Sim-cockpit-first** — a driver running an F1 sim (via UDP telemetry) sees a broadcast-grade,
   FIA-timing-grade live cockpit and gets real coaching from real data.
2. **Flagship demonstrator** — the UI is a portfolio-grade proof of the platform's engineering
   depth (60 Hz canvas, real thermals, structured coaching, real track geometry).

### 2.1 What APX-IQ is NOT (explicit non-goals)

- NOT a consumer SaaS optimizing daily-active-users / retention KPIs.
- NOT a habit-loop / engagement product. We do not build "come back tomorrow" mechanics.
- NOT a social/competitive platform (leaderboards, trophy vaults, multiplayer duels).

This distinction is the single most important filter applied to the Antigravity audit (§6).

---

## 3. Users & primary jobs-to-be-done

| User | Job | Primary surface |
| :--- | :--- | :--- |
| Driver (live) | "Show me what I need at 300 km/h with zero mental translation." | `/dashboard` cockpit |
| Driver (debrief) | "Where did I lose time and how do I fix it?" | `/dashboard/intelligence` |
| Builder/Mridul | "Prove the platform's depth is real and connected." | all routes + `/debug` |

---

## 4. Product requirements (the WHAT)

Requirements are tagged **[P0]** (v1-blocking), **[P1]** (v1-desirable), **[P2]** (post-v1).

### 4.1 Data honesty (foundational)
- **[P0-DH1]** Every rendered value must declare its provenance: **LIVE**, **SIM** (demo generator),
  or **NO SIGNAL**. The user must never mistake demo data for live telemetry.
- **[P0-DH2]** Absent data renders as the em-dash `NoSignal` contract, never a fabricated value.
- **[P0-DH3]** A single `useLiveOrDemo()` seam decides live-vs-demo once; components stay source-agnostic.

### 4.2 Live cockpit (`/dashboard`)
- **[P0-CK1]** The cockpit renders **live telemetry** when a UDP stream is connected, falling back to
  the demo generator (clearly badged SIM) when it is not.
- **[P1-CK2]** Real track geometry per circuit (from backend layout), not a single parametric loop.
- **[P1-CK3]** Ghost/delta overlay on the telemetry ribbon against session-best.
- **[P2-CK4]** Interactive wheel controls (OT/STRAT/BB±) — deferred; needs command channel.

### 4.3 Mission Control (`/dashboard/intelligence`)
- **[P0-MC1]** Telemetry delta chart is driven by **real lap data** from the backend, not synthetic sine curves.
- **[P0-MC2]** AI debrief renders the **real structured coaching feed** (measured vs heuristic impact split).
- **[P1-MC3]** Debrief expand keeps column layout balanced (drawer/modal, not inline growth).
- **[P2-MC4]** Setup-matrix → predictive-delta simulation — deferred; needs a physics/estimation backend.

### 4.4 Landing (`/`)
- **[P1-LP1]** No empty "void" when telemetry is absent — show a standby/idle state, not a collapsed DOM.
- **[P1-LP2]** Portal cards carry honest capability chips (real specs, not aspirational).

### 4.5 System diagnostics (`/debug`)
- **[P1-DB1]** Restyle onto the APX-IQ carbon/gold design system (currently generic gray).
- **[P1-DB2]** Show real connection/rate/latency; never fabricate a "connected" state.

### 4.6 Design system integrity
- **[P0-DS1]** Exactly ONE color-token source of truth. The current `design/system.ts` vs
  `lib/theme/colors.ts` duplication (with drifted values) is a bug and must be collapsed.
- **[P0-DS2]** Exactly ONE panel primitive. The `cockpit/` and `f1/primitives/Panel` duplication is consolidated.

---

## 5. Success criteria (v1 "done")

1. A driver runs the sim → the cockpit shows **live** data, badged LIVE, at 60 Hz.
2. With no sim running, the same cockpit shows demo data, badged **SIM** — never ambiguous.
3. Mission Control debrief reflects **real** lap telemetry and the **real** coaching feed.
4. One token source, one panel primitive; no raw-hex drift.
5. `/debug` looks like APX-IQ and reports true connection state.
6. No route fabricates data or a connection state it does not have.

---

## 6. Audit reconciliation — the three buckets

Both audits agree on the visual thesis and the concrete gaps. Antigravity was asked specifically for
*psychology-enabled retention design without changing core product/features*. Its findings are
sorted into three buckets; this is a **decision on record**, not an omission.

### 6.1 ADOPT — pure UX, no new backend, on-lens
- Flow-state / preattentive HUD design (color, position, shape; zero prefrontal load). *Matches our cockpit thesis.*
- Loss-aversion **messaging** on existing data ("bleeding 0.24s in T4" vs "+0.24s"). Label change only.
- Dopamine reinforcement on **existing** events (delta zero-cross micro-glow, thermal color shifts, purple-sector flash).
- Audio state cues (shift beep, pit alert) — optional, respects the MOTION switch.
- Authentic F1 detail: Pirelli compound colors, real track geometry, **physics-plausible demo curves** (braking cliffs, throttle steps, gearshift notches) replacing sine waves.
- Landing standby state (fixes the "void"); `/debug` restyle.

### 6.2 DEFER — real features masquerading as design (need backend that may not exist)
- Driver DNA Mastery rings (needs a mastery-scoring model).
- Counterfactual "best lap" telemetry callouts (needs counterfactual lap simulation).
- Predictive setup-physics simulator / "IKEA Effect engine" (needs a physics/estimation engine).
- Synthesized race-engineer radio (needs NLG + audio synthesis pipeline).

Logged as candidate **features** for a future PRD cycle — not v1 design tasks.

### 6.3 REJECT — wrong north star (§2.1)
- Consumer retention loops / habit-loop machinery / "daily habit" framing.
- Trophy vaults, ghost-duel trophies, stored-value/engagement-KPI mechanics.

**Rationale:** APX-IQ's goal is "get the driver faster + prove platform depth," not maximize DAU.
The psychology is adopted as *human-factors design principle* (Flow, loss-aversion phrasing,
dopamine on real events), and rejected as *engagement-KPI architecture*.

### 6.4 Critical caveat about the Antigravity audit
Antigravity graded the **demo as if it were live** (its `/debug` mock invents a "Connected / Live
UDP / 60.2 Hz" state that does not exist). Its scorecard has **no row for "is this wired to real
data?"** — which is *the* central issue. Treat it as a credible **design-eye** validator, not a
system-truth validator.

---

## 7. Out of scope for v1
- Interactive wheel command channel (CK4), predictive setup sim (MC4), and everything in §6.2.
- Any feature requiring a backend capability not already shipped and proven.
