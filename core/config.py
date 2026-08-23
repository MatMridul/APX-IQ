"""
APX IQ — Application Configuration
=====================================

Single source of truth for all configuration values.
All modules must read config from here — never call os.getenv() directly.

Pydantic Settings auto-reads from environment variables and from an
optional .env file in the project root.

Usage:
    from core.config import settings

    # Read a value
    url = settings.database_url
    port = settings.api_port

Environment variables are UPPER_CASE; field names are lower_case.
"""

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application-wide configuration.

    All fields have sensible defaults for local development.
    Override via environment variables or a .env file.
    """

    # ── Network ──────────────────────────────────────────────────────────────
    api_port: int = Field(8000, description="Port the FastAPI server listens on.")
    ingestion_port: int = Field(3001, description="Port the Socket.IO ingestion server listens on.")
    udp_port: int = Field(20777, description="UDP port for F1 game telemetry packets.")

    # URL of the FastAPI server as seen from the ingestion process.
    # Override in Docker: API_BASE_URL=http://api:8000
    api_base_url: str = Field("http://localhost:8000", description="Internal API base URL used by ingestion.")

    # Comma-separated CORS origins, or '*' for all.
    cors_origins: str = Field("*", description="Allowed CORS origins (comma-separated or '*').")

    # ── Database ─────────────────────────────────────────────────────────────
    database_url: Optional[str] = Field(
        None,
        description="asyncpg-compatible PostgreSQL DSN. If unset, in-memory storage is used.",
    )

    # ── Cache ─────────────────────────────────────────────────────────────────
    redis_url: Optional[str] = Field(
        None,
        description="Redis connection URL. If unset, in-memory cache is used.",
    )

    # ── LLM Backends ─────────────────────────────────────────────────────────
    gemini_api_key: Optional[str] = Field(
        None,
        description="Google Gemini API key. If set, Gemini is used before Ollama.",
    )
    ollama_base_url: str = Field(
        "http://localhost:11434",
        description="Base URL for the local Ollama instance.",
    )
    ollama_model: str = Field(
        "llama3.2:3b",
        description="Ollama model name to use for report generation.",
    )

    # ── Observability ─────────────────────────────────────────────────────────
    log_level: str = Field("INFO", description="Logging verbosity: DEBUG, INFO, WARNING, ERROR.")
    log_format: str = Field("pretty", description="Log format: 'pretty' (dev) or 'json' (production).")
    sentry_dsn: Optional[str] = Field(None, description="Sentry DSN for error tracking.")

    # ── Security ──────────────────────────────────────────────────────────────
    secret_key: str = Field(
        "change-me-in-production",
        description="Application secret key. Must be changed before production deployment.",
    )
    admin_api_key: Optional[str] = Field(
        None,
        description="Admin API key for protected administration endpoints.",
    )
    stealth_mode: bool = Field(
        False,
        description="Disables live UI Socket.IO broadcasts to ensure 0% CPU/GPU overhead during races.",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        # Silently ignore extra fields from .env that aren't defined here.
        extra="ignore",
        frozen=False,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


# Module-level singleton — import and use this everywhere.
settings = Settings()
