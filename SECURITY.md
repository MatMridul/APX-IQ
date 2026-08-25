# Security Policy

> APX IQ is pre-hardening by explicit decision: a full offensive security
> audit is scheduled before v1.0 (see `docs/internal/v1_definition.md`
> Option B). This page documents current posture honestly so nobody has to
> reverse-engineer it.

## Current posture (read before exposing this app anywhere)

- **Designed for localhost / single-player use.** Do not expose ports
  8000/3001/3000 to untrusted networks today.
- No authentication on read/write endpoints. `ADMIN_API_KEY` guards only
  destructive deletes (`X-Admin-Key` header).
- `CORS_ORIGINS` defaults should be set explicitly; `*` is accepted but
  intended for development only.
- Redis cache serialisation currently uses pickle — acceptable only for a
  private local Redis.
- Known deferred items are tracked as D1–D5 in
  `docs/internal/technical_debt.md`.

## Reporting a vulnerability

Private disclosure preferred:

1. Open a GitHub Security Advisory ("Report a vulnerability" on the
   Security tab), **or**
2. Contact the repository owner directly.

Please include reproduction steps and affected endpoint/module. You'll get
an acknowledgement within 72 hours and a fix-or-mitigation plan for any
confirmed issue.

## Hardened-release commitment

v1.0.0 will not be tagged until the scheduled audit's Critical/High
findings are fixed or explicitly risk-accepted in the debt registry.
