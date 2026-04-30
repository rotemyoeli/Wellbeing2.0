"""
Application configuration.

Each class corresponds to a FLASK_ENV value. `get_config(name)` returns the
correct class. All env-driven values have safe-ish defaults so the app boots
in dev without a .env file (with loud warnings).
"""

from __future__ import annotations

import os
import secrets


def _env_bool(name: str, default: bool = False) -> bool:
    """Parse a boolean env var. Accepts 'true', '1', 'yes' (case-insensitive)."""
    raw = os.getenv(name, str(default)).strip().lower()
    return raw in ("true", "1", "yes", "on")


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    return int(raw)


class BaseConfig:
    """Settings shared across all environments."""

    # ---- Core ---------------------------------------------------------------
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_hex(32))
    VERSION: str = "0.1.0"  # overwritten in app factory

    # ---- Database -----------------------------------------------------------
    # Railway uses postgres:// but SQLAlchemy 2.x requires postgresql://
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL", "sqlite:///dev.db"
    ).replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
    }

    # ---- JWT ----------------------------------------------------------------
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
    JWT_ACCESS_TOKEN_EXPIRES: int = _env_int("JWT_ACCESS_TOKEN_EXPIRES", 900)
    JWT_REFRESH_TOKEN_EXPIRES: int = _env_int("JWT_REFRESH_TOKEN_EXPIRES", 604800)
    JWT_TOKEN_LOCATION: list = ["headers"]
    JWT_HEADER_NAME: str = "Authorization"
    JWT_HEADER_TYPE: str = "Bearer"

    # ---- Anonymity (CRITICAL) -----------------------------------------------
    ANON_TOKEN_SALT: str = os.getenv("ANON_TOKEN_SALT", "")
    COMMENT_ENCRYPTION_KEY: str = os.getenv("COMMENT_ENCRYPTION_KEY", "")

    # ---- CORS ---------------------------------------------------------------
    CORS_ORIGINS: list = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173"
        ).split(",")
        if o.strip()
    ]

    # ---- Rate limiting (Sprint 2+ enforcement) ------------------------------
    RATE_LIMIT_PER_MINUTE: int = _env_int("RATE_LIMIT_PER_MINUTE", 60)

    # ---- Server -------------------------------------------------------------
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = _env_int("PORT", 5000)

    # ---- Feature flags & policy defaults ------------------------------------
    DEFAULT_ANONYMITY_POLICY: str = os.getenv(
        "DEFAULT_ANONYMITY_POLICY", "user_choice"
    )
    AGGREGATION_THRESHOLD: int = _env_int("AGGREGATION_THRESHOLD", 5)
    ALERT_THRESHOLD_LOW: int = _env_int("ALERT_THRESHOLD_LOW", 25)
    ALERT_THRESHOLD_HIGH: int = _env_int("ALERT_THRESHOLD_HIGH", 85)

    # ---- DEV MODE BACKDOOR --------------------------------------------------
    # Search for "DEV MODE BACKDOOR" across the codebase to find every site.
    DEV_MODE_ENABLED: bool = _env_bool("WELLBEING_DEV_MODE", False)

    # ---- DEMO MODE -----------------------------------------------------------
    # Lighter than DEV_MODE: enables /auth/demo-login but does NOT bypass auth
    # on all endpoints. Safe for Railway demo deployments with FLASK_ENV=production.
    DEMO_MODE_ENABLED: bool = _env_bool("WELLBEING_DEMO_MODE", False)

    # Defaults for dev/test (overridden by subclasses)
    DEBUG: bool = False
    TESTING: bool = False


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    # Use a deterministic salt in tests so anon_token outputs are reproducible.
    # Must be >=16 chars to satisfy the AnonTokenError guard.
    ANON_TOKEN_SALT = "test-salt-deterministic-and-long-enough"
    DEV_MODE_ENABLED = False  # tests should exercise real auth paths


class ProductionConfig(BaseConfig):
    DEBUG = False

    @classmethod
    def validate(cls) -> None:
        """Sanity checks for production. Called from create_app in prod."""
        if cls.DEV_MODE_ENABLED:
            raise RuntimeError(
                "WELLBEING_DEV_MODE is true in production. Refusing to start. "
                "Unset the env var or set it to false."
            )
        if not cls.ANON_TOKEN_SALT or "dev-salt" in cls.ANON_TOKEN_SALT:
            raise RuntimeError(
                "ANON_TOKEN_SALT is unset or default in production. "
                "Generate a real one: python -c 'import secrets; print(secrets.token_hex(32))'"
            )
        if cls.SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
            raise RuntimeError(
                "SQLite is not allowed in production. Set DATABASE_URL to a "
                "PostgreSQL connection string."
            )


_CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str) -> type[BaseConfig]:
    """Resolve a config class by name. Defaults to DevelopmentConfig."""
    cfg = _CONFIGS.get(name, DevelopmentConfig)
    if name == "production" and hasattr(cfg, "validate"):
        cfg.validate()
    return cfg
