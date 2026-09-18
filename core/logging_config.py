"""
APX IQ Structured Logging
===========================

Configures structlog for structured JSON output in production
and pretty human-readable output in development.

Usage:
    from core.logging_config import configure_logging, get_logger

    configure_logging()  # Call once at startup

    log = get_logger("APXIQ.API")
    log.info("lap_saved", lap_id=42, session_uid=99, duration_ms=12)
    # → {"event": "lap_saved", "lap_id": 42, "session_uid": 99, ...}
"""

import logging
import os
import sys

import structlog


def configure_logging() -> None:
    """
    Configure structlog + stdlib logging.
    Set LOG_LEVEL env var to adjust verbosity (default: INFO).
    Set LOG_FORMAT=json for machine-readable output (default: pretty).
    """
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level      = getattr(logging, level_name, logging.INFO)
    log_format = os.getenv("LOG_FORMAT", "pretty").lower()

    # Shared processors applied to every log event
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if log_format == "json":
        # Production: JSON one-line per event
        renderer = structlog.processors.JSONRenderer()
    else:
        # Development: coloured, human-readable
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processor=renderer,
        foreign_pre_chain=shared_processors,
    )

    # Force UTF-8 on the log stream. On Windows the console defaults to a
    # legacy code page (cp1252) and any non-ASCII character in a log message
    # (e.g. "→", "°C") raises UnicodeEncodeError and crashes the process —
    # which happens on the live path the moment a lap is analyzed or a UDP
    # packet is logged. Reconfiguring to UTF-8 makes all log output safe
    # regardless of the host console code page.
    stream = sys.stdout
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        # Stream doesn't support reconfigure (already wrapped/redirected);
        # fall back to a UTF-8 writer around its underlying buffer.
        buffer = getattr(stream, "buffer", None)
        if buffer is not None:
            import io
            stream = io.TextIOWrapper(buffer, encoding="utf-8", errors="replace")

    handler = logging.StreamHandler(stream)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Quiet noisy libraries
    for noisy in ("uvicorn.access", "httpx", "httpcore", "fastf1"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Return a named structlog logger."""
    return structlog.get_logger(name)
