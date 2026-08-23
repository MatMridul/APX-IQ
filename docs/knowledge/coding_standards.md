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
- **Use structlog** in API and ingestion layers: `log = get_logger("APXIQ.Module")`
- **Event names** are `snake_case` strings: `log.info("lap_saved", lap_id=42)`
- **Never** use f-strings in log calls; use keyword args
- `intelligence/` modules use stdlib `logging.getLogger(...)` — inconsistency vs API

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
- Primitive components in `components/f1/primitives/`
- Domain components in `components/f1/{domain}/`
- Charts isolated in `components/f1/charts/`
- `index.ts` barrel exports for each subdirectory

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

## Commit / Code Review Standards

*(Inferred from code, not enforced by CI)*
- Docstrings required on all public classes and methods
- Architecture comments in page files explaining data flow
- `// TODO:` comments for known incomplete work (many in telemetry_router.py)
- Module-level comments explain "why", not "what"
