# Contributing to APX IQ

Thanks for helping build the pit wall. Short version:

## Ground rules

1. Read [`AGENTS.md`](AGENTS.md) first — architecture map and the
   **Definition of Done** live there. Docs must stay truthful in the same
   PR that changes behaviour.
2. `main` is protected: open a PR; both CI workflows must pass
   (backend: ruff + unit + Postgres integration · UI: tsc + eslint + build).
3. Scope discipline: implement what the task asks — no speculative layers.

## Local workflow

```bash
# branch naming: feat/<topic> | fix/<topic> | docs/<topic> | chore/<topic>
git checkout -b fix/lap-saver-retry

# gates (same as CI) before every push:
ruff check .
pytest -m "not integration"
# DB-touching changes:
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/apxiq_test \
    alembic upgrade head && \
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/apxiq_test \
    pytest -m integration
cd ui && npx tsc --noEmit && npm run lint && npm run build

git push -u origin HEAD   # then open a PR against main
```

## PR checklist

- [ ] Tests added/updated (integration required for storage/model/migration changes)
- [ ] `CHANGELOG.md` updated under **Unreleased**
- [ ] Docs touched if behaviour/architecture changed
- [ ] No new `pickle`, no `os.getenv` outside `core/config.py`, no stdlib logging
- [ ] Risk summary at the top of the PR description

## Where to ask

Open a GitHub Discussion or issue — tag `question` for anything that isn't
a bug or feature request.
