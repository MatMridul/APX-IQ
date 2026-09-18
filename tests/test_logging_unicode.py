"""
Regression test for the Windows cp1252 unicode-in-logs defect.

Root cause: configure_logging() attached a StreamHandler to sys.stdout, which
on Windows is cp1252. A log message containing non-ASCII (the "->" arrow logged
by intelligence/alignment.py on every lap, "degC" in coach tips) cannot be
encoded to cp1252.

Verified severity (measured, not assumed): Python's stdlib logging.emit()
CATCHES the UnicodeEncodeError internally and prints "--- Logging error ---" to
stderr rather than propagating it, so the process does NOT crash — but the log
line is DROPPED and a traceback is spammed on every occurrence. A lost-logs /
error-spam defect on the API/intelligence path, not a hard crash.

The fix forces the log stream to UTF-8 so the message is written intact.

This test runs the check in an ISOLATED SUBPROCESS with a cp1252 stdout,
because configure_logging() mutates global logging state and pytest captures
stdout — both of which make an in-process assertion unreliable. The subprocess
reports, on stderr, the handler stream encoding and whether the UTF-8-encoded
arrow actually reached the output buffer.
"""

import subprocess
import sys
import textwrap


_PROBE = textwrap.dedent(
    """
    import io, sys, logging
    raw = io.BytesIO()
    sys.stdout = io.TextIOWrapper(raw, encoding="cp1252", errors="strict")
    from core.logging_config import configure_logging, get_logger
    configure_logging()
    enc = getattr(logging.getLogger().handlers[0].stream, "encoding", "?")
    get_logger("PROBE").info("grid 0m \\u2192 2983m")
    for h in logging.getLogger().handlers:
        h.flush()
    present = "\\u2192".encode("utf-8") in raw.getvalue()
    sys.stderr.write(f"ENC={enc} ARROW_PRESENT={present}\\n")
    """
)


def test_cp1252_unicode_log_is_written_utf8(tmp_path):
    """A unicode log line must survive a cp1252 console (fix = UTF-8 stream)."""
    probe = tmp_path / "probe.py"
    probe.write_text(_PROBE, encoding="utf-8")

    # Run from the repo root so `core` imports resolve.
    import os
    import pathlib
    repo_root = pathlib.Path(__file__).resolve().parents[1]

    env = dict(os.environ)
    env["PYTHONPATH"] = str(repo_root) + os.pathsep + env.get("PYTHONPATH", "")

    result = subprocess.run(
        [sys.executable, str(probe)],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
        timeout=60,
        env=env,
    )
    diag = result.stderr

    assert "ENC=utf-8" in diag, f"log stream is not UTF-8 (fix inactive). stderr:\n{diag}"
    assert "ARROW_PRESENT=True" in diag, f"unicode arrow lost from log output. stderr:\n{diag}"
    # And the swallowed-encode-error spam must be gone.
    assert "--- Logging error ---" not in diag, f"logging still hitting encode errors:\n{diag}"
