# APX IQ — v1.0.0 Definition (DRAFT for advisory review)

> Status: DRAFT — input requested from advisor discussions before tag.
> Owner: MatMridul · Prepared by: opencode agent · 2026-08-25
> Companion reading: AGENTS.md, docs/internal/technical_debt.md

Purpose of this document: agree, **before** tagging, what "stable v1.0"
means so the number carries honest meaning. Structured as:
baseline → three candidate scopes → open decisions → exit criteria.

---

## 1. Baseline (already true today, evidence-backed)

| Capability | State | Proof |
|---|---|---|
| UDP ingestion F1 2020–25 | Working | decoder/adapter unit tests, multi-version suite |
| Live cockpit dashboard | Working | Socket.IO :3001 → Zustand; bridge app-wide |
| Lap persistence (Postgres) | Working & idempotent | 7 integration tests on PG16 |
| Session tracking | Wired end-to-end | session/start bridge → SessionManager |
| Intelligence pipeline | Working | align→corners→delta→coach (+physics tests) |
| AI debriefs w/ fallback | Ollama→Gemini→template, SSE stream | report_generator |
| Ghost laps + track layouts | FastF1-backed, cached | ghost/layout endpoints |
| Quality gates | All blocking in CI | ruff·pytest(unit+integration PG16)·tsc·eslint·build |
| Docs | Truthful & lean | rewritten 2026-08-25 |

Known gaps today: no authn (admin-key deletes only), single-user
assumptions (process-level engine state), no deployment story beyond
"three terminals", ESLint warnings backlog, dependency audits report-only.

---

## 2. Candidate Scopes

### Option A — "Minimal Honest 1.0"
Ship the platform as-is, plus release engineering.
+ Release notes state limitations plainly (local-only, single-user).
+ Polish: README screenshots/GIF, LICENSE file chosen, CONTRIBUTING stub.
+ First real Actions runs green & required checks configured.
~ Effort: days. Risk: low. Security posture unchanged (documented).

### Option B — "Hardened Local 1.0" ⭐ (my recommendation)
A + security floor appropriate for a tool that listens on your LAN:
1. **Auth-lite**: `ADMIN_API_KEY` becomes required-by-default for ALL
   mutating endpoints (save/clear/generate), optional-read mode via env
   (`AUTH_MODE=open|key`). Ingestion↔API shares a static token.
2. **Strix pass executed**; every Critical/High finding fixed or
   explicitly risk-accepted in technical_debt.md.
3. **One-command stack**: full-stack docker-compose (API+ingestion+UI+PG)
   with sane defaults; CORS defaults tightened to localhost origins.
4. Replace pickle cache serialisation (JSON/msgpack) — kills D4.
5. Dependency audits promoted to blocking (after baseline triage).
~ Effort: 1–2 weeks part-time. This is the smallest version where
  "stable" survives a roommate scanning your network.

### Option C — "Product 1.0"
B + product surface: multi-session engine scoping (T1), Career page UI on
the honest metrics API, cockpit polish pass, packaged release artifacts
(GHCR images / zip), support-matrix testing across F1 game versions.
~ Effort: 3–6 weeks. Only worth it if public users are a near-term goal.

---

## 3. Open Decisions (numbered for discussion)

| # | Question | Options & tradeoffs |
|---|---|---|
| Q1 | Semantics of the number | 1.0 at Option A (marketing-honest w/ caveats) vs at B (defensible) vs post-C |
| Q2 | Auth model for local-first | none+docs / key-on-mutating / full token auth — friction vs exposure |
| Q3 | Deployment target for 1.0 | localhost-only vs LAN-demoable vs VPS/cloud — decides TLS, CORS, secrets mgmt |
| Q4 | TimescaleDB image in compose | keep (future-proof) vs swap to plain postgres (smaller surface) until needed |
| Q5 | Multi-session scoping (T1) | defer to v1.x (single-player truth) vs fix now if C chosen |
| Q6 | Game-version support claim | claim 2020–25 all, or officially support 22–25 (sim-tested subset)? |
| Q7 | Release artifacts | tag+notes only vs GHCR images vs zip bundle |
| Q8 | License | MIT / GPL-3 / Apache-2 / proprietary-private |

## 4. Exit Criteria Template (fill per chosen option)

- [ ] Every blocking gate green on GitHub Actions (not just local)
- [ ] Branch protection active on main (PRs + required checks)
- [ ] Release notes generated from this repo's history, limitations stated
- [ ] Tag pushed; GitHub Release published
- [ ] (Option B) Strix findings triaged; no open Critical/High
- [ ] (Option B) One-command startup verified on a clean machine

---

## 5. Agent Recommendation

**Option B, tagged v1.0.0**, with Option C items explicitly deferred into
a published v1.1/v2 roadmap. Rationale: the platform's differentiator is
trustworthy telemetry intelligence; shipping 1.0 without the security
floor undermines that identity, while Option C's features are roadmap,
not stability. Q2/Q3 are the pivotal choices inside B.
