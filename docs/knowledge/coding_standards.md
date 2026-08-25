# APX IQ — Coding Standards

> Inferred from codebase inspection — 2026-07-29

---

## Python Standards

### File Structure
```
module_name.py
├── Module docstring (class, purpose, usage example)
├── Imports (stdlib → third-party → internal)
├── Constants / Enums
├── Dataclasses
└── Classes (one major class per file generally)
```

### Naming Conventions
- **Classes**: `PascalCase` — `TelemetryRecorder`, `CornerDetector`
- **Functions/methods**: `snake_case` — `detect_corners()`, `_finalize_lap()`
- **Private methods**: `_single_underscore` prefix
- **Module-level singletons**: `_snake_case` with underscore prefix (e.g., `_battle_predictor`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `TRACK_MAP`, `OLLAMA_DEFAULT_MODEL`)
- **Dataclass fields**: `snake_case`
- **Enum values**: `SCREAMING_SNAKE_CASE`

### Logging
- **structlog everywhere** (API, ingestion, intelligence, core): `log = get_logger("APXIQ.Module")`
  — unified in the 2026-08 repair; stdlib `logging` is banned
- **Event names** are `snake_case` strings: `log.info("lap_saved", lap_id=42)`
- **Never** use %-format or f-strings in log calls; keyword args only
- **Config**: never `os.getenv()` outside `core/config.py`; import `settings`

### Error Handling
- Use `HTTPException` in FastAPI routes with appropriate status codes
- Catch `ValueError` for domain validation → 400
- Catch generic `Exception` in LLM/external calls → 500
- Always log errors with `log.error(event, error=str(e))`

### Async Patterns
- `asyncio.to_thread()` for any CPU-heavy or blocking I/O (Pandas, FastF1)
- Never `await` inside a Pandas operation
- `async def` for all FastAPI endpoints, WebSocket handlers, and ingestion workers

### Type Hints
- All public method signatures **must** have type hints
- Return type annotation required
- Dataclasses use field type annotations
- Pydantic v2 models with `field_validator` for complex validation

---

## TypeScript / React Standards

### File Structure
```
ComponentName.tsx
├── "use client";  (if needed)
├── JSDoc comment block (architecture, what it does)
├── Imports (React → external → local)
├── Interface definitions
└── Named export function (no default export for components)
```

### Naming Conventions
- **Components**: `PascalCase.tsx`
- **Hooks**: `use{Name}.ts`
- **Stores**: `{name}Store.ts`
- **Types**: `PascalCase` interfaces
- **Constants/enums**: `camelCase` objects, `PascalCase` types
- **CSS variables**: `--font-{name}`, `--color-{name}`

### State Management Rules
- **Zustand** for global mutable state (telemetry store)
- **React Query** for all server state (intelligence API calls)
- **useState** for local UI state only (selected lap, modal open/close)
- **useRef** for values that should NOT trigger re-renders (socket snapshots, chart refs)

### Component Patterns
- Live cockpit instruments: `components/cockpit/` (spatial canvas, imported directly)
- Intelligence widgets: `components/f1/intelligence/`
- Shared primitives: `components/f1/primitives/` (Panel, Badge)
- Socket event payload types: single source in `lib/api/intelligence.ts`
- No inline component definitions inside render (react-hooks/static-components is a blocking error)

### Performance Rules
- Charts use `useRef` + imperative APIs (LightweightCharts, Canvas) — never re-render on data change
- `useMemo` for expensive D3 calculations (arc generators, color scales)
- Socket events → refs, RAF loop → store (never call Zustand directly from socket handlers)
- `ResizeObserver` for responsive canvas charts

### Styling
- **Tailwind CSS v4** with custom tokens in `globals.css`
- Custom CSS variables: `--color-apx-black`, `--color-apx-gold`, `--color-silver`
- Component-specific overrides use `cn()` (tailwind-merge)
- **Design tokens** in `lib/theme.ts` (`apxColors`, `thresholds`, `panelVariants`)
- Carbon fiber aesthetic: dark panels with gold `#CFA349` accents

---

## Testing Standards

- **Unit/contract** (`tests/`, run by default): fast, no infrastructure;
  storage tests use InMemory implementations against the Protocols.
- **Integration** (`tests/integration/`, marker `integration`): boots the
  real app on real PostgreSQL; requires DATABASE_URL set before pytest
  starts. CI provisions the service container; locally use docker.
- **Required coverage**: every Pydantic model validator, every storage
  round-trip, decoder paths per game year, and any endpoint touched by
  ingestion. Schema/migration PRs MUST add integration coverage.
- Gates (all blocking in CI): `ruff check .` · unit pytest ·
  integration pytest · `tsc --noEmit` · `eslint` · `next build`.
- Audits (`pip-audit`, `npm audit`) run report-only until triaged.

---

## Commit / Code Review Standards

- Docstrings required on all public classes and methods
- Module-level comments explain "why", not "what"
- Every PR includes runnable evidence of its Definition of Done
  (see `/AGENTS.md`)
