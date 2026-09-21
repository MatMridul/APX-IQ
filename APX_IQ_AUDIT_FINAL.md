# APX IQ --- Engineering Audit

Repository: `MatMridul/APX-IQ` Branch audited: `main` Audit started:
2026-09-13

## Audit Method

Running record of a phase-by-phase audit against the actual public
GitHub repository. Each completed phase is appended before the next
phase.

Status labels: IMPLEMENTED; IMPLEMENTED / UNVERIFIED; PARTIAL; CLAIMED /
UNSUPPORTED; MISSING.

# Phase 0 --- Repository & Evidence Baseline

## Repository

-   Public repository: `MatMridul/APX-IQ`.
-   Default branch: `main`.
-   Not archived or disabled.
-   Primary detected language: Python.
-   GitHub metadata reports last push on 2026-08-26.
-   Repository description claims: "Real-time motorsport intelligence
    platform ingesting EA Sports F1 telemetry with analytics, ML models,
    and enterprise dashboards."
-   GitHub metadata currently reports no license.

## Structure

The repository has substantive layers for: - `ingestion/`: UDP listener,
decoder, packet structures, adapters, streaming/lap saving. - `api/`:
FastAPI app, routers, models, services. - `core/`: configuration,
database, cache, logging, session management. - `intelligence/`:
alignment, corner detection, delta, coaching, battle prediction,
hardware profiling, FastF1, reporting, recording. - `alembic/`:
migrations. - `tests/`: unit/contract and integration tests. - `ui/`:
Next.js frontend. - `scripts/`: simulators/utilities. - `docs/`:
architecture and internal documentation. - `.github/workflows/`: backend
and UI CI.

## Claims vs evidence

The README describes a coherent path: EA Sports F1 UDP → ingestion →
per-year decode/adaptation → Socket.IO → lap recorder → FastAPI →
PostgreSQL → intelligence engines → LLM debrief → Next.js/Zustand UI.

Corresponding repository layers/files exist. This establishes
architectural evidence only; later phases must verify runtime and
analytical correctness.

README claims include F1 2020--2025 ingestion, live cockpit, lap
persistence, AI coaching debriefs, real F1 ghost comparison, multiple
intelligence engines, Ollama/Gemini/template fallback, and Docker
Compose.

## Documentation maturity

`AGENTS.md` explicitly requires runnable evidence before declaring work
done and defines Ruff, unit, real-Postgres integration, TypeScript,
ESLint and build gates. The changelog records a prior audit/repair
campaign and fixes to previously broken/unwired paths.

This is a positive engineering signal, but documentation is not itself
proof of runtime correctness.

## v1 definition

`docs/internal/v1_definition.md` is explicitly marked DRAFT. It defines
minimal, hardened-local and product scopes, and recommends a hardened
local 1.0. It records security, authentication, deployment and
multi-session limitations.

## Technical debt

`docs/internal/technical_debt.md` explicitly records singleton state,
frontend warnings, manual scripts, unstable cache keys, missing
ingestion→API authentication, unauthenticated data endpoints, wildcard
CORS, default secret key, pickle Redis serialization and report-only
dependency audits.

These will be independently assessed later.

## CI baseline

Backend workflow includes dependency installation, blocking Ruff, unit
tests, PostgreSQL migration, real-Postgres integration tests and
report-only dependency auditing. This is a meaningful intended quality
gate. Actual run outcomes are deferred to the CI phase.

## Deployment baseline

A real `infra/docker-compose.yml` exists with database, API, ingestion
and UI services plus persistent DB storage. Separate API and ingestion
Dockerfiles also exist.

Important inconsistency: the README documents Compose, while the draft
v1 definition describes the deployment story as effectively "three
terminals." This likely means Compose exists but has not been verified
as a clean/production deployment; later phases must resolve this.

The ingestion container uses `network_mode: host`, explicitly noting
portability problems on Windows/macOS. This is a likely deployment issue
to inspect later.

## Initial evidence matrix

  Capability                   Phase 0 status
  ---------------------------- -------------------------------
  Public GitHub repository     IMPLEMENTED
  Multi-service architecture   IMPLEMENTED
  F1 telemetry ingestion       IMPLEMENTED / UNVERIFIED
  F1 2020--2025 support        IMPLEMENTED / UNVERIFIED
  Real-time Socket.IO path     IMPLEMENTED / UNVERIFIED
  PostgreSQL persistence       IMPLEMENTED / UNVERIFIED
  Intelligence pipeline        IMPLEMENTED / UNVERIFIED
  AI/LLM debriefs              IMPLEMENTED / UNVERIFIED
  FastF1 integration           IMPLEMENTED / UNVERIFIED
  "ML models" claim            CLAIMED / UNSUPPORTED FOR NOW
  Docker Compose stack         IMPLEMENTED
  Production deployment        MISSING / UNVERIFIED
  Automated CI                 IMPLEMENTED
  Public v1.0.0 release        MISSING
  License                      MISSING
  Security hardening           PARTIAL

## Initial red flags

### R0-1 --- "ML models" is unverified

The repository description claims ML models, but Phase 0 has not
established that the project contains an actual ML model. Phase 3 will
determine this explicitly.

**Priority: HIGH** for technical credibility.

### R0-2 --- Deployment documentation inconsistency

Compose exists, but the draft v1 definition describes the deployment
story as "three terminals." This likely reflects lack of deployment
verification rather than lack of configuration.

**Priority: MEDIUM.**

### R0-3 --- No license

GitHub metadata reports no license.

**Priority: MEDIUM** for open-source presentation; low for immediate
demo.

### R0-4 --- Maturity must not be inferred from documentation

CI, Docker and extensive docs make the repository look mature, but later
phases must prove the underlying implementation and runtime paths.

**Priority: HIGH** as an audit principle.

## Phase 0 verdict

APX IQ is a substantial, intentionally structured engineering project
rather than a superficial dashboard repository. It has enough
architecture and infrastructure to justify a serious code-level audit.

The two questions to attack next are: 1. Is the "ML" positioning
technically defensible? 2. Does the implementation/testing/runtime
evidence match the project's apparent maturity?

**Phase 0 complete.**

## Next

Phase 1 --- Architecture Audit: trace ingestion → normalization →
persistence → intelligence → API → Socket.IO → UI, and inspect service
boundaries, state ownership, coupling and failure points.

# Phase 1 --- Architecture Audit

## Scope

Traced the actual repository architecture across ingestion,
normalization, live streaming, recording, API/service boundaries,
persistence, session state and intelligence orchestration.

## 1. End-to-end architecture

The repository implements a genuine multi-process architecture:

`EA F1 UDP → ingestion listener/queue → decoder → year adapter → Socket.IO/UI + TelemetryRecorder → completed-lap HTTP POST → FastAPI services → PostgreSQL/in-memory storage → intelligence pipeline → REST/UI`.

This is not merely a folder-level architecture claim. The inspected code
connects these responsibilities.

### A1 --- Clear separation of hot and durable paths

The ingestion process separates: - a live Socket.IO path for cockpit
telemetry; - a buffered recorder/lap-saver path for durable persistence.

The packet processor consumes decoded packets, updates the recorder, and
emits selected live telemetry. Completed laps are shipped asynchronously
by a separate saver worker.

**Assessment: STRONG ARCHITECTURAL DECISION.**

### A2 --- Real queue boundary

`TelemetryListener` uses a bounded asyncio queue. Datagram reception
uses `put_nowait()`, so the UDP callback does not block on downstream
processing.

**Assessment: GOOD.**

When the queue fills, packets are dropped rather than blocking the UDP
receive callback. Drops are logged, but packet-loss metrics are not yet
exposed.

### A3 --- Deliberate packet batching and UI throttling

The packet processor drains up to 100 queued packets per iteration and
yields control. Socket.IO telemetry emission is throttled to
approximately 60 Hz.

**Assessment: GOOD LOCAL REAL-TIME DESIGN.**

The design distinguishes packet-processing throughput from UI rendering
rate.

## 2. Version normalization

The packet processor determines packet format and obtains a
version-specific adapter. Downstream code works with normalized fields
rather than branching throughout the intelligence layer.

The recorder uses normalized fields such as `distance_m`, `speed_kph`,
`throttle`, `brake`, `steer`, `gear`, `rpm`, `drs` and coordinates.

**Assessment: STRONG.**

This is one of APX IQ's strongest architectural decisions: protocol
differences are isolated from analysis logic.

## 3. Recorder architecture

`TelemetryRecorder` maintains latest snapshots for separate UDP packet
types and composes telemetry rows from them. It detects lap boundaries,
builds distance-indexed DataFrames and exposes completed laps to the
saver.

The design knowingly accepts temporal skew between packet types because
Motion, Car Telemetry and Lap Data arrive separately.

**Assessment: SOUND ARCHITECTURAL IDEA, BUT ANALYTICAL ASSUMPTION.**

The temporal-skew assumption needs quantitative validation for
braking/steering analysis.

## 4. API architecture

FastAPI uses lifespan setup and places service implementations on
`app.state`.

The storage layer has a protocol/factory boundary with both in-memory
and PostgreSQL implementations.

**Assessment: STRONG.**

This abstraction is justified: the router does not need to know whether
persistence is PostgreSQL or ephemeral development storage.

## 5. Persistence architecture

The database service: - ensures the parent session exists; - inserts
laps transactionally; - handles duplicate `(session_uid, lap_number)`
saves; - bulk-inserts telemetry; - treats duplicate telemetry distances
as no-ops.

The ingestion saver marks a lap acknowledged only after a successful API
response.

**Assessment: STRONG.**

This is substantially better than writing every UDP packet directly to
PostgreSQL.

## 6. Intelligence boundary

`AnalysisService` explicitly orchestrates:

`DistanceAligner → CornerDetector → DeltaEngine → CoachEngine`.

Heavy pandas/NumPy work is moved to a worker thread via
`asyncio.to_thread()`.

**Assessment: VERY GOOD.**

The project demonstrates awareness that an `async` endpoint can still
block the event loop if CPU-heavy work is performed directly.

## 7. Live UI architecture

The backend assigns live telemetry streaming to Socket.IO on the
ingestion process and explicitly removed an obsolete API WebSocket path.

**Assessment: GOOD.**

There is one clear realtime ownership path.

## 8. State ownership --- weakness

The API has process-level state for session context and battle
prediction, with one active session and one hardware profile.

**Assessment: ACCEPTABLE FOR CURRENT LOCAL/SINGLE-USER SCOPE; BLOCKER
FOR MULTI-USER DEPLOYMENT.**

This should not be refactored merely for portfolio polish.

## 9. Database failure behavior

If PostgreSQL is unavailable, the database layer logs the failure and
falls back to in-memory storage.

**Assessment: GOOD DEVELOPMENT FALLBACK; BAD DEFAULT FOR PRODUCTION.**

A configured-but-broken database can therefore become a persistence
failure while the application continues operating.

## 10. Health endpoint

`/health` exposes `db_connected`, but the top-level status remains
`"online"` even if the database is disconnected.

**Assessment: PARTIAL PRODUCTION READINESS.**

A deployment monitor could regard the service as healthy while durable
persistence is unavailable.

## 11. Cache boundary

Analysis results are cached using telemetry-derived keys. The current
implementation uses Python's built-in `hash()`.

**Assessment: FINE FOR CURRENT IN-PROCESS USE; NOT A DISTRIBUTED CACHE
KEY.**

This aligns with the project's own technical-debt entry.

## Architecture findings

### Strongest

1.  Version adapters isolate protocol complexity.
2.  Live and durable paths are separated.
3.  UDP receive is non-blocking.
4.  Persistence is transactional and retry-aware.
5.  API storage is abstracted cleanly.
6.  Intelligence engines have meaningful boundaries.
7.  CPU-heavy analysis is moved off the event loop.
8.  Dead realtime architecture was removed.

### Weakest

1.  Session state is single-user/process-scoped.
2.  Ingestion→API trust boundary has no authentication.
3.  DB failure can silently downgrade persistence.
4.  Health semantics are too optimistic.
5.  Cache key is process-local.
6.  Packet loss is not strongly observable.
7.  Packet-type temporal skew needs validation.

## Phase 1 evidence matrix

  ----------------------------------------------------------------------
  Capability             Status                 Assessment
  ---------------------- ---------------------- ------------------------
  UDP → queue boundary   IMPLEMENTED            Good bounded async
                                                design

  Decoder → version      IMPLEMENTED            Strong abstraction
  adapter boundary                              

  Adapter → normalized   IMPLEMENTED            Strong
  telemetry                                     

  Live Socket.IO path    IMPLEMENTED            Clear ownership

  Recorder → lap saver   IMPLEMENTED            Strong reliability
  boundary                                      design

  API service            IMPLEMENTED            Justified
  abstraction                                   protocol/factory

  PostgreSQL             IMPLEMENTED            Good
  transactional                                 
  persistence                                   

  Intelligence           IMPLEMENTED            Clean pipeline
  orchestration                                 

  Async event-loop       IMPLEMENTED            `asyncio.to_thread()`
  protection                                    

  Multi-session          PARTIAL                Single-session/process
  isolation                                     model

  Distributed cache      PARTIAL                Process-local hash key
  semantics                                     

  Production health      PARTIAL                DB failure still reports
  semantics                                     online

  Production trust       PARTIAL                Ingestion/API
  boundary                                      unauthenticated

  Data-loss              PARTIAL                Drops logged, not
  observability                                 quantified
  ----------------------------------------------------------------------

## Phase 1 verdict

**Architecture: 8.5/10 for a portfolio/local-first engineering
project.**

The architecture is not the part that needs a rewrite.

> **APX IQ has a legitimate systems architecture. The bigger credibility
> question is whether the telemetry processing and intelligence
> algorithms are correct, validated and honestly characterized.**

**Phase 1 complete.**

## Next

Phase 2 --- Implementation / Code Quality Audit.

# Phase 2 --- Implementation / Code Quality Audit

## Scope

Inspected implementation-level code in the ingestion decoder/adapter
path, recorder, analysis service, core configuration/cache,
delta/corner/coaching/hardware intelligence and report generation, plus
representative tests and repository-wide exception patterns.

This phase asks: **does the code actually implement what the
architecture says it implements, and is the implementation technically
defensible?**

------------------------------------------------------------------------

## 2.1 Major finding --- recorder data schema does not carry several intelligence inputs

`TelemetryRecorder._record_tick()` currently stores only:

-   distance
-   speed
-   throttle
-   brake
-   steer
-   gear
-   RPM
-   DRS
-   x/y/z

It does **not** store: - tyre surface temperature - tyre inner/core
temperature - brake temperature - ERS store energy

Yet `CoachEngine` contains rules specifically looking for: -
`tyres_surface_temp` - `tyres_inner_temp` - `brakes_temp` -
`ers_store_energy`

More importantly, `AnalysisService.run_pipeline()` calls:

`coach.analyze(delta, user_corners, ghost_corners)`

without supplying `user_telemetry_df`.

Therefore, in the current orchestrated analysis path, the thermal,
trail-braking and energy analysis branches that require raw telemetry
are not reached through that service call.

The trail-braking rule also needs raw `brake`, `steer`, and
`distance_m`, but because `user_telemetry_df` is omitted, it is likewise
not executed by the main analysis service.

**Status: PARTIAL / UNWIRED.**

This is a significant implementation finding because the repository's
intelligence surface is larger than the currently wired pipeline.

### Impact

-   Braking point comparison and apex-speed analysis are wired.
-   Time-loss-region analysis is wired.
-   Thermal, trail-braking and ERS coaching are implemented as
    functions, but not connected to the primary analysis-service call.
-   Their dedicated tests therefore prove the rule functions in
    isolation, not that the production pipeline invokes them.

**Priority: HIGH.**

------------------------------------------------------------------------

## 2.2 Major finding --- adapter extracts rich telemetry that the recorder discards

`UniversalPacketAdapter.extract_telemetry()` correctly extracts:

-   speed
-   throttle
-   brake
-   steer
-   gear
-   RPM
-   DRS
-   tyre surface temperatures
-   tyre inner temperatures
-   brake temperatures

The recorder, however, uses its own `_latest_car_telemetry` snapshot
containing only the first seven vehicle-control fields and never copies
the temperature arrays into the recorded row.

**Assessment: ARCHITECTURAL INTENT IS GOOD; IMPLEMENTATION IS
INCOMPLETE.**

This makes the gap especially clear: the data is already available at
ingestion time. The missing work is not a new telemetry-decoding
project; it is completing the normalization/storage path.

**Priority: HIGH.**

------------------------------------------------------------------------

## 2.3 Decoder implementation is clean and appropriately defensive

`PacketDecoder`: - rejects obviously short packets; - reads packet
format from the header; - maps supported formats 2020--2025 to the
correct ctypes module; - dispatches known packet IDs; - returns the
header for unknown packet IDs; - catches decode `ValueError` and logs
the failure.

**Assessment: GOOD.**

The decoder is small, explicit and easy to reason about. It does not
contain unnecessary metaprogramming or a giant version-specific
conditional tree.

The version mapping is centralized rather than scattered.

------------------------------------------------------------------------

## 2.4 Universal adapter is a strong implementation boundary

`UniversalPacketAdapter` provides normalized extraction methods for
motion, telemetry, lap data and car status.

The 2020 timing difference is handled explicitly: - F1 2020 uses
floating-point seconds; - 2021+ uses milliseconds.

Everything downstream receives canonical millisecond values.

**Assessment: GOOD / INTERVIEW-DEFENSIBLE.**

This is a real example of adapting an external binary protocol into an
internal canonical model.

------------------------------------------------------------------------

## 2.5 Delta engine's core integration formula is technically coherent

The time-delta implementation uses:

`dt = ds * 3.6 * (1/v_user - 1/v_ghost)`

and converts seconds to milliseconds.

The implementation clamps speeds to a minimum of 5 km/h to avoid
division by zero.

**Assessment: GOOD CORE IMPLEMENTATION.**

The unit conversion in the actual code is internally consistent.

The remaining question is not the formula itself; it is whether the
aligned speed traces and reference laps make the resulting integrated
delta physically meaningful. That belongs primarily to Phase 3.

------------------------------------------------------------------------

## 2.6 Potential semantic problem --- "max time gained/lost" metrics

`DeltaEngine` labels `max_time_gained_ms` and `max_time_lost_ms` as the
best/worst single-point gain/loss, but calculates them from
`np.diff(cumulative_time)`.

That is a **single grid-segment delta**, not the maximum cumulative
gain/loss over the lap.

This is not necessarily mathematically wrong, but the field
names/documentation could easily cause a consumer to interpret them as
cumulative extrema.

**Status: IMPLEMENTED / SEMANTICALLY MISLEADING.**

**Priority: MEDIUM.**

------------------------------------------------------------------------

## 2.7 Corner detector is simple and understandable, but its definitions are heuristic

The detector: 1. inverts speed; 2. uses `scipy.signal.find_peaks`; 3.
applies prominence and distance thresholds; 4. treats local speed minima
as apexes; 5. chooses the highest speed between the previous apex and
current apex as entry; 6. chooses the highest speed between current apex
and next apex as exit.

**Assessment: GOOD SIGNAL-PROCESSING IMPLEMENTATION; QUESTIONABLE
PHYSICAL DEFINITION.**

The code is clean and easy to test.

However, "highest speed before apex = braking entry" is not equivalent
to detecting the actual brake application point. It can select the end
of the preceding acceleration/straight region rather than the first
meaningful brake application.

Likewise, "highest speed after apex = exit" is not literally "where full
throttle resumes."

This matters because the coaching engine subsequently treats these
distances as braking and acceleration zones.

**Priority: HIGH for analytical validity; not necessarily a code-quality
blocker.**

------------------------------------------------------------------------

## 2.8 Corner matching is proximity-based rather than identity-aware

`CornerMap.get_corner_at_distance()` returns the closest corner within a
tolerance.

The comparison engine then matches user and ghost corners by distance.

This is reasonable after distance alignment, but it can mis-associate
corners when: - a track has closely spaced corners; - one lap has a
missed/extra detected apex; - detection thresholds produce different
corner counts.

There is no explicit one-to-one matching or sequence constraint in the
inspected implementation.

**Status: IMPLEMENTED / HEURISTIC.**

**Priority: MEDIUM-HIGH** if corner-level intelligence is to be marketed
as highly precise.

------------------------------------------------------------------------

## 2.9 Coaching engine contains useful domain logic but also hard-coded unsupported numbers

The coaching engine contains meaningful rules for: - braking - apex
speed - throttle - time-loss regions - thermals - trail braking - ERS

This is a legitimate deterministic intelligence layer. The code
explicitly describes itself as **not machine learning**.

However, several values are presented as concrete engineering thresholds
without evidence in the implementation for how they were calibrated.

Examples include: - \>5 km/h apex-speed difference; - \>10 km/h "faster
than ghost" caution; - 70% brake thresholds; - 0.35 steering
threshold; - 920°C brake threshold; - 106°C rear tyre threshold; - fixed
`time_impact_ms` estimates.

The particularly important one is `time_impact_ms`: values such as 85
ms, 110 ms, 120 ms, 150 ms and 250 ms are assigned to coaching events,
but the inspected code does not derive these from measured time loss.

**Assessment: DOMAIN-INSPIRED HEURISTICS, NOT EVIDENCE-BACKED
ENGINEERING METRICS.**

The system should present these as heuristic coaching scores/estimates
unless calibration data exists.

**Priority: HIGH for scientific credibility.**

------------------------------------------------------------------------

## 2.10 Hardware profiler is implemented, but its classifier claims are not yet scientifically established

The profiler genuinely performs: - steering derivative calculation; -
variance calculation; - threshold classification; - confidence
scoring; - FFT dominant-frequency analysis.

That is real signal processing.

However, the repository does not establish that the variance thresholds
reliably distinguish: keyboard → controller → entry wheel → mid wheel →
pro wheel.

The frequency assumptions are similarly heuristic.

There is also a conceptual issue: steering-signal derivative variance is
strongly affected by **driver behavior**, track, setup and sample
characteristics, not only input hardware.

Therefore:

**Status: IMPLEMENTED HEURISTIC CLASSIFIER.**

It should not currently be described as a validated
hardware-identification model.

**Priority: HIGH for technical honesty; LOW for immediate demo if
clearly framed as experimental.**

------------------------------------------------------------------------

## 2.11 Report generator is a presentation/LLM layer, not an ML intelligence engine

`ReportGenerator` supports: 1. local Ollama; 2. Gemini; 3. deterministic
template fallback.

The code builds a structured prompt from analysis outputs and sends it
to the selected LLM.

This is a useful application of LLMs.

But it is important to distinguish:

`telemetry analysis → deterministic intelligence → LLM explanation`

from:

`telemetry → trained ML model → prediction`

The inspected code supports the former.

**Assessment: IMPLEMENTED LLM INTEGRATION; NOT EVIDENCE OF A TRAINED ML
MODEL.**

This strengthens the Phase 0 concern around the repository description
claiming "ML models."

------------------------------------------------------------------------

## 2.12 Report generator contains a blocking-style HTTP call in backend discovery

`_check_ollama()` uses synchronous `httpx.get()` during backend
detection.

This occurs during `ReportGenerator` initialization rather than inside
an async request handler, so it is not automatically a production
event-loop bug.

Still, initialization can block for up to the configured two-second
timeout while checking Ollama.

**Assessment: ACCEPTABLE FOR LOCAL STARTUP; NOT IDEAL FOR
LATENCY-SENSITIVE SERVICE INITIALIZATION.**

**Priority: LOW.**

------------------------------------------------------------------------

## 2.13 Broad exception swallowing is overused

Repository-wide search finds broad `except Exception: pass` patterns
in: - `coach_engine.py`; - `report_generator.py`; -
`session_manager.py`; - simulator code.

In some places this is reasonable for optional telemetry parsing or
streaming chunk handling.

In intelligence code, however, swallowing exceptions can turn
**"analysis failed" into "no coaching tip."**

That is particularly dangerous for a telemetry-analysis application
because silent failure can look like a valid absence of insight.

**Assessment: CODE-QUALITY WEAKNESS.**

**Priority: HIGH** in intelligence paths; lower in intentionally
best-effort cleanup/simulator paths.

------------------------------------------------------------------------

## 2.14 Cache implementation is reasonably disciplined for a local cache

The in-memory cache: - enforces TTL; - uses monotonic time; - has a size
cap; - lazily evicts expired entries.

The Redis implementation also applies TTL.

This is a good repair over a naïve unlimited cache.

The known pickle concern remains a security issue rather than an
implementation-quality issue.

**Assessment: GOOD LOCAL IMPLEMENTATION.**

------------------------------------------------------------------------

## 2.15 Configuration is centralized, but production defaults are intentionally unsafe

`core.config.Settings` is a legitimate single source of configuration.

However, defaults include: - CORS `*`; - secret key
`"change-me-in-production"`; - no database URL; - no Redis URL.

The file explicitly describes these as local-development defaults.

**Assessment: GOOD DEVELOPMENT CONFIG; NOT SAFE PRODUCTION CONFIG.**

This belongs primarily in the security/reliability phases.

------------------------------------------------------------------------

## 2.16 Tests are meaningful but reveal a coverage-quality distinction

`test_storage_services.py` tests the public in-memory storage
contract: - save; - get; - list; - filtering; - clear; - factory
fallback.

`test_motorsport_physics.py` tests: - trail-braking oversaturation; -
thermal dissociation; - report template output.

These are not meaningless tests. They exercise actual rule behavior.

However, the thermal/trail tests test private methods directly, while
the main `AnalysisService` currently does not pass raw telemetry into
`CoachEngine`.

Therefore the tests can be green while the production pipeline remains
unwired.

**This is a critical lesson for the rest of the audit: passing unit
tests do not automatically establish end-to-end feature integration.**

------------------------------------------------------------------------

## 2.17 No TODO/FIXME markers found

Repository search for `TODO`, `FIXME`, `HACK`, and `XXX` returned no
matches.

This is neither inherently good nor bad. It simply means the project is
not leaving obvious work markers in source comments.

The project's actual technical-debt registry is therefore more useful
than inline TODO comments.

------------------------------------------------------------------------

# Phase 2 --- Evidence Matrix

  -----------------------------------------------------------------------
  Component               Status                  Finding
  ----------------------- ----------------------- -----------------------
  UDP decoder             IMPLEMENTED             Clean, explicit
                                                  dispatch

  2020--25 adapter        IMPLEMENTED             Strong boundary
  normalization                                   

  Recorder core           IMPLEMENTED             Functional lap assembly

  Recorder thermal/ERS    MISSING                 Adapter extracts them,
  capture                                         recorder discards them

  Main analysis pipeline  IMPLEMENTED             Align → corners → delta
                                                  → coach

  Thermal coaching        PARTIAL / UNWIRED       Raw telemetry not
  through pipeline                                passed

  Trail-braking coaching  PARTIAL / UNWIRED       Raw telemetry not
  through pipeline                                passed

  ERS coaching through    PARTIAL / UNWIRED       Raw telemetry not
  pipeline                                        passed

  Delta integration       IMPLEMENTED             Core formula coherent

  Corner detection        IMPLEMENTED / HEURISTIC Entry/exit definitions
                                                  need validation

  Corner matching         IMPLEMENTED / HEURISTIC Proximity matching only

  Coaching rules          IMPLEMENTED / HEURISTIC Useful but many
                                                  thresholds uncalibrated

  Hardware profiling      IMPLEMENTED / HEURISTIC Real signal processing;
                                                  validation absent

  LLM debrief             IMPLEMENTED             Real multi-backend
                                                  integration

  Trained ML model        NOT ESTABLISHED         No evidence yet

  Cache                   IMPLEMENTED             Good local TTL
                                                  implementation

  Configuration           IMPLEMENTED             Centralized

  Error handling          PARTIAL                 Broad exception
                                                  swallowing in important
                                                  paths

  Storage contract tests  IMPLEMENTED             Meaningful interface
                                                  tests

  Intelligence            PARTIAL                 Rule tests exist, main
  integration tests                               wiring gaps remain
  -----------------------------------------------------------------------

# Phase 2 --- Severity-ranked findings

## 🔴 High priority

### P2-1 --- Intelligence inputs are being dropped

Temperature, brake-temperature and ERS data are decoded but not
recorded, and the main analysis service does not pass raw telemetry into
the coaching engine.

**Why it matters:** several advertised intelligence capabilities are
currently not part of the primary pipeline.

### P2-2 --- Corner entry/exit definitions are heuristic

The implementation calls local maximum speed the braking entry and exit
points.

**Why it matters:** braking-distance and coaching conclusions depend
directly on these definitions.

### P2-3 --- Coaching thresholds are not demonstrably calibrated

Concrete engineering claims and time-impact estimates are hard-coded
without calibration evidence.

### P2-4 --- Broad exception swallowing

Important intelligence failures can disappear silently.

### P2-5 --- Hardware profiler is not validated

The implementation is real, but the classification boundaries are
currently assumptions rather than demonstrated empirical results.

## 🟡 Medium priority

### P2-6 --- Corner matching can mispair nearby/extra corners.

### P2-7 --- `max_time_gained/lost` naming can mislead consumers.

### P2-8 --- Report backend detection performs synchronous startup HTTP.

## 🟢 Good implementation decisions

-   Canonical adapter boundary.
-   Explicit packet decoding.
-   Correct-looking time-delta integration.
-   Background-thread execution for pandas/NumPy analysis.
-   Transactional/idempotent storage.
-   TTL-aware cache.
-   Meaningful contract/rule tests.
-   Clear deterministic-vs-LLM separation.

# Phase 2 Verdict

**Implementation/code quality: 7.5/10.**

The codebase contains genuine engineering work and several strong
implementation decisions.

But this phase found a more important issue than ordinary code
cleanliness:

> **APX IQ currently has a gap between what its intelligence modules can
> do individually and what the main production pipeline actually feeds
> them.**

The most concrete example is temperature/ERS/trail-braking analysis: the
adapter extracts relevant data, but the recorder drops it, and the
analysis service does not supply raw telemetry to the coach engine.

That is fixable without architectural surgery.

The second major concern is scientific framing. Several
sophisticated-sounding features are actually **heuristic algorithms with
hard-coded thresholds**, not validated models. That is completely
acceptable for a portfolio project if described honestly; it becomes a
problem only when the README/recruiter framing implies stronger
empirical/model-based claims than the code supports.

**Phase 2 complete.**

## Next

Phase 3 --- Intelligence / Scientific Validity Audit: independently
challenge alignment, corner detection, delta mathematics, coaching,
hardware profiling, battle prediction and AI debriefs, including what
each system can legitimately claim.

# Phase 3 --- Intelligence / Scientific Validity Audit

## Scope

This phase independently challenges whether APX IQ's analytical outputs
are mathematically, statistically and physically defensible --- separate
from whether the code is clean.

The central question is:

> **When APX IQ says "you lost time here," "brake later," "this is a
> corner," "you are likely to overtake," or "your hardware is a DD
> wheel," how strong is the evidence behind that statement?**

This phase distinguishes: - mathematically sound computation; - useful
engineering heuristic; - unvalidated assumption; - misleading/overstated
claim.

------------------------------------------------------------------------

# 3.1 Distance alignment --- mathematically reasonable, but the "S-Curve" claim is overstated

`DistanceAligner` puts both traces onto a common equidistant distance
grid and uses PCHIP interpolation for continuous channels.

This is a sensible method for comparing telemetry sampled at different
rates.

However, the module's documentation claims that PCHIP "guarantees
monotonicity preservation (no overshoot in throttle/brake)."

That is not the right general interpretation.

PCHIP preserves monotonicity of the **independent variable / interpolant
behavior for monotone data**, but it does not magically constrain
arbitrary telemetry channels to physical bounds such as `[0, 1]`.

For example, oscillating throttle/brake samples can still produce
interpolated values whose behavior needs explicit validation.

The implementation also: - forward/backward fills NaNs through linear
interpolation across row indices; - falls back to linear interpolation
if PCHIP fails; - uses the shorter observed track distance unless an
override is supplied.

Those are pragmatic choices, but they introduce assumptions.

### More important: track alignment is not the same as lap synchronization

The method assumes that equal distance from the start line corresponds
to comparable physical state between the game and real-world lap.

That is generally useful, but: - game and real-world track geometry can
differ; - start/finish references can differ; - telemetry distance can
wrap or be computed differently; - braking/apex positions can shift.

The code has a track-length ratio helper, but it does not appear to
reject or materially compensate for problematic ratios.

**Verdict: MATHEMATICALLY REASONABLE RESAMPLING, NOT PROOF OF PHYSICAL
ALIGNMENT.**

**Score: 8/10 for interpolation; 6/10 for physical correspondence.**

------------------------------------------------------------------------

# 3.2 The biggest conceptual issue --- game telemetry vs FastF1 telemetry is not necessarily a valid "ghost"

APX IQ compares EA Sports F1 telemetry against real-world Formula 1
telemetry retrieved through FastF1.

This is a fascinating product concept, but it is crucial to distinguish:

> **reference lap**

from

> **physically equivalent ghost lap.**

A real F1 car and an EA Sports F1 car are not necessarily running: -
identical vehicle physics; - identical tyre model; - identical aero; -
identical track surface; - identical fuel; - identical weather; -
identical setup; - identical assists; - identical braking model; -
identical ERS behavior.

The repository therefore cannot scientifically interpret every
difference from a real F1 telemetry trace as a driver error.

A user being 4 km/h slower at a corner than Verstappen's real-world
qualifying lap does not automatically mean the user should carry 4 km/h
more.

The real-world lap is best treated as a **reference/benchmark signal**,
not ground truth.

This is probably the single most important product-positioning point
discovered in the audit.

### Correct framing

Bad:

> "APX IQ determines exactly where you are losing time compared with a
> real F1 driver."

Defensible:

> "APX IQ compares game telemetry against real-world F1 reference
> telemetry to identify relative performance patterns and generate
> heuristic coaching."

That distinction makes the project much more scientifically credible.

------------------------------------------------------------------------

# 3.3 Delta mathematics --- the core calculation is sound

The engine integrates:

`dt = ds * 3.6 * (1/v_user - 1/v_ghost) * 1000`

with speed in km/h and distance in meters.

This is dimensionally coherent:

`seconds = meters / (km/h × 1000/3600)`

and the difference between user and reference segment travel time is
then accumulated.

Positive delta means the user requires more time over the segment.

Negative delta means the user is faster.

**Verdict: SOUND CORE MATHEMATICS.**

This is one of APX IQ's strongest technical components.

------------------------------------------------------------------------

# 3.4 But the integrated delta is only as meaningful as the reference and alignment

Even with correct mathematics, the final number can be misleading if: -
the two laps are not physically comparable; - the track coordinate
systems differ; - one trace has a different effective racing line; - one
trace contains different vehicle/setup conditions; - low-speed clamping
materially changes a hairpin segment.

The `MIN_SPEED_KPH = 5` clamp prevents numerical instability but also
means a true near-zero speed is replaced by 5 km/h.

That can matter in extreme low-speed telemetry.

For normal F1-style racing speeds, this is probably negligible.

**Verdict: MATHEMATICALLY SOUND; INTERPRETATION-CONDITIONAL.**

------------------------------------------------------------------------

# 3.5 "F1 TV-style delta" is a UI analogy, not a validation claim

The repository describes the result as an "F1 TV-style" running delta.

That is fine as a visualization analogy.

It should not be interpreted as proof that APX IQ reproduces the same
methodology used by professional timing systems.

The code is specifically computing a distance-integrated speed-derived
delta.

**Verdict: VALID PRODUCT LANGUAGE IF PRESENTED AS ANALOGY.**

------------------------------------------------------------------------

# 3.6 Corner detection --- useful signal processing, weak semantic guarantees

The detector finds local speed minima using `scipy.signal.find_peaks`.

That works surprisingly well for a first-pass automated track
segmentation.

But a speed minimum is not necessarily: - the geometric apex; - the
racing-line apex; - the braking point; - the throttle-on point.

The code's own `_build_corner()` demonstrates this.

### Entry

The "entry" is:

> highest speed between previous apex and current apex.

That is not "where braking begins."

If the car spends a long time at maximum speed before braking, the
algorithm can place the entry point at the start of that maximum-speed
plateau.

### Exit

The "exit" is:

> highest speed between current apex and next apex.

That is not "where full throttle resumes."

It may simply identify the next acceleration maximum.

Therefore the object model's terminology is stronger than the actual
detector.

**Verdict: APEX DETECTION = USEFUL. BRAKE/THROTTLE EVENT DETECTION = NOT
RELIABLE ENOUGH TO CLAIM LITERALLY.**

------------------------------------------------------------------------

# 3.7 Corner classification is game-independent only in name

Classification is hard-coded:

-   slow: \<100 km/h
-   medium: 100--170 km/h
-   fast: 170--250 km/h
-   flat-out: ≥250 km/h

These are understandable UX categories.

But they are not universally meaningful across: - tracks; - car
classes; - weather; - setups; - game versions; - real-world vs game
telemetry.

A 170 km/h apex does not intrinsically define the same corner class
across all circumstances.

**Verdict: UI HEURISTIC, NOT A UNIVERSAL VEHICLE-DYNAMICS CLASSIFIER.**

------------------------------------------------------------------------

# 3.8 Brake-point comparison inherits the corner-entry flaw

`DeltaEngine._compute_brake_point_deltas()` compares the
`entry_distance_m` values produced by `CornerDetector`.

So the brake-point delta is mathematically correct relative to the
detector's definition.

But if `entry_distance_m` is not actually the brake onset, then:

> "You braked 25m earlier"

really means:

> "The detected pre-apex speed maximum occurred 25m earlier."

That distinction matters.

**Priority: HIGH if brake coaching is a flagship feature.**

------------------------------------------------------------------------

# 3.9 Time-loss regions are conceptually useful

`get_time_loss_regions()` identifies contiguous regions where
per-segment delta is positive and aggregates them when cumulative loss
exceeds a threshold.

This is a good abstraction for coaching:

`raw telemetry → running delta → contiguous loss zones → coaching focus`

It is more useful than simply reporting "you were 0.62s slower."

However, the current implementation uses a simple sign-based
segmentation.

Noise around zero can fragment a region into multiple smaller regions.

There is no obvious hysteresis/smoothing/debounce layer in the inspected
implementation.

**Verdict: GOOD FIRST-PASS HEURISTIC.**

A future version should merge nearby regions and/or use a minimum region
length.

------------------------------------------------------------------------

# 3.10 Worst/best corner selection is not actually "most time lost at a corner"

The engine computes per-corner time using:

`cumulative_time[exit] - cumulative_time[entry]`

and then selects the maximum/minimum.

This is valid for the detector-defined entry/exit zones.

But because the corner zones overlap conceptually with the
preceding/following acceleration/braking definitions, the result is
better described as:

> **delta accumulated across the detected corner zone**

rather than "time lost at the corner."

The naming should be tightened.

------------------------------------------------------------------------

# 3.11 Coaching engine --- useful rules, but causal claims are too strong

Several rules infer a cause from correlation.

Example:

> low battery + negative average speed delta → "Time loss caused by
> early engine derating."

The telemetry supports an association. It does not necessarily establish
causation.

Likewise:

> high rear tyre temperature → "Over-sliding on corner exit."

High temperature can be consistent with several causes.

Likewise:

> high brake + high steering → "friction circle oversaturation" and
> "stop understeer."

The signal can indicate simultaneous demand, but the code does not
calculate actual tyre-force utilization or a vehicle friction ellipse.

### Correct framing

These should be:

> "heuristic indicators consistent with..."

rather than deterministic diagnoses.

**Verdict: GOOD COACHING HEURISTICS; CAUSAL LANGUAGE NEEDS SOFTENING.**

------------------------------------------------------------------------

# 3.12 Fixed `time_impact_ms` values are the weakest part of the coaching model

Examples include:

-   50 ms;
-   85 ms;
-   110 ms;
-   120 ms;
-   150 ms;
-   200 ms;
-   250 ms.

These are attached to coaching tips.

But they are not derived from the actual delta trace.

That creates a dangerous impression:

> "This issue costs 150 ms."

when the code has not actually measured that issue as 150 ms.

This should either become: 1. actual measured segment impact; or 2. a
clearly labeled heuristic severity score.

**Recommendation: replace `time_impact_ms` with `estimated_impact_ms`
only when calculated from telemetry, otherwise use `severity_score`.**

**Priority: HIGH.**

------------------------------------------------------------------------

# 3.13 Hardware profiling --- clever idea, weak identification validity

The profiler is technically real: - derivative; - variance; - FFT; -
thresholds; - confidence.

But the fundamental feature is not hardware-exclusive.

A driver using: - a wheel aggressively; - a controller smoothly; - a
keyboard with certain assist/input behavior

can produce overlapping steering spectra.

The current thresholds therefore cannot justify strong hardware
identification without a labeled dataset.

The confidence score is also **internal confidence**, not empirically
calibrated probability.

For example, a "0.92 confidence" output means the measured variance is
centered in a hand-defined threshold range --- not that there is a 92%
chance the hardware is a pro wheel.

That distinction should be made explicit.

**Verdict: EXPERIMENTAL SIGNAL-BASED HEURISTIC.**

------------------------------------------------------------------------

# 3.14 Battle predictor --- currently much weaker than the name suggests

`BattlePredictor` uses: - recent gap measurements; - linear regression
over up to five laps; - linear extrapolation; - DRS bonus; - hand-coded
probability rules.

This is useful as a simple race projection.

It is **not** a trained predictive model.

More importantly, overtaking probability is not statistically
calibrated.

For example:

`base_prob = 1 - laps_to_catch / laps_remaining`

followed by a fixed DRS bonus of 0.15.

There is no empirical dataset establishing that this maps to real
overtake probability.

Thus:

> `0.83 probability`

should really be interpreted as:

> "the heuristic score says an overtake is highly likely."

not a statistical probability.

### Bigger issue

The predictor's assumptions ignore many battle variables: - tyre
state; - traffic; - dirty air; - track position; - DRS train; -
deployment strategy; - pit windows; - safety cars; - weather; - relative
straight-line performance; - defensive behavior.

**Verdict: GOOD DEMO FEATURE / WEAK PREDICTIVE SCIENCE.**

------------------------------------------------------------------------

# 3.15 The current battle predictor also has a data-source gap

The module's documentation says it uses current
delta-to-car-in-front/behind from UDP lap data.

The ingestion layer currently emits:

`"deltaToFront": 0.0`

in the live `lap_update`.

So the current UI-side data path is not providing a real delta-to-front
value through that field.

The predictor itself can accept externally supplied gap values, but the
inspected ingestion path does not establish that these are currently
populated from actual race telemetry.

Therefore battle prediction should currently be treated as **implemented
capability / integration status requiring verification**, not as a
proven live feature.

------------------------------------------------------------------------

# 3.16 AI debriefs --- useful augmentation, not analytical authority

The LLM layer receives structured analytical outputs and produces
natural-language reports.

That is a strong application pattern:

`deterministic telemetry analysis → LLM explanation`

It avoids asking an LLM to directly infer raw telemetry.

However: - LLM output can hallucinate; - the prompt cannot make an
unvalidated heuristic scientifically valid; - the LLM may turn heuristic
causal suggestions into authoritative prose.

The safest architecture is therefore:

**deterministic engine owns the numbers; LLM owns the explanation.**

The current project is directionally aligned with that architecture.

------------------------------------------------------------------------

# 3.17 Most important intelligence distinction

APX IQ currently has three different classes of "intelligence":

### Class A --- mathematically grounded

-   distance resampling;
-   speed deltas;
-   integrated time delta;
-   basic signal processing.

### Class B --- domain heuristics

-   corner detection;
-   brake-point inference;
-   coaching rules;
-   thermal heuristics;
-   hardware classification;
-   battle projection.

### Class C --- generative interpretation

-   Ollama/Gemini debrief generation.

These should not all be marketed as equivalent "AI/ML."

------------------------------------------------------------------------

# Phase 3 --- Claim Audit

  -----------------------------------------------------------------------
  Claim / Feature         Scientific status       Defensible wording
  ----------------------- ----------------------- -----------------------
  Real-time telemetry     Strong                  "Real-time telemetry
  ingestion                                       ingestion"

  Multi-version F1        Strong, subject to      "Supports F1 2020--25
  support                 fixture coverage        telemetry formats"

  Distance alignment      Strong method, physical "Distance-normalized
                          assumptions remain      telemetry comparison"

  Running delta           Strong mathematics      "Speed-derived
                                                  cumulative time delta"

  Corner detection        Heuristic               "Automated speed-trace
                                                  corner detection"

  Brake-point detection   Weak/heuristic          "Estimated
                                                  braking-point
                                                  comparison"

  Apex comparison         Reasonable              "Detected apex-speed
                                                  comparison"

  Thermal coaching        Heuristic               "Telemetry-based
                                                  thermal heuristics"

  Trail-braking coaching  Heuristic               "Trail-braking pattern
                                                  detection"

  Hardware profiler       Experimental            "Signal-based hardware
                                                  classification"

  Battle prediction       Heuristic               "Heuristic race/battle
                                                  projection"

  AI debrief              Real LLM integration    "LLM-generated debrief
                                                  from deterministic
                                                  telemetry analysis"

  ML models               **Not established**     Remove unless
                                                  additional trained
                                                  models are found

  Overtake probability    Not statistically       "Heuristic overtake
                          calibrated              likelihood score"
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# Phase 3 --- Priority Findings

## 🔴 P3-1 --- Reference telemetry must be framed as a benchmark, not ground truth

This is the biggest conceptual issue.

Game telemetry vs real F1 telemetry is a **cross-domain comparison**,
not a physically identical ghost.

## 🔴 P3-2 --- Brake-point semantics need correction

The current "entry" is a pre-apex speed maximum, not actual brake onset.

## 🔴 P3-3 --- Fixed coaching time impacts are unsupported

Replace with measured impact or a clearly labeled heuristic score.

## 🔴 P3-4 --- Hardware confidence is not probability

Do not present 90% internal threshold confidence as 90% classification
accuracy.

## 🔴 P3-5 --- Battle probability is a heuristic score, not calibrated probability

Especially important if the UI displays percentages.

## 🟡 P3-6 --- Time-loss segmentation could benefit from smoothing/hysteresis.

## 🟡 P3-7 --- Corner classifications are UX categories, not universal vehicle-dynamics classes.

## 🟡 P3-8 --- PCHIP documentation overstates its physical guarantees.

------------------------------------------------------------------------

# Phase 3 Verdict

## **Intelligence validity: 6.5/10**

This is actually a **good result for a student portfolio project**, but
for a different reason than simply "the intelligence is sophisticated."

The strongest part of APX IQ is the **mathematical telemetry-comparison
foundation**.

The weaker part is the layer that turns those measurements into
engineering diagnoses.

The project is strongest when it says:

> "Your speed-derived delta increased by 180 ms between 3200m and
> 3450m."

It becomes weaker when it says:

> "You lost exactly 180 ms because you overloaded the front tyres."

The first is measured.

The second requires a model/calibration/validation layer that the
current implementation does not have.

### The good news

Most of these weaknesses do **not** require rebuilding APX IQ.

The project can become significantly more credible by: 1. correctly
labeling reference telemetry as a benchmark; 2. detecting actual
brake/throttle events rather than inferring them from speed maxima; 3.
storing the telemetry fields already being decoded; 4. replacing
invented time-impact values with measured segment deltas; 5. labeling
hardware/battle outputs as heuristic scores; 6. adding validation
fixtures and benchmark results.

That would turn APX IQ from:

**"a very sophisticated-looking F1 analytics project"**

into:

**"a technically honest telemetry-analysis system with a defensible
quantitative core and explicitly bounded heuristics."**

That second version is much stronger in an F1 software/data interview.

## Next

**Phase 4 --- v1.0 Readiness, Reliability, Security & Deployment Audit**

This phase will answer the practical question:

> **Can you actually ship APX IQ as a stable v1.0, deploy it, demo it
> live, and let a recruiter/engineer poke at it without immediately
> finding embarrassing failures?** \# Phase 4 --- v1.0 Readiness,
> Reliability, Security & Deployment Audit

## Executive verdict

**APX IQ is deployable as a controlled demo, but it is not yet a
defensible public v1.0.**

The important distinction is that the repository has considerably more
deployment infrastructure than the earlier documentation implied. There
are separate API and ingestion Dockerfiles, a production-style
multi-stage Next.js image, and a root `docker-compose.yml` that wires
API + ingestion + UI together. There is also an
`infra/docker-compose.yml` that provides TimescaleDB and the application
services. fileciteturn112file0 fileciteturn113file0
fileciteturn115file0 fileciteturn116file0 fileciteturn120file0

So the problem is **not "there is no deployment story."**

The problem is:

> **the deployment story exists, but the security model, CI state,
> configuration defaults, and operational guarantees are not yet strong
> enough to call it production-ready.**

For your immediate goal --- **ship APX IQ, deploy it, record a live
demo, and use it in applications** --- this is good news. You do not
need a rewrite. You need a focused hardening pass.

------------------------------------------------------------------------

## 4.1 Deployment architecture --- stronger than the documentation suggests

### What actually exists

There are three application containers:

-   API --- FastAPI/Uvicorn on port 8000.
-   Ingestion --- Python process exposing Socket.IO on 3001 and
    receiving UDP telemetry on 20777.
-   UI --- Next.js production server on 3000.

The API Dockerfile uses `python:3.12-slim`, installs requirements,
copies the repository and starts Uvicorn on `0.0.0.0:8000`.
fileciteturn112file0

The ingestion Dockerfile similarly uses Python 3.12, exposes `3001` and
UDP `20777`, and starts `ingestion/main.py`. fileciteturn113file0

The UI image is materially better engineered: it uses a dependency
stage, a build stage, a production runner, a non-root `nextjs` user, and
Next.js standalone output. fileciteturn116file0

### Root compose

The root compose file wires the three services together and adds restart
policies and an API healthcheck. fileciteturn115file0

This is a real deployment artifact, not just documentation theater.

### However: there are two compose definitions

There is also `infra/docker-compose.yml`, which adds TimescaleDB and
uses a host-networked ingestion container because UDP reception from the
game is a special networking requirement. fileciteturn120file0

That creates an important operational/documentation question:

**Which compose file is the canonical deployment path?**

The README currently tells developers to start infrastructure separately
and then run three processes manually. fileciteturn119file0

That conflicts with the existence of a root application compose file.

### Assessment

**Deployment infrastructure: 7.5/10**

Good enough for a controlled demo.

Not yet clean enough for a stranger to clone the repo and reliably
understand:

1.  which compose file to use;
2.  how Postgres is provisioned;
3.  how migrations are run;
4.  where `.env` values come from;
5.  how the game host reaches UDP when Docker is involved;
6.  what happens when Ollama/Gemini is unavailable.

------------------------------------------------------------------------

# 4.2 Critical deployment issue --- the two compose files solve different problems

The root compose file hardcodes:

`SECRET_KEY=apx-iq-production-secret-key`

That is especially problematic because `core/config.py` also defines a
development fallback:

`secret_key = "change-me-in-production"`

The configuration itself explicitly says the secret must be changed
before production. fileciteturn118file0

The root compose therefore contains a value that literally labels itself
as production while being a static repository-controlled secret.

This is not an acceptable production secret-management pattern.

### Fix

For the demo:

-   keep `.env.example`;
-   require an actual `.env`;
-   remove hardcoded production-looking secrets from compose;
-   fail startup if production mode is enabled with the default secret.

For an actual hosted deployment:

-   inject secrets through the hosting platform's secret store;
-   never commit them to compose.

**Priority: P0.**

------------------------------------------------------------------------

# 4.3 Security posture

The repository is unusually honest about its current security posture.

`SECURITY.md` explicitly says APX IQ is intended for
localhost/single-player use, currently has no authentication on
read/write endpoints, uses an admin key only for destructive deletes,
permits wildcard CORS, and uses pickle for Redis serialization. It also
says the v1.0 tag should wait until Critical/High findings are fixed or
risk-accepted. fileciteturn121file0

That honesty is good engineering practice.

But the underlying issues remain real.

## D1 --- no authentication/authorization

The telemetry and data APIs are not protected.

For a localhost demo this is acceptable.

For a publicly exposed application it is a blocker.

**Priority: P0 if deployed publicly; P2 if remaining strictly local.**

------------------------------------------------------------------------

## D2 --- wildcard CORS

`core/config.py` defaults to:

`cors_origins = "*"`

The code supports explicit origins, so the mechanism exists.
fileciteturn118file0

The problem is the default.

For a public deployment, explicitly configure:

-   UI origin;
-   API origin;
-   Socket.IO origin.

**Priority: P0 for public deployment.**

------------------------------------------------------------------------

## D3 --- default secret

The application has a known default secret and does not appear to
enforce that the production configuration differs from it.
fileciteturn118file0

**Priority: P0 for public deployment.**

------------------------------------------------------------------------

## D4 --- pickle Redis serialization

The repository itself identifies pickle serialization as a known risk.
fileciteturn121file0

This is not something I would spend time fixing before your first APX IQ
demo unless Redis is exposed to untrusted users.

It becomes important before public production deployment.

**Priority: P1 for public deployment; P3 for demo.**

------------------------------------------------------------------------

## D5 --- ingestion/API trust boundary

The ingestion process communicates with the API without an
authentication boundary.

Again:

**fine for the current single-machine/local architecture; unacceptable
as an internet-facing trust boundary.**

**Priority: P1 if services are separated across machines; P2 for local
demo.**

------------------------------------------------------------------------

# 4.4 CI/CD --- this is currently the biggest credibility problem

The README says `main` is protected by backend + UI workflows covering
lint, unit tests, real-Postgres integration tests, typecheck and build.
fileciteturn119file0

The workflow confirms those gates exist. The backend workflow runs:

1.  dependency installation;
2.  blocking Ruff lint;
3.  unit tests;
4.  Alembic migration against PostgreSQL;
5.  integration tests;
6.  dependency audit.

However, the dependency audit is explicitly report-only and allowed to
fail. fileciteturn117file0

More importantly, the latest backend CI state observed during this audit
was **red at the Ruff blocking step**, meaning the later test stages did
not run in that failed job.

That is a serious release-readiness issue.

### Why this matters

If your GitHub repo says:

> "CI-gated stable platform"

but the current backend pipeline is red, an engineer opening the
repository can immediately notice the mismatch.

For a recruiter, this is much more damaging than a missing cosmetic
feature.

### Required action

Before calling the repo `v1.0`:

``` text
Ruff green
→ unit tests green
→ migration green
→ integration tests green
→ UI typecheck/lint/build green
```

Then make a fresh green run visible on the default branch.

**Priority: P0.**

------------------------------------------------------------------------

# 4.5 Dependency auditing is not actually a release gate

The backend workflow installs `pip-audit`, runs it, but explicitly uses
`continue-on-error: true` and `|| true`. fileciteturn117file0

Therefore:

> dependency auditing currently produces information; it does not
> enforce a security release gate.

That is perfectly reasonable during development.

For v1.0, you have two choices:

### Option A --- blocking audit

Fail on known exploitable vulnerabilities above a chosen severity.

### Option B --- explicit risk policy

Keep the audit non-blocking but document:

-   accepted vulnerabilities;
-   affected packages;
-   severity;
-   why they are acceptable;
-   when they will be revisited.

Given APX IQ's current scope, **Option B is acceptable for a student
engineering project**, provided it is explicit.

------------------------------------------------------------------------

# 4.6 Database reliability

The database implementation intentionally degrades to in-memory storage
when PostgreSQL is unavailable.

That is excellent for local development and terrible if silently allowed
in production.

The README explicitly describes the zero-infrastructure fallback as
development behavior. fileciteturn119file0

The production question is therefore:

> Can I accidentally believe I am running a persistent deployment while
> actually writing to RAM?

If the answer is yes, that is an operational footgun.

### Recommended behavior

Add an explicit environment mode:

``` text
APP_ENV=development
APP_ENV=production
```

Then:

-   development → allow memory fallback;
-   production → database failure should make startup unhealthy/fail
    closed.

**Priority: P1.**

------------------------------------------------------------------------

# 4.7 Healthcheck quality

The root compose API healthcheck simply performs:

``` text
GET /health
```

The API health endpoint reports DB/session status, which is useful.

But the health model should distinguish:

### Liveness

"Is the process alive?"

### Readiness

"Can the application actually serve production traffic?"

For APX IQ, readiness should ideally verify:

-   PostgreSQL connection;
-   required schema version;
-   Redis if configured;
-   required external inference backend only if the selected deployment
    requires it.

Do not make Ollama/Gemini mandatory if the deterministic template
fallback is intentionally part of the architecture.

**Priority: P2.**

------------------------------------------------------------------------

# 4.8 Ingestion reliability

The UDP listener uses a large bounded queue and non-blocking
`put_nowait`.

This is sensible for protecting the event loop from blocking.

But when the queue fills, packets are dropped.

That is a legitimate design choice for high-frequency telemetry, because
blocking ingestion can be worse than dropping stale data.

The missing piece is **observability**.

You want counters such as:

``` text
packets_received
packets_decoded
packets_invalid
packets_dropped_queue_full
laps_completed
laps_invalid
```

Then the demo can prove that the telemetry pipeline is healthy instead
of merely appearing alive.

**Priority: P1/P2.**

------------------------------------------------------------------------

# 4.9 UDP is inherently lossy --- APX IQ should expose that fact

At 60 Hz, dropping occasional packets is not necessarily catastrophic.

But APX IQ currently needs to distinguish:

-   packet loss;
-   decoder failure;
-   malformed packet;
-   missing telemetry field;
-   interpolation.

Otherwise a smooth-looking analysis can conceal degraded input quality.

This becomes especially important for:

-   brake point analysis;
-   steering analysis;
-   corner detection;
-   derivatives/FFT;
-   time delta.

A future reliability metric such as:

``` text
Telemetry quality: 98.7%
Packets: 35,820
Dropped: 42
Malformed: 3
```

would be far more valuable than another UI widget.

**Priority: P1 for a polished v1.0.**

------------------------------------------------------------------------

# 4.10 Docker networking is a real constraint

The infrastructure compose uses:

`network_mode: host`

for ingestion because the F1 game's UDP telemetry needs to reach port
20777 directly on the host. fileciteturn120file0

The file itself notes that this has platform-specific implications,
particularly on Windows/Mac. fileciteturn120file0

This means Docker deployment is **not universally one-command
portable**.

That is acceptable.

But the README should explicitly say:

> Docker deployment is supported primarily for
> Linux/host-network-compatible environments; on Windows/macOS, run
> ingestion natively or document the required networking configuration.

For your own demo machine, this is not a blocker if the native
three-process workflow works.

------------------------------------------------------------------------

# 4.11 Dependency/version reproducibility

`requirements.txt` contains many minimum-version constraints rather than
a fully pinned Python dependency set. fileciteturn114file0

Examples include:

-   `fastapi>=0.100.0`
-   `pydantic>=2.0.0`
-   `fastf1>=3.4.0`
-   `numpy>=1.24.0`
-   `scipy>=1.10.0`

That is normal for a development project.

But it creates reproducibility risk:

> a fresh install six months later can resolve a materially different
> dependency graph.

For a student project, I would not obsess over full pinning yet.

A stronger compromise:

-   generate a lock/constraints file for deployment;
-   keep human-maintained minimum requirements;
-   have CI test against the locked deployment environment.

**Priority: P2.**

------------------------------------------------------------------------

# 4.12 External-data reliability --- FastF1 is a dependency, not ground truth

The intelligence system relies on FastF1 for real-world reference laps.

That creates an external availability boundary:

``` text
APX IQ
  ↓
FastF1
  ↓
F1 timing/data source/cache
```

The code already catches failures and returns fallbacks/empty results.

That is good graceful degradation.

But the product should clearly distinguish:

``` text
Real F1 reference available
Real F1 reference unavailable
Cached reference used
```

Otherwise a recruiter watching the demo cannot know whether the
comparison is live, cached, or missing.

**Priority: P1/P2.**

------------------------------------------------------------------------

# 4.13 LLM dependency is correctly treated as optional

This is one of the better architectural decisions.

The README documents:

`Ollama → Gemini → template fallback`. fileciteturn119file0

That means the core telemetry intelligence is not blocked on an LLM
provider.

For an engineering project, this is much stronger than:

> "the whole application requires an API key to work."

The correct product framing is:

**deterministic telemetry analysis first; generative debrief second.**

This should remain unchanged.

------------------------------------------------------------------------

# 4.14 Security vs demo scope --- what you actually need

Do **not** spend the next week building an enterprise IAM platform.

For your application/demo:

### Must fix before public GitHub-facing v1.0

1.  **Green backend CI.**
2.  Remove hardcoded production-looking secret.
3.  Explicitly document deployment path.
4.  Explicitly mark public deployment as unsupported until auth is
    added.
5.  Ensure README status matches actual CI/security state.
6.  Verify Docker compose startup on your actual machine.
7.  Verify a complete live telemetry → analysis → UI flow after
    deployment.

### Nice before polished v1.0

8.  Auth-lite.
9.  Explicit CORS.
10. Production DB must not silently fall back to memory.
11. Telemetry packet/drop counters.
12. FastF1 availability status.
13. Better readiness endpoint.
14. Lock deployment dependencies.

### Do not block the demo on

-   replacing Redis pickle;
-   Kubernetes;
-   distributed tracing;
-   multi-region deployment;
-   enterprise identity;
-   autoscaling;
-   elaborate observability infrastructure.

Those are resume-engineering distractions right now.

------------------------------------------------------------------------

# 4.15 v1.0 release gate

Based on the actual repository state, I would define your release gate
as:

## P0 --- must pass

  ---------------------------------------------------------------------
  Gate                               Status
  ---------------------------------- ----------------------------------
  Backend lint                       **FAIL observed --- fix**

  Backend unit tests                 **Needs green post-lint run**

  PostgreSQL migrations              **Exists; needs green CI
                                     confirmation**

  Integration tests                  **Exists; needs green CI
                                     confirmation**

  UI typecheck                       **Green observed**

  UI lint                            **Green observed**

  UI production build                **Green observed**

  API Docker build                   **Artifact exists; verify
                                     locally**

  Ingestion Docker build             **Artifact exists; verify
                                     locally**

  UI Docker build                    **Artifact exists; verify
                                     locally**

  End-to-end live telemetry          **Must personally verify before
                                     release**

  No committed real secrets          **Hardcoded production-looking
                                     secret must be removed**
  ---------------------------------------------------------------------

## P1

  Gate                        Recommendation
  --------------------------- ------------------------------
  Authentication              Required for public exposure
  CORS                        Explicit origins
  Production DB failure       Fail closed
  Telemetry quality metrics   Add
  FastF1 status               Surface
  Ingestion/API trust         Harden if split across hosts

## P2

  Gate                     Recommendation
  ------------------------ ----------------
  Dependency locking       Improve
  Readiness endpoint       Improve
  Redis serialization      Replace
  Advanced observability   Optional
  Kubernetes               Not needed

------------------------------------------------------------------------

# 4.16 Updated v1.0 readiness score

### Deployment: **7.5/10**

Actual containerization exists and is reasonably structured.

### Reliability: **6.5/10**

The system has sensible fallbacks and bounded queues, but
telemetry-quality visibility and production failure semantics need work.

### Security: **4/10**

The repository openly documents this, but unauthenticated APIs +
wildcard CORS + default secret + pickle mean public exposure is not
appropriate.

### CI/release hygiene: **5.5/10**

The gates exist, which is good.

The observed red backend pipeline is the problem.

### Documentation: **7/10**

Architecture and security documentation are unusually explicit, but the
README's "stable/CI-gated" positioning currently gets ahead of the
observed backend CI state, and deployment paths need consolidation.

### Overall Phase 4: **6.3/10**

That is **not a "bad project" score.**

It means:

> **the engineering foundation is good enough to ship a controlled v1
> demo, but the release discipline is behind the implementation
> ambition.**

------------------------------------------------------------------------

# Phase 4 conclusion

The biggest correction from this phase is important:

### I no longer consider deployment infrastructure a major APX IQ gap.

You have:

-   API container;
-   ingestion container;
-   production-style UI container;
-   compose orchestration;
-   database infrastructure;
-   healthcheck;
-   restart policies;
-   CI;
-   migration pipeline.

Those are real engineering artifacts. fileciteturn112file0
fileciteturn113file0 fileciteturn115file0 fileciteturn116file0
fileciteturn120file0

The bigger issue is **release hardening**.

If I were prioritizing your actual work now, I would do:

``` text
1. Fix backend CI
2. Remove hardcoded/default production secret path
3. Verify one-command/container deployment
4. Run a real F1 → UDP → ingestion → API → UI end-to-end test
5. Record demo
6. Only then do targeted intelligence corrections
7. Auth/security hardening if you want public hosting
```

Do **not** spend another week making the architecture more elaborate.

APX IQ already has enough architecture.

The next value comes from **proving that the existing architecture works
reliably.**

------------------------------------------------------------------------

# Next

**Phase 5 --- F1 Recruiter / Hiring-Manager Audit**

This phase will judge APX IQ as if it were submitted by you for:

-   F1 Data Engineering
-   Race Operations
-   Software Engineering
-   AI/ML
-   Motorsport analytics/performance

It will separate:

**what impresses an F1 engineer → what raises questions → what gets
ignored → what could actively hurt credibility**, and then produce the
exact positioning APX IQ should have on your resume, GitHub README,
applications, and demo. \# Phase 5 --- F1 Recruiter / Hiring-Manager
Audit

## Executive verdict

If I were an F1 hiring manager opening APX IQ from a candidate
application, my reaction would be:

> **"This candidate is unusually serious about motorsport data/software.
> The telemetry pipeline and engineering architecture are credible. Now
> I want to know whether the candidate understands where the analytics
> are physically/ statistically valid, or whether this is mostly a
> polished dashboard around heuristics."**

That distinction is the central hiring signal.

APX IQ is **strong enough to materially strengthen an F1 application**,
particularly for software/data/race-operations-adjacent placements.

It is **not yet strong enough to sell you as a motorsport ML/performance
specialist** based on the repository alone.

The project should therefore be positioned as:

> **A real-time motorsport telemetry and intelligence platform**

---not---

> "an ML model that predicts F1 performance."

That second framing creates questions the current implementation cannot
fully answer.

------------------------------------------------------------------------

# 5.1 What an F1 engineer notices in the first 30 seconds

An F1 engineer will not initially care that the UI is pretty.

They will care that the project has an actual data path:

``` text
F1 game
  ↓
UDP telemetry
  ↓
version-specific packet decoding
  ↓
normalized telemetry
  ↓
streaming
  ↓
persistence
  ↓
alignment / delta / corner analysis
  ↓
coaching / race intelligence
  ↓
cockpit UI
```

That is the project's strongest story.

The repository actually supports six game generations, version-specific
packet structures/adapters, real-time Socket.IO streaming, persistence,
and multiple downstream analysis engines.

That looks much more like an engineering system than a toy dashboard.

### Hiring signal: HIGH

This is especially relevant to:

-   Data Engineering
-   Software Engineering
-   Race Operations tooling
-   Motorsport analytics
-   Vehicle/performance data-adjacent roles

------------------------------------------------------------------------

# 5.2 The biggest positive signal: you built the plumbing yourself

The most valuable APX IQ feature from an F1 hiring perspective is
arguably not the "AI."

It is the fact that you dealt with **messy, high-frequency telemetry as
an engineering problem.**

An interviewer can ask:

> "How does the telemetry get from the game into your system?"

and you have a real answer involving:

-   UDP;
-   packet schemas;
-   per-game-version adapters;
-   asynchronous ingestion;
-   normalized internal representations;
-   streaming;
-   storage;
-   analysis.

That gives you substantially better interview material than a project
whose input is simply a CSV.

### Hiring signal: VERY HIGH

------------------------------------------------------------------------

# 5.3 Data Engineering evaluation

## Fit: **9/10**

This is currently APX IQ's strongest F1-role alignment.

A Data Engineer hiring manager will recognize:

### Ingestion

UDP packets arrive at high frequency.

You decode them and normalize multiple game generations.

### Transformation

Telemetry is transformed into analysis-ready representations.

### Storage

PostgreSQL/TimescaleDB is used for persistent lap/telemetry data.

### Validation

The project contains tests around multi-version telemetry and storage.

### APIs

FastAPI exposes persisted/processed information.

### Operational concerns

You have:

-   queues;
-   asynchronous processing;
-   caching;
-   logging;
-   CI;
-   migrations;
-   Docker.

That is a coherent data-platform story.

## What weakens it

The project does not yet demonstrate the things a production Data
Engineer might expect from a mature pipeline:

-   formal data-quality metrics;
-   schema/data-contract validation;
-   replayable event streams;
-   explicit packet-loss accounting;
-   benchmarked throughput/latency;
-   production-scale distributed ingestion;
-   data lineage.

Do not pretend it does.

### Verdict

**Excellent student-level data engineering project.**

For the Williams Data Engineer placement specifically, APX IQ is highly
relevant because the role emphasizes Python/SQL ingestion,
transformation, validation, testing, documentation, and race-weekend
decision support.

The strongest resume framing should therefore emphasize the
**pipeline**, not the LLM.

------------------------------------------------------------------------

# 5.4 Race Operations evaluation

## Fit: **8/10**

This is also a strong match.

Race Operations is interested in:

> "Can this person turn live data into useful decisions?"

APX IQ does exactly that at a prototype level.

The system provides:

-   live telemetry;
-   lap comparison;
-   time deltas;
-   braking analysis;
-   thermal analysis;
-   ERS analysis;
-   battle projections;
-   driver coaching;
-   real-F1 reference comparison.

That is very close to the *shape* of race engineering software.

### But there is a critical caveat

The project is not a race strategy simulator.

The battle predictor is based on recent gap trends, linear regression,
extrapolation, and hand-coded probability adjustments.
fileciteturn124file0

So don't tell a recruiter:

> "I built a race strategy prediction model."

Say:

> "I built a live race-battle projection module using recent pace
> trends, gaps and DRS context."

That is accurate and still impressive.

### Hiring signal

**High, especially for Williams Race Operations.**

------------------------------------------------------------------------

# 5.5 Software Engineering evaluation

## Fit: **8.5/10**

This is a surprisingly strong SWE project.

Why?

Because there is actual software architecture to discuss:

``` text
API
Ingestion
Intelligence
Persistence
UI
Configuration
Tests
CI
Docker
Migrations
```

The codebase is not a single notebook or one giant Python script.

There are also explicit service boundaries and multiple executable
processes.

That gives you interview stories around:

-   API design;
-   async programming;
-   process boundaries;
-   caching;
-   database connection pools;
-   configuration;
-   failure handling;
-   testing;
-   CI;
-   containerization.

### What prevents a 9--10

The code still contains technical debt:

-   process-level singleton state;
-   broad exception swallowing in places;
-   development-oriented fallbacks;
-   authentication gaps;
-   deployment configuration inconsistencies;
-   current CI cleanliness issues.

Those are fixable.

More importantly, some of the "intelligence" semantics are weaker than
the architecture around them.

### Hiring signal: HIGH

For a general SWE interviewer, this may actually be easier to defend
than the ML claims.

------------------------------------------------------------------------

# 5.6 AI/ML evaluation

## Fit: **6/10**

This is where we need to be brutally precise.

The repository's intelligence layer is primarily:

-   numerical analysis;
-   interpolation;
-   signal analysis;
-   heuristics;
-   deterministic rules;
-   linear regression/extrapolation;
-   LLM-generated natural-language debriefs.

The battle predictor explicitly implements linear regression and
hand-coded probability logic. fileciteturn124file0

The coaching engine is a deterministic rules engine rather than a
trained ML system.

The dependency file even states that `scikit-learn` was removed because
it was imported but unused. fileciteturn114file0

Therefore:

### Do not market APX IQ as:

> "An ML-powered F1 performance prediction system."

That invites:

> "Where is the trained model?"

and the repository does not currently provide a strong answer.

### Market it as:

> **A telemetry intelligence platform combining numerical analysis,
> signal processing, heuristic inference, and optional generative AI.**

That is considerably more credible.

------------------------------------------------------------------------

# 5.7 Motorsport performance / vehicle-data evaluation

## Fit: **7/10**

This is stronger than generic AI/ML but weaker than Data/SWE.

Why?

Because APX IQ actually works with motorsport concepts:

-   braking;
-   apex speed;
-   throttle;
-   steering;
-   tyre temperatures;
-   brake temperatures;
-   ERS;
-   DRS;
-   lap delta;
-   track distance;
-   corner segmentation.

That gives you domain vocabulary and quantitative reasoning.

But the project does **not** yet model vehicle dynamics deeply enough to
claim professional performance-engineering capability.

For example, there is no convincing physical vehicle model covering:

-   tyre force curves;
-   aero load;
-   longitudinal/lateral acceleration coupling;
-   suspension kinematics;
-   tire slip;
-   drag/downforce tradeoffs;
-   full energy/thermal state estimation.

Therefore:

> **motorsport analytics project = yes**

> **vehicle dynamics model = no**

That distinction matters.

------------------------------------------------------------------------

# 5.8 The "real F1 data" story

This is one of APX IQ's strongest differentiators.

The system can compare game telemetry against real F1 reference
telemetry via FastF1.

But the correct framing is:

> **real-world reference data**

not:

> **ground truth for the game**

because the game and real car have different:

-   physics;
-   tyres;
-   setup;
-   environmental conditions;
-   telemetry definitions;
-   driver inputs;
-   vehicle behavior.

That means the real F1 lap is a benchmark/reference, not a direct
ground-truth label.

An interviewer who understands motorsport may actually appreciate you
recognizing this limitation.

------------------------------------------------------------------------

# 5.9 The biggest technical question an F1 interviewer will ask

I would expect some version of:

> **"How do you know your analysis is correct?"**

This is the most important question for APX IQ.

You have tests and mathematically explicit analysis, which is good.

But some parts are still heuristic.

Examples:

### Corner detection

Corners are inferred from speed minima.

That is useful for segmentation, but it is not a complete definition of
a corner.

### Brake points

They inherit the corner/entry definition rather than being independently
detected from brake onset.

### Hardware profiling

The classifier uses hand-defined variance/frequency thresholds.

That is an experimental heuristic, not a validated device classifier.

### Battle probability

The probability is a hand-designed transformation of projected catch
time and DRS bonus.

That is not statistically calibrated probability.

These aren't reasons to hide the project.

They are reasons to **describe it honestly**.

------------------------------------------------------------------------

# 5.10 What would impress an F1 engineer most

In order:

### 1. Telemetry ingestion

**Very strong.**

### 2. Multi-version protocol support

**Very strong.**

It shows you dealt with changing schemas rather than one static dataset.

### 3. Quantitative lap comparison

**Strong.**

The distance-based alignment + delta engine provides an actual
analytical foundation.

### 4. Real-time operational UI

**Strong.**

Especially for Race Operations.

### 5. Persistence/API architecture

**Strong.**

### 6. Domain knowledge

**Strong.**

You clearly understand more than "lap time = faster."

### 7. LLM debriefs

**Moderately interesting.**

Useful interface layer, but not the main engineering differentiator.

### 8. "AI" branding

**Least valuable.**

An F1 engineer is much more likely to be impressed by a correct braking
delta than by the word "AI."

------------------------------------------------------------------------

# 5.11 What could actively hurt credibility

There are four claims I would avoid.

## Claim 1 --- "ML-powered"

Unless you add and validate a genuine trained model, this is too broad.

## Claim 2 --- "Predicts race outcomes"

The current battle predictor projects local position changes using
simple trend extrapolation.

That is not race-outcome prediction.

## Claim 3 --- "Real F1 telemetry ground truth"

It is reference/benchmark data.

## Claim 4 --- "Production-ready"

Phase 4 showed that the security posture and CI state do not justify
that claim yet.

------------------------------------------------------------------------

# 5.12 Resume positioning

## Best overall project title

**APX-IQ --- Motorsport Intelligence Platform**

This is better than:

-   AI F1 Coach
-   F1 Analytics AI
-   F1 ML Predictor
-   Racing AI

because it accurately captures the breadth of the system.

------------------------------------------------------------------------

# 5.13 Best resume bullet strategy

For a **Data Engineering** resume:

> **APX-IQ --- Motorsport Intelligence Platform**\
> Built a real-time F1 telemetry pipeline ingesting UDP data across F1
> 2020--25, normalizing version-specific packet schemas and streaming
> high-frequency telemetry into a FastAPI/PostgreSQL/TimescaleDB backend
> for persistent lap analysis and race-weekend decision support.

Second bullet:

> Built distance-aligned lap comparison and performance analysis engines
> for braking, throttle, apex speed, tyre/ERS behavior and time-loss
> regions, with FastF1 real-world reference laps and automated Python
> test/integration gates.

For **Software Engineering**:

> Built a multi-service motorsport platform spanning asynchronous UDP
> ingestion, FastAPI services, PostgreSQL persistence, Socket.IO
> streaming and a Next.js cockpit, containerized with Docker and
> validated through CI, migrations and unit/integration tests.

For **Race Operations**:

> Built a live motorsport intelligence cockpit that converts F1
> telemetry into lap deltas, braking/apex analysis, thermal/energy
> insights and race-battle projections for real-time driver/performance
> decisions.

For **AI/ML**:

> Built a telemetry intelligence system combining numerical analysis,
> signal processing, heuristic performance inference and optional
> LLM-generated driver debriefs, with real-world F1 reference telemetry
> via FastF1.

Notice the pattern:

**The engineering work is the headline. AI is a component.**

------------------------------------------------------------------------

# 5.14 GitHub README positioning

The first paragraph should communicate:

``` text
APX IQ is a real-time motorsport intelligence platform that ingests
EA Sports F1 telemetry over UDP, normalizes multiple game generations,
and turns high-frequency telemetry into live lap-performance,
driver-coaching, and race-battle analysis.
```

Then immediately show:

``` text
Game
 ↓
UDP telemetry
 ↓
Version adapters
 ↓
Normalized telemetry
 ↓
Streaming + persistence
 ↓
Analysis engines
 ↓
Cockpit
```

The README should make the engineering architecture visible **before**
discussing LLMs.

------------------------------------------------------------------------

# 5.15 Demo positioning

Your demo should not start with:

> "Here is my AI F1 dashboard."

Start with:

> **"APX IQ ingests the telemetry stream directly from EA Sports F1 at
> runtime."**

Then show:

``` text
1. Game telemetry starts
2. Packets arrive
3. APX IQ receives them
4. Cockpit updates live
5. Lap completes
6. Lap is persisted
7. Analysis runs
8. Delta/corners/coaching appear
9. Optional AI debrief explains the findings
```

That sequence tells an engineering story.

------------------------------------------------------------------------

# 5.16 The ideal F1 recruiter takeaway

After looking at the project, you want the recruiter to think:

> **"This person has independently built software around a real
> telemetry interface, understands data pipelines, knows how to turn
> telemetry into engineering metrics, and has enough motorsport
> knowledge to reason about the results."**

You do **not** need them to think:

> "This person invented an F1 AI model."

The first statement is already valuable.

------------------------------------------------------------------------

# 5.17 Role ranking

For your current APX IQ implementation:

  F1 role                     APX IQ strength Recruiter value
  ------------------------- ----------------- -----------------
  Data Engineer                      **9/10** **Very high**
  Software Engineer                **8.5/10** **Very high**
  Race Operations                    **8/10** **High**
  Motorsport Analytics             **7.5/10** **High**
  Performance Engineering            **7/10** Moderate--high
  AI/ML Engineer                     **6/10** Moderate
  Vehicle Dynamics                 **4.5/10** Low--moderate

This also tells us where APX IQ should sit in your application strategy.

For the Williams **Data Engineer R14434**, it is an exceptionally
relevant flagship project.

For **Race Operations R14425**, it is still highly relevant, but the
application should emphasize decision support, real-time analytics and
performance interpretation.

For general SWE placements, emphasize architecture and reliability.

For pure ML roles, don't rely on APX IQ alone as your primary proof of
ML depth.

------------------------------------------------------------------------

# 5.18 What an interviewer could realistically ask you

You should be able to answer these without looking at the code:

### Architecture

1.  Why UDP?
2.  Why separate ingestion from API?
3.  Why Socket.IO?
4.  Why PostgreSQL/TimescaleDB?
5.  Why asynchronous processing?
6.  What happens if packets arrive faster than processing?

### Data

7.  How do you normalize six game generations?
8.  How do you handle missing packets?
9.  How do you align two laps with different sample points?
10. Why use distance rather than timestamp?
11. How do you know the lap comparison isn't introducing interpolation
    artifacts?

### Analytics

12. How do you detect corners?
13. What exactly is a braking point?
14. How is time delta calculated?
15. Why compare against a real F1 lap?
16. What makes your hardware classifier trustworthy?

### Systems

17. What happens if PostgreSQL goes down?
18. What happens if FastF1 is unavailable?
19. What happens if the LLM is unavailable?
20. How would you deploy this for multiple users?

### Engineering judgment

21. What part of the system would you rewrite?
22. Which result do you trust least?
23. How would you validate your coaching recommendations?
24. What is currently a heuristic rather than a learned model?
25. What would you measure before calling this production-ready?

**If you can answer these well, APX IQ becomes an interview asset rather
than just a GitHub link.**

------------------------------------------------------------------------

# 5.19 Highest-value improvements from a recruiter perspective

Not all fixes are equal.

### Tier 1 --- enormous value

**1. Fix and green CI.**

Signals engineering discipline.

**2. Produce one reproducible live demo.**

Signals that the system actually works.

**3. Add telemetry-quality metrics.**

Signals data-engineering maturity.

**4. Tighten analytical semantics.**

Especially:

-   actual brake onset;
-   actual throttle-on;
-   corner matching;
-   cumulative time-loss definitions.

This signals engineering rigor.

### Tier 2 --- strong value

**5. Add one genuinely validated predictive model.**

Only if you want stronger ML positioning.

Do not add a fake model just to put "ML" in the README.

**6. Benchmark ingestion/analysis latency.**

For example:

``` text
UDP rate
→ decode latency
→ processing latency
→ UI propagation latency
```

Measured numbers are much stronger than "real-time."

### Tier 3 --- low recruiter value

-   more dashboard widgets;
-   animations;
-   additional LLM providers;
-   Kubernetes;
-   elaborate cloud architecture;
-   another abstraction layer.

Do not do these before the above.

------------------------------------------------------------------------

# 5.20 Final Phase 5 verdict

### APX IQ is a **strong F1 student project**.

But its strongest identity is:

> **software + data engineering + motorsport analytics**

not:

> **machine learning research**

That is not a weakness.

In fact, for the F1 roles you are targeting, it is probably the better
positioning.

Your current strongest story is:

``` text
CSE/AI-ML student
        +
production internship experience
        +
built real telemetry ingestion infrastructure
        +
understands quantitative motorsport analysis
        +
can build backend/data systems
        +
can turn engineering data into an operational interface
```

That is a coherent candidate profile.

------------------------------------------------------------------------

# Phase 5 recruiter verdict

**Overall recruiter value: 8.3/10**

### Data Engineering: 9/10

### Software Engineering: 8.5/10

### Race Operations: 8/10

### Motorsport Analytics: 7.5/10

### Performance Engineering: 7/10

### AI/ML: 6/10

### Vehicle Dynamics: 4.5/10

The project is **application-ready as a flagship project**, provided you
describe it accurately.

The next level is not "add more AI."

The next level is:

> **make the measurements more defensible, prove the system works
> end-to-end, and quantify its engineering performance.**

------------------------------------------------------------------------

# Next

**Phase 6 --- Final Gap List + Prioritized Execution Plan**

This will combine all five phases into one final decision document:

1.  what is actually implemented;
2.  what is weak or misleading;
3.  what must be fixed;
4.  what should be fixed;
5.  what should explicitly NOT be touched;
6.  exact v1.0 release sequence;
7.  application/demo sequence;
8.  final APX IQ score and recruiter-facing positioning. \# Phase 6 ---
    Final Gap List + Prioritized Execution Plan

## Final audit verdict

After reviewing the architecture, implementation, intelligence layer,
reliability/security/deployment posture, and F1 hiring-manager
perspective:

> **APX IQ is already strong enough to be a flagship application
> project. It does not need a rewrite. It needs a disciplined finishing
> pass.**

The central mistake to avoid now is continuing to expand the project
because there are still things that *could* be built.

There are.

That does not mean they are worth building.

The project has crossed the threshold where **shipping and proving it**
creates more value than adding another subsystem.

------------------------------------------------------------------------

# 6.1 What APX IQ actually is today

The most defensible description is:

> **A real-time motorsport telemetry and intelligence platform that
> ingests EA Sports F1 telemetry, normalizes multiple game generations,
> streams and persists telemetry, and derives lap-performance,
> driver-coaching, and race-battle insights using numerical analysis,
> signal processing, heuristics, real-world F1 reference data, and
> optional generative AI.**

That description is supported by the repository architecture and
implementation.

It avoids claiming:

-   a validated ML model;
-   professional vehicle-dynamics simulation;
-   statistically calibrated race prediction;
-   production internet-scale deployment.

That is the correct level of ambition for the current implementation.

------------------------------------------------------------------------

# 6.2 Final gap classification

## A. Must fix before calling APX IQ v1.0

### A1. Backend CI must be green

**Current problem:** the observed backend workflow failed at blocking
Ruff lint, so the test stages did not execute in that run.

**Action:**

``` text
ruff check .
→ fix all blocking issues
→ rerun CI
→ verify unit tests
→ verify migration
→ verify PostgreSQL integration tests
```

**Why:** This is the single clearest public engineering-quality signal.

**Priority: P0**

------------------------------------------------------------------------

### A2. Remove the hardcoded production-looking secret

The root Docker Compose configuration contains a static `SECRET_KEY`
value.

The configuration also contains a known development default secret.

**Action:**

-   remove secret from compose;
-   require environment injection;
-   optionally fail startup in production if the default is detected.

**Priority: P0**

------------------------------------------------------------------------

### A3. Prove the complete end-to-end path

Do not call the project finished until you personally verify:

``` text
EA F1
 ↓
UDP packet
 ↓
decoder
 ↓
version adapter
 ↓
normalized telemetry
 ↓
Socket.IO
 ↓
UI
 ↓
lap completion
 ↓
persistence
 ↓
analysis
 ↓
coach/debrief
```

The repository contains the components.

The missing artifact is **your proof that the whole chain works in the
final build.**

**Priority: P0**

------------------------------------------------------------------------

### A4. Make the README match reality

The README currently calls the project stable and CI-gated while the
observed backend pipeline was not green.

Update status after the next successful run.

Also make the canonical deployment route unambiguous.

**Priority: P0**

------------------------------------------------------------------------

# 6.3 Strongly recommended before applications

## B1. Fix corner/braking semantics

This is the highest-value intelligence correction.

Current corner detection uses speed minima and derives entry/exit from
speed regions.

That is useful for segmentation but does not literally identify:

-   brake onset;
-   apex point;
-   throttle application point.

The project should either:

### Option 1 --- implement actual event detection

Detect:

``` text
brake onset
brake peak
minimum speed / apex
throttle onset
```

or

### Option 2 --- rename the current metrics

If you don't have time, make the terminology honest:

``` text
entry_speed_proxy
apex_speed
exit_speed_proxy
```

and avoid calling the proxy itself a brake point.

**Priority: P1**

------------------------------------------------------------------------

## B2. Validate the coaching engine's causal language

A recommendation like:

> "You are losing time because..."

is stronger than what a correlation/threshold system can prove.

Prefer:

> "Your telemetry shows..."

or:

> "This lap is associated with..."

unless the analysis actually establishes causality.

**Priority: P1**

------------------------------------------------------------------------

## B3. Add telemetry-quality measurement

Add a small set of counters:

``` text
packets_received
packets_decoded
packets_invalid
packets_dropped
samples_recorded
laps_completed
```

Then expose a simple quality indicator.

This is one of the highest ROI additions because it strengthens:

-   Data Engineering credibility;
-   reliability credibility;
-   debugging;
-   demo storytelling.

**Priority: P1**

------------------------------------------------------------------------

## B4. Add one measurable performance benchmark

Do not write "real-time" without defining what it means.

Measure at least:

``` text
UDP packet rate
decode latency
analysis latency
UI propagation latency
```

A simple benchmark such as:

> "Processed telemetry at 60 Hz with X ms median ingestion-to-analysis
> latency on local hardware"

would be much more compelling than another dashboard card.

Do not invent the number.

Measure it.

**Priority: P1**

------------------------------------------------------------------------

# 6.4 Strongly recommended if you want public hosting

## C1. Authentication

Current read/write APIs are intentionally unauthenticated.

That is acceptable for the current localhost/single-player design.

Before internet exposure:

-   add auth;
-   protect telemetry writes;
-   protect destructive endpoints;
-   separate user/session state.

**Priority: P0 for public hosting, P2 otherwise.**

------------------------------------------------------------------------

## C2. Explicit CORS

Change production configuration from wildcard to explicit origins.

**Priority: P0 for public hosting.**

------------------------------------------------------------------------

## C3. Production database must fail closed

Keep memory fallback for development.

For production:

``` text
DATABASE_URL missing/unreachable
→ startup failure / unhealthy
```

not:

``` text
DATABASE_URL missing
→ silently use RAM
```

**Priority: P1.**

------------------------------------------------------------------------

## C4. Replace pickle if Redis is remotely reachable

Keep this out of the immediate demo critical path.

**Priority: P2/P3 for current use.**

------------------------------------------------------------------------

# 6.5 Things that should NOT be built right now

This list is important.

## Do not build Kubernetes.

There is no hiring value proportional to the time cost for this project.

## Do not build a microservice explosion.

You already have enough service boundaries.

## Do not add another LLM provider.

Ollama → Gemini → deterministic fallback is already a good story.

## Do not redesign the UI.

The current UI has already reached the point where more polish is lower
ROI than engineering validation.

## Do not add fake ML.

Do not train a random classifier just so the README can say "machine
learning."

If you add ML, it needs a real question, dataset, evaluation
methodology, baseline and validation.

## Do not add another 20 analytics widgets.

Depth beats breadth.

## Do not rewrite the architecture.

The architecture is not your bottleneck.

------------------------------------------------------------------------

# 6.6 One potentially valuable future ML project

If you eventually want to strengthen APX IQ's ML credibility, the
correct approach is:

### Question

Can telemetry predict a meaningful performance outcome?

For example:

> predict whether a driver's next sector will gain/lose more than X
> milliseconds relative to a reference.

Then build:

``` text
features
 ↓
baseline
 ↓
train/validation split
 ↓
model
 ↓
calibration
 ↓
test set
 ↓
error analysis
```

Possible features:

-   speed profile;
-   throttle profile;
-   brake profile;
-   steering derivatives;
-   sector history;
-   tyre temperature;
-   ERS state;
-   previous lap delta.

But this is **Phase 2 of APX IQ**, not something you should bolt on now
merely for resume keywords.

------------------------------------------------------------------------

# 6.7 Exact execution order

Here is the recommended sequence.

## Sprint 1 --- Release hygiene

### Step 1

Fix Ruff.

### Step 2

Run the entire backend CI pipeline.

### Step 3

Fix any tests exposed after lint passes.

### Step 4

Verify migrations against clean PostgreSQL.

### Step 5

Confirm UI CI remains green.

### Step 6

Remove hardcoded production secret.

### Step 7

Clean up README status/deployment instructions.

------------------------------------------------------------------------

# Sprint 2 --- Intelligence correctness

### Step 8

Fix/rename corner entry/exit semantics.

### Step 9

Improve actual brake-onset detection.

### Step 10

Verify corner matching is one-to-one and sequential.

### Step 11

Review delta-engine naming:

``` text
time gained
time lost
cumulative loss
per-segment loss
```

Make names match actual calculations.

### Step 12

Tone down causal coaching language.

------------------------------------------------------------------------

# Sprint 3 --- Proof

### Step 13

Run the complete real F1 session.

### Step 14

Capture telemetry quality.

### Step 15

Capture latency measurements.

### Step 16

Complete at least one persisted lap.

### Step 17

Generate the intelligence report/debrief.

### Step 18

Repeat the run from a clean startup.

The second run matters.

A one-off successful demo can hide state/configuration problems.

------------------------------------------------------------------------

# Sprint 4 --- Presentation

### Step 19

Record the APX IQ demo.

Recommended structure:

``` text
0:00–0:20   What APX IQ is
0:20–0:50   Architecture / telemetry input
0:50–1:40   Live telemetry
1:40–2:30   Lap completion + persistence
2:30–3:30   Delta/corner/performance analysis
3:30–4:15   Coaching
4:15–4:45   Real F1 reference comparison
4:45–5:00   Architecture + engineering takeaway
```

Keep it engineering-focused.

------------------------------------------------------------------------

# 6.8 Application order

Once Sprint 1 + end-to-end proof are complete:

### First

**Williams Data Engineer**

APX IQ should be the flagship project.

### Second

**Williams Race Operations**

Emphasize live telemetry, performance analysis and decision support.

### Third

**Racing Bulls Software Engineering**

Emphasize architecture, Python/TypeScript, data processing, CI/CD and
reliability.

### Fourth

**Mercedes Software Engineering**

Emphasize real-time systems, simulators/data pipelines, containers and
production engineering.

### Fifth

Other F1 SWE/data/performance roles.

Do not wait until every P1 improvement is complete before applying.

------------------------------------------------------------------------

# 6.9 Resume strategy

APX IQ should be project #1.

Do not bury it beneath less relevant projects.

Recommended order:

``` text
Experience
  Infinitra

Leadership
  AWS Student Builder Group

Projects
  APX IQ
  ARIA / second strongest project
  Book By Block / other project
```

For F1-specific resumes, APX IQ deserves the most space.

------------------------------------------------------------------------

# 6.10 Final resume bullet philosophy

The bullet should contain four things:

``` text
SYSTEM
+ SCALE/RATE
+ TECHNICAL WORK
+ OUTCOME
```

But only use numbers that you have actually measured.

For example, don't write:

> "Processed 60 Hz telemetry"

unless the implementation and benchmark establish that claim.

If measured, it becomes excellent:

> "Built a 60 Hz UDP telemetry pipeline supporting F1 2020--25 packet
> schemas, normalizing live race data into a FastAPI/PostgreSQL analysis
> stack..."

If you have not benchmarked it, simply say:

> "Built a UDP telemetry pipeline supporting F1 2020--25..."

The same rule applies everywhere.

------------------------------------------------------------------------

# 6.11 What APX IQ demonstrates about you

This is arguably more important than any individual feature.

The repository demonstrates that you can:

### 1. Work from a real external protocol

Rather than inventing a toy input.

### 2. Handle evolving schemas

Six game generations force version-aware engineering.

### 3. Build an end-to-end system

Not just an algorithm.

### 4. Work across the stack

Python backend + data layer + streaming + React/Next.js.

### 5. Reason quantitatively

Distance alignment, delta calculations, signal analysis.

### 6. Incorporate domain knowledge

Braking, apex, tyres, ERS, DRS, race gaps.

### 7. Think about failure

Fallbacks, queues, cache, database behavior, LLM fallback.

### 8. Build with engineering discipline

Tests, migrations, CI, Docker, documentation.

That is a strong profile for a second-year student.

------------------------------------------------------------------------

# 6.12 What APX IQ does NOT yet demonstrate

Be equally honest.

It does not strongly demonstrate:

-   production-scale distributed systems;
-   validated ML research;
-   statistically calibrated predictive modeling;
-   advanced vehicle dynamics;
-   multi-user security architecture;
-   cloud-scale deployment;
-   formal data governance;
-   professional motorsport team experience.

You don't need all of those.

The goal is to know the boundary.

------------------------------------------------------------------------

# 6.13 Final scoring

After all six phases:

  Dimension                                                                  Score
  ----------------------------- --------------------------------------------------
  Architecture                                                          **8.5/10**
  Backend engineering                                                     **8/10**
  Data engineering                                                        **9/10**
  Telemetry engineering                                                   **9/10**
  Quantitative analysis                                                 **7.5/10**
  Intelligence correctness                                              **6.5/10**
  ML depth                                                           **5.5--6/10**
  Reliability                                                           **6.5/10**
  Security                                                                **4/10**
  Deployment                                                            **7.5/10**
  Testing/CI                      **7/10 potential; lower until backend is green**
  Documentation                                                           **7/10**
  Motorsport domain relevance                                           **8.5/10**
  F1 recruiter value                                                    **8.3/10**

### Overall engineering project score

**\~8/10 as a student engineering project.**

### Overall public-production readiness

**\~6--6.5/10.**

Those are intentionally different scores.

------------------------------------------------------------------------

# 6.14 The final "done" definition

APX IQ is **done enough for applications** when:

``` text
[✓] Backend CI green
[✓] UI CI green
[✓] No committed real secrets
[✓] Clean deployment instructions
[✓] Real F1 telemetry successfully reaches final UI
[✓] At least one lap persists successfully
[✓] Intelligence pipeline completes successfully
[✓] Demo works from clean startup
[✓] README accurately describes limitations
[✓] Resume bullets contain only defensible claims
```

It does **not** require:

``` text
[ ] Kubernetes
[ ] ML model
[ ] Multi-user auth
[ ] Cloud autoscaling
[ ] More UI
[ ] More LLM features
[ ] Full vehicle dynamics
```

Those are separate future milestones.

------------------------------------------------------------------------

# 6.15 Final recommendation

### Stop treating APX IQ as unfinished just because it isn't perfect.

It has crossed the threshold where another feature is unlikely to
materially improve your application.

The highest-value move is:

> **finish → verify → measure → document → demo → apply.**

If you have limited time, spend it in exactly this order:

``` text
CI
 ↓
security/config cleanup
 ↓
end-to-end verification
 ↓
measurement
 ↓
semantic intelligence fixes
 ↓
demo
 ↓
applications
```

And then move on.

Do not let APX IQ become another project where "one more feature" delays
shipping for another month.

------------------------------------------------------------------------

# FINAL APX IQ AUDIT --- ONE-PAGE VERDICT

**Project:** APX IQ\
**Type:** Real-time motorsport telemetry + intelligence platform\
**Repository:** Public\
**Primary value:** Telemetry/data/software engineering\
**F1 recruiter value:** **8.3/10**\
**Overall student-project quality:** **\~8/10**\
**Production readiness:** **\~6--6.5/10**

### Strongest assets

1.  Real UDP telemetry ingestion.
2.  Six F1 game generations.
3.  Version-aware normalization.
4.  Real-time streaming architecture.
5.  Persistent database layer.
6.  Quantitative lap comparison.
7.  Motorsport-specific analysis.
8.  Real F1 reference data.
9.  Docker + CI + migrations.
10. Strong domain relevance.

### Biggest weaknesses

1.  Backend CI currently needs to be green.
2.  Security posture is deliberately pre-hardening.
3.  Some intelligence semantics overstate what the algorithms actually
    detect.
4.  Heuristic predictors should not be marketed as ML.
5.  Telemetry quality/latency are not yet sufficiently measured.
6.  Deployment documentation needs consolidation.

### Highest-value next action

**Get the existing system into a reproducibly working, measured,
demoable v1 state.**

### Lowest-value next action

**Adding another feature.**

------------------------------------------------------------------------

# FINAL VERDICT

**Ship APX IQ.**

Not because it is perfect.

Because it is already sufficiently deep that the next engineering lesson
is no longer "how do I architect another subsystem?"

The next lesson is:

> **Can I take a complex system I built, establish what is actually true
> about it, remove the unsupported claims, make the critical path
> reliable, measure it, and ship it?**

That is the engineering maturity this project is now capable of
demonstrating.
