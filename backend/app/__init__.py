"""
Application factory.

`create_app(config_name)` returns a fully-configured Flask app ready to run.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask

# Load .env from the project root (one level above backend/) BEFORE config import.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

from app.config import get_config  # noqa: E402  (after dotenv load by design)
from app.extensions import cors, db, jwt, migrate  # noqa: E402


VERSION = "0.3.0"


def create_app(config_name: str | None = None) -> Flask:
    """
    Build and return a Flask application instance.

    Args:
        config_name: One of "development", "testing", "production".
                     If None, read from FLASK_ENV env var (default "development").
    """
    app = Flask(__name__)

    # ---- Config -------------------------------------------------------------
    config_name = config_name or os.getenv("FLASK_ENV", "development")
    app.config.from_object(get_config(config_name))
    app.config["VERSION"] = VERSION

    # ---- Logging ------------------------------------------------------------
    _configure_logging(app)
    _log_dev_mode_banner(app)

    # ---- Extensions ---------------------------------------------------------
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    # ---- Models (must be imported so Alembic sees them) ---------------------
    from app.models import (  # noqa: F401
        alert,
        audit,
        checkin,
        consent_log,
        notification,
        otp_request,
        shift,
        team_update,
        user,
    )

    # ---- Blueprints ---------------------------------------------------------
    from app.api import register_blueprints

    register_blueprints(app)

    # ---- Middleware ---------------------------------------------------------
    from app.middleware.dev_mode import register_dev_mode_middleware, seed_dev_mode_user
    from app.middleware.rate_limit import register_rate_limiter

    register_dev_mode_middleware(app)
    register_rate_limiter(app)

    # ---- Seed the synthetic DEV_MODE user, if applicable --------------------
    # No-op if DEV_MODE is off. Tolerates "users table missing" by logging a
    # warning — the next boot after `flask db upgrade` will seed it.
    seed_dev_mode_user(app)

    return app


def _configure_logging(app: Flask) -> None:
    """Basic structured-ish logging. Sprint 5 will replace with structlog."""
    level = logging.DEBUG if app.config.get("DEBUG") else logging.INFO

    # Clear default Flask handlers to avoid double-logging.
    for handler in list(app.logger.handlers):
        app.logger.removeHandler(handler)

    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
    app.logger.setLevel(level)


def _log_dev_mode_banner(app: Flask) -> None:
    """Log a loud banner if DEV_MODE is on. This is intentional noise."""
    if app.config.get("DEV_MODE_ENABLED"):
        app.logger.warning("=" * 70)
        app.logger.warning("!! WELLBEING_DEV_MODE IS ENABLED !!")
        app.logger.warning("!! All authentication is BYPASSED.")
        app.logger.warning("!! All requests treated as ADMIN.")
        app.logger.warning("!! Responses include header X-Dev-Mode: ON")
        app.logger.warning("!! THIS MUST BE OFF IN PRODUCTION.")
        app.logger.warning("=" * 70)
