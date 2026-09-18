#!/usr/bin/env python3
"""
APX-IQ Wiring / API Audit Generator
===================================

Parses the codebase for every WIRE (data connection) and API, and emits a
status table so "implemented" is never mistaken for "wired", "wired" is never
mistaken for "linked", and "linked" is never mistaken for "tested".

Run:
    python scripts/wiring_audit.py                 # print table to stdout
    python scripts/wiring_audit.py --write         # also write docs/internal/wiring_table.md

Columns (per wire):
    Channel      — the wire/API identity (event name, route, column, field)
    Origin       — SOURCE side (where the data is produced): file:line
    Destination  — SINK side (where it is consumed): file:line or 'none found'
    Wired        — STATIC: is a matching consumer present?  WIRED / UNWIRED
    Tested       — STATIC: is this channel referenced by a test file?  TESTED / UNTESTED
    Link         — RUNTIME: is data actually flowing?  Always DOWN/UNKNOWN here —
                   this column is only truthfully set by a LIVE RUN (two-laptop
                   game -> UDP -> backend -> UI). The generator NEVER fakes it.

What this tool CAN determine (static):
    - Socket.IO emits (backend) vs subscriptions (frontend)  -> wired?
    - FastAPI routes vs frontend fetch callsites             -> wired?
    - recorder row fields, DB INSERT/SELECT column coverage
    - whether a test file mentions the channel               -> tested?

What this tool CANNOT determine (and does not pretend to):
    - Link up/down: whether real bytes flowed at runtime. Needs the live feed.
    - Semantic correctness of a wired channel (shape mismatches can still be WIRED).
      (Those are found by the audits / integration tests, not by presence-scanning.)

The output is DERIVED — do not hand-edit docs/internal/wiring_table.md; re-run this.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
UI_SRC = REPO / "ui" / "src"


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _iter_files(root: Path, suffixes: tuple[str, ...]) -> list[Path]:
    if not root.exists():
        return []
    out: list[Path] = []
    for p in root.rglob("*"):
        if p.suffix in suffixes and "node_modules" not in p.parts and ".next" not in p.parts:
            out.append(p)
    return out


def _grep(files: list[Path], pattern: re.Pattern) -> list[tuple[str, int, str]]:
    """Return (rel_path, line_no, matched_line) for every match."""
    hits: list[tuple[str, int, str]] = []
    for f in files:
        try:
            for i, line in enumerate(f.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
                if pattern.search(line):
                    hits.append((str(f.relative_to(REPO)), i, line.strip()))
        except OSError:
            continue
    return hits


@dataclass
class Wire:
    channel: str
    origin: str = "—"
    destination: str = "none found"
    wired: str = "UNWIRED"
    tested: str = "UNTESTED"
    link: str = "DOWN/UNKNOWN"      # runtime-only; never set statically
    note: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# Scanners
# ─────────────────────────────────────────────────────────────────────────────

def scan_socketio() -> list[Wire]:
    """Backend sio.emit("event", ...) vs frontend socket.on("event", ...)."""
    py = _iter_files(REPO / "ingestion", (".py",)) + _iter_files(REPO / "api", (".py",))
    ts = _iter_files(UI_SRC, (".ts", ".tsx"))
    tests = _iter_files(REPO / "tests", (".py",))

    emit_re = re.compile(r"""sio\.emit\(\s*["']([A-Za-z_][\w]*)["']""")
    on_re = re.compile(r"""socket\.on\(\s*["']([A-Za-z_][\w]*)["']""")

    emits: dict[str, tuple[str, int]] = {}
    for path, ln, _ in _grep(py, emit_re):
        m = emit_re.search(Path(REPO / path).read_text(encoding="utf-8", errors="replace").splitlines()[ln - 1])
        if m:
            emits.setdefault(m.group(1), (path, ln))

    subs: dict[str, tuple[str, int]] = {}
    for path, ln, line in _grep(ts, on_re):
        m = on_re.search(line)
        if m:
            subs.setdefault(m.group(1), (path, ln))

    test_blob = "\n".join(
        f.read_text(encoding="utf-8", errors="replace") for f in tests
    )

    wires: list[Wire] = []
    for event, (opath, oln) in sorted(emits.items()):
        w = Wire(channel=f"socket:{event}", origin=f"{opath}:{oln}")
        if event in subs:
            spath, sln = subs[event]
            w.destination = f"{spath}:{sln}"
            w.wired = "WIRED"
        else:
            w.note = "emitted, no frontend subscriber"
        if event in test_blob:
            w.tested = "TESTED"
        wires.append(w)

    # Frontend subscriptions with no backend emitter (dead frontend wiring)
    for event, (spath, sln) in sorted(subs.items()):
        if event not in emits and not event.startswith(("connect", "disconnect", "error")):
            wires.append(Wire(
                channel=f"socket:{event}",
                origin="none found",
                destination=f"{spath}:{sln}",
                wired="UNWIRED",
                note="frontend subscribes, no backend emit",
            ))
    return wires


def scan_rest() -> list[Wire]:
    """FastAPI routes vs frontend fetch callsites."""
    api = _iter_files(REPO / "api", (".py",))
    ts = _iter_files(UI_SRC, (".ts", ".tsx"))
    tests = _iter_files(REPO / "tests", (".py",))
    ingestion = _iter_files(REPO / "ingestion", (".py",))

    route_re = re.compile(r"""@router\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']""")
    # Collect route path suffixes; the frontend prefixes with a base URL + router prefix.
    routes: list[tuple[str, str, str, int]] = []  # method, path, file, line
    for f in api:
        try:
            lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        for i, line in enumerate(lines, 1):
            m = route_re.search(line)
            if m:
                routes.append((m.group(1).upper(), m.group(2), str(f.relative_to(REPO)), i))

    ui_blob = "\n".join(f.read_text(encoding="utf-8", errors="replace") for f in ts)
    ingestion_blob = "\n".join(f.read_text(encoding="utf-8", errors="replace") for f in ingestion)
    test_blob = "\n".join(f.read_text(encoding="utf-8", errors="replace") for f in tests)

    wires: list[Wire] = []
    # Router prefixes: FastAPI mounts intelligence_router under /intelligence and
    # telemetry_router under /telemetry (see api/main.py include_router prefixes).
    # The frontend calls the FULL path, so match on the full path — not a bare
    # segment, which false-matches common words (battle/delta/session/clear).
    def _full_paths(file: str, path: str) -> list[str]:
        if "intelligence_router" in file:
            prefix = "/intelligence"
        elif "telemetry_router" in file:
            prefix = "/telemetry"
        else:
            prefix = ""
        full = f"{prefix}{path}".rstrip("/")
        # Search key = the path up to the first {param}, so /lap/{id} -> /telemetry/lap/
        stem = re.sub(r"\{[^}]+\}.*$", "", full).rstrip("/")
        keys = {full}
        if stem and stem != full:
            keys.add(stem)
        return [k for k in keys if len(k) > 4]  # guard against trivially short keys

    for method, path, file, ln in sorted(routes, key=lambda r: (r[1], r[0])):
        w = Wire(channel=f"{method} {path}", origin=f"{file}:{ln}")
        keys = _full_paths(file, path)
        called_ui = any(k in ui_blob for k in keys)
        called_ing = any(k in ingestion_blob for k in keys)
        if called_ui:
            w.destination = "ui (fetch/api client)"
            w.wired = "WIRED"
        elif called_ing:
            w.destination = "ingestion (server->server)"
            w.wired = "WIRED"
        else:
            w.note = "no caller found in ui/ or ingestion/ (full-path match)"
        if any(k in test_blob for k in keys):
            w.tested = "TESTED"
        wires.append(w)
    return wires


def scan_persistence() -> list[Wire]:
    """
    Recorder row fields vs DB INSERT column coverage — catches columns the
    recorder captures but the DB save drops (a data-loss wire).
    """
    recorder = REPO / "intelligence" / "telemetry_recorder.py"
    lap_service = REPO / "api" / "services" / "lap_service.py"
    wires: list[Wire] = []
    if not recorder.exists() or not lap_service.exists():
        return wires

    rec_text = recorder.read_text(encoding="utf-8", errors="replace")
    svc_text = lap_service.read_text(encoding="utf-8", errors="replace")

    # Row keys the recorder writes: the "key": ... inside _record_tick's row dict.
    row_keys = set(re.findall(r'"([a-z_]+)":', rec_text))
    # Restrict to the telemetry-ish fields we care about persisting.
    telemetry_fields = {
        "distance_m", "speed_kph", "throttle", "brake", "steer", "gear", "rpm",
        "drs", "x", "y", "z", "tyres_surface_temp", "tyres_inner_temp",
        "brakes_temp", "ers_store_energy", "ers_deploy_mode",
    }
    recorded = row_keys & telemetry_fields

    # Columns present in the DB INSERT (user_lap_telemetry).
    insert_block = svc_text
    for field_name in sorted(recorded):
        w = Wire(channel=f"db:user_lap_telemetry.{field_name}",
                 origin="telemetry_recorder._record_tick",
                 destination="lap_service.save_lap INSERT")
        if re.search(rf"\b{field_name}\b", insert_block):
            w.wired = "WIRED"
        else:
            w.note = "recorder captures it but DB INSERT omits it (data-loss)"
        if field_name in svc_text:
            w.tested = "see integration tests (DB-gated)"
        wires.append(w)
    return wires


# ─────────────────────────────────────────────────────────────────────────────
# Rendering
# ─────────────────────────────────────────────────────────────────────────────

def render(sections: list[tuple[str, list[Wire]]]) -> str:
    lines: list[str] = []
    lines.append("# APX-IQ Wiring / API Table (generated)")
    lines.append("")
    lines.append("> GENERATED by `scripts/wiring_audit.py` — DO NOT hand-edit; re-run it.")
    lines.append(">")
    lines.append("> **Wired** = static (a matching consumer exists in code).")
    lines.append("> **Tested** = static (a test file references this channel).")
    lines.append("> **Link** = RUNTIME (real bytes flowing). This generator cannot")
    lines.append("> observe runtime, so Link is always `DOWN/UNKNOWN` here — set it")
    lines.append("> truthfully only from a LIVE RUN (game -> UDP -> backend -> UI).")
    lines.append("> A channel can be WIRED yet semantically wrong (shape mismatch);")
    lines.append("> presence-scanning does not prove correctness.")
    lines.append("")
    total = wired = tested = 0
    for title, wires in sections:
        lines.append(f"## {title}")
        lines.append("")
        lines.append("| Channel | Origin | Destination | Wired | Tested | Link | Note |")
        lines.append("|---|---|---|---|---|---|---|")
        for w in wires:
            total += 1
            wired += 1 if w.wired == "WIRED" else 0
            tested += 1 if w.tested.startswith("TESTED") else 0
            lines.append(
                f"| `{w.channel}` | {w.origin} | {w.destination} | "
                f"{w.wired} | {w.tested} | {w.link} | {w.note} |"
            )
        lines.append("")
    summary = (
        f"\n**Summary:** {total} wires scanned · {wired} WIRED · "
        f"{total - wired} UNWIRED · {tested} statically TESTED · "
        f"Link status UNKNOWN until a live run.\n"
    )
    # Insert the summary right after the intro blockquote (the first blank line
    # following the title), rather than at a fragile magic index.
    insert_at = next((i for i, ln in enumerate(lines) if ln.startswith("> presence-scanning")), 0) + 1
    lines.insert(insert_at, summary)
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate the APX-IQ wiring/API table.")
    ap.add_argument("--write", action="store_true",
                    help="write docs/internal/wiring_table.md in addition to stdout")
    args = ap.parse_args()

    sections = [
        ("Socket.IO channels (live telemetry: backend emit -> frontend subscribe)", scan_socketio()),
        ("REST API (FastAPI route -> caller)", scan_rest()),
        ("Persistence (recorder field -> DB column)", scan_persistence()),
    ]
    out = render(sections)
    print(out)

    if args.write:
        dest = REPO / "docs" / "internal" / "wiring_table.md"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(out + "\n", encoding="utf-8")
        print(f"\n[written] {dest.relative_to(REPO)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
