# HANDOVER.md — APX-IQ Frontend Implementation (Antigravity)

> **You are Antigravity, taking over frontend implementation of a codebase that was
> majority-authored by another agent (Kiro) and its human owner (Mridul).**
> This document is BINDING. Read it fully before writing a single line. When this
> document and your own instincts disagree, this document wins. When this document
> and the spec docs disagree, ask — do not guess.

Repo root: `C:\Mridul\Programs\APXIQ\apx-iq-platform`
Frontend root: `ui/src`

---

## 0. Read these first, in this order (do not skip)

1. `docs/frontend/PRD.md` — what the frontend is for and the non-goals.
2. `docs/frontend/TRD.md` — verified current architecture, the debt, the phase plan.
3. `docs/frontend/DESIGN_SPEC.md` — the frozen visual contract.
4. `ui/src/design/README.md` — the codebase's OWN design law (token sources, palette lock).
5. `ui/src/design/MOTION.md` — the motion law ("numbers snap, physics flows").
6. `docs/internal/wiring_table.md` — the CONNECTED/UNWIRED ledger. Regenerate with
   `python scripts/wiring_audit.py`. This is your source of truth for what backend data actually exists.

You do not get to invent conventions. They already exist in files 4–5. Inherit them.

---

## 1. Prime rule: this is NOT a greenfield project

You are entering a codebase with a deliberate, documented design system and a correct,
exemplary live-data architecture. Your job is **consolidate + wire + polish per the specs** —
NOT to rewrite, NOT to re-architect, NOT to "improve" things that already work.

**The single biggest risk in this handover is redundancy** — you creating a second version
of something that already exists because you didn't look first. §2 exists to prevent exactly that.

---

## 2. ANTI-REDUNDANCY LAW (the reason this doc exists)

The codebase already has ONE of each of these. Do NOT create a second. Search before you write.

| Thing | The ONE that exists | If you feel the urge to make a new one |
| :--- | :--- | :--- |
| Color tokens | `ui/src/design/system.ts` (+ `globals.css` `@theme`) | STOP. Add the token here. Raw hex elsewhere = rejected. |
| Panel primitive | The unified `Panel` recipe (per DESIGN_SPEC §4) | STOP. Reuse it. Do not fork a new panel. |
| Micro-label | `MicroLabel` in `cockpit/primitives.tsx` (10px / 0.14em) | STOP. Use it. Do not invent a 9px variant. |
| No-data display | `NoSignal` in `cockpit/primitives.tsx` | STOP. Use it. Never render a fake number. |
| Sim marker | `SimBadge` in `cockpit/primitives.tsx` | STOP. Use it. |
| Live-data pipeline | `hooks/useTelemetry.ts` → `store/telemetryStore.ts` | STOP. It is correct. Do not replace it. |
| Live/demo seam | `useLiveOrDemo()` (you will CREATE this once, per TRD §2.1) | Create ONCE, then everything routes through it. |
| Demo generator | `lib/cockpit/demo.ts` | Extend it. Do NOT add a second synthetic source. |
| Canvas scheduler | `lib/cockpit/scheduler.ts` | Register a draw hook. Do not add a second rAF loop. |

### 2.1 Known duplication you must REMOVE, not add to
The codebase currently has TWO of some things (pre-existing debt). Your Phase 0 job is to
collapse them to one — never to add a third:
- **Two token sources:** `design/system.ts` (KEEP) vs `lib/theme/colors.ts` `apxColors` (DELETE).
  They have drifted (e.g. `apxColors.chartSpeed = gold` vs `system.ts traceSpeed = yellow`).
  `system.ts` wins. Migrate every `apxColors.*` reference, then delete `colors.ts`.
- **Two panel primitives:** `f1/primitives/Panel.tsx` vs cockpit primitives. Unify per DESIGN_SPEC §4.
- **Two component libs:** `components/cockpit/` (keep for cockpit) and `components/f1/`
  (rename to `components/intelligence/` and migrate). Do not leave both live.

### 2.2 The redundancy checklist (run before every new file/component/util)
1. `grep`/search the codebase for the concept by name AND by synonym.
2. Check the tables in §2 and the TRD consolidation table.
3. If something similar exists → extend/reuse it. If truly nothing → create ONE, in the right home.
4. Never duplicate a token, a primitive, a hook, or a synthetic-data source. Ever.

---

## 3. HARD PROHIBITIONS (a PR doing any of these is rejected)

1. **No raw hex / arbitrary colors** anywhere except `system.ts` / `globals.css`. Palette is
   locked (Black · Carbon · Silver · Gold + FIA signals + team-livery-as-data + white). No
   blue/cyan/emerald/orange except the two sanctioned exceptions (LED ramp blue; WET tyre blue in
   a compound-only context). See `design/README.md`.
2. **No fabricated data and no fabricated connection state.** Absent data = `NoSignal` (`—`).
   Synthetic data = `SimBadge`. NEVER render a plausible number or a fake "Connected / 60 Hz"
   state (the external audit's cardinal sin — see PRD §6.4). Honesty contract is absolute.
3. **No rewrite of the live-data pipeline.** `useTelemetry` refs→RAF→Zustand→selectors is correct
   and stays. Do not "modernize" it, do not swap Zustand, do not add re-renders to the 60 Hz path.
4. **No deletion of `demo.ts`.** It is the sanctioned, badged offline fallback (the owner is
   laptop-constrained and cannot always run sim+backend+UI). Extend it; never remove it.
5. **No scope creep into rejected features.** Do NOT build mastery rings, trophies, ghost-duel
   vaults, habit/retention loops, counterfactual lap sim, predictive setup physics, or radio NLG.
   These are PRD §6.2 (DEFER) and §6.3 (REJECT). If a task seems to need one, STOP and ask.
6. **No new backend capabilities.** Frontend only wires data that already exists per
   `wiring_table.md`. If a widget needs data the backend doesn't produce, mark it and ask — do not
   fake it and do not build the backend.
7. **No motion that violates MOTION.md.** Numbers snap; physics flows. No bounce/elastic/spring.
   Respect `prefers-reduced-motion` AND the in-app Motion Full/Reduced/Off toggle for every animation.
8. **No new dependencies** without stating why in the PR and pinning an exact version. Prefer what's
   already in `package.json`.

---

## 4. HOW TO WORK (process)

1. **Spec-first, always.** Every change traces to a requirement ID in PRD (e.g. P0-CK1) or a phase
   in TRD. If it maps to nothing, it's out of scope — don't do it.
2. **Follow the phase order in TRD §3.** Phase 0 (consolidation) unblocks everything and must land
   first. Do not start wiring (Phase 2) or polish (Phase 3) while duplication (Phase 0) is live.
3. **Small, reviewable PRs, one concern each.** A token migration, a panel unification, a single
   widget wire — separate PRs. No mega-PRs mixing consolidation + wiring + polish.
4. **Match existing style exactly.** Read a neighbouring cockpit component before writing one.
   Mirror its imports, its token usage, its primitive usage, its file layout. Consistency over
   personal preference.
5. **Verify before you claim done.** For every change:
   - `cd ui && npm run build` (Next build) and `tsc --noEmit` must pass clean.
   - `grep` proves no `apxColors` / no raw hex / no fabricated values remain (for the relevant change).
   - After Phase 2 wiring, regenerate `wiring_table.md` and confirm surfaced capabilities read WIRED.
6. **Prove live rendering via recorded-frame replay** (TRD §4), not by asserting it works. The
   cockpit must be shown rendering LIVE-shaped data through the same Socket.IO events, badged LIVE.
7. **Do not touch the backend, migrations, or `docs/internal/*` generators** unless a task
   explicitly says so. This is a frontend handover.
8. **When blocked or uncertain, STOP and ask the owner.** Especially at any §3 boundary. A wrong
   assumption that ships is worse than a question.

---

## 5. CODING STANDARDS (match the house style)

- **TypeScript strict.** No `any` on data contracts; reuse the types exported from `useTelemetry.ts`
  (`TelemetryData`, `LapData`, `SessionData`, `CarStatusData`, `DerivedMetrics`).
- **Tailwind token classes in JSX** (`text-gold`, `bg-carbon`, `border-gold/30`); `system.ts`
  literals only where classes can't reach (canvas paints, SVG fills, chart libs). Per `design/README.md`.
- **Numeric telemetry:** `font-mono tracking-tight tabular-nums` — mandatory (prevents layout shift).
- **Micro-labels:** `MicroLabel` primitive, or `text-[10px] font-mono uppercase tracking-[0.14em] text-silver/65`.
- **Canvas work** registers a draw hook on the shared scheduler; frame-rate-independent lerp
  (`v += (target - v) * (1 - exp(-k*dt))`); ≤ 2 ms/frame budget (MOTION.md §4).
- **Components stay source-agnostic** — they read from the store / `useLiveOrDemo()` seam, not from
  sockets directly. Only `useTelemetry` talks to the socket.
- **Comments explain WHY**, matching the existing terse, high-signal comment style (see `system.ts`,
  `telemetryStore.ts`). No narration of obvious code.
- **File homes:** cockpit → `components/cockpit/`; intelligence → `components/intelligence/` (post-rename);
  shared primitives → `components/cockpit/primitives.tsx` (or a promoted shared location if truly cross-cutting — ask first).

---

## 6. DEFINITION OF DONE (v1, from PRD §5)
1. Cockpit shows LIVE data (badged LIVE) at 60 Hz when the sim streams; badged SIM demo otherwise —
   never ambiguous.
2. Mission Control debrief reflects REAL lap telemetry and the REAL coaching feed.
3. ONE token source, ONE panel primitive; zero `apxColors` references; zero raw-hex drift.
4. `/debug` on the design system, reporting TRUE connection state.
5. No route fabricates data or a connection it doesn't have.
6. Build + typecheck clean; live rendering proven via replay; `wiring_table.md` shows surfaced
   capabilities WIRED.

---

## 7. ESCALATE (ask the owner) if any of these:
- A task appears to need a rejected/deferred feature (PRD §6.2/6.3).
- A widget needs backend data that `wiring_table.md` says doesn't exist.
- You believe a "frozen decision" (DESIGN_SPEC §9) is wrong — propose, don't override.
- You'd need a new dependency, a new token, or a new primitive that isn't clearly justified.
- The specs and this HANDOVER disagree.

When in doubt: reuse over create, ask over assume, honest `—` over a plausible number.
