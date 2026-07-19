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

    handler = logging.StreamHandler(sys.stdout)
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
