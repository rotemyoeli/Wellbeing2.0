"""
DEV MODE BACKDOOR — auth bypass for local development.

When WELLBEING_DEV_MODE=true:
    - All requests bypass JWT validation.
    - Every request is treated as having admin role.
    - Every response includes header `X-Dev-Mode: ON`.
    - The synthetic dev user is auto-seeded into the users table on app
      startup (so FK constraints on checkins.user_id pass).

This MUST be off in production. The production config validation in
app/config.py refuses to start if it's on.

Search for "DEV MODE BACKDOOR" across the codebase to find every site that
participates in the bypass.
"""

from __future__ import annotations

from flask import Flask


# Stable UUID for the synthetic dev-mode user.
# Used both as user_id in dev_mode_user_payload() and as the seed PK.
DEV_MODE_USER_ID = "00000000-0000-0000-0000-000000000000"


def register_dev_mode_middleware(app: Flask) -> None:
    """Wire the X-Dev-Mode response header if DEV_MODE_ENABLED is True."""
    if not app.config.get("DEV_MODE_ENABLED"):
        return

    @app.after_request
    def add_dev_mode_header(response):
        # DEV MODE BACKDOOR
        response.headers["X-Dev-Mode"] = "ON"
        return response


def is_dev_mode_active(app: Flask) -> bool:
    """Returns True if the bypass is active. Used by auth decorators."""
    # DEV MODE BACKDOOR
    return bool(app.config.get("DEV_MODE_ENABLED"))


def dev_mode_user_payload() -> dict:
    """
    The synthetic user that DEV_MODE pretends is making every request.
    """
    # DEV MODE BACKDOOR
    return {
        "user_id": DEV_MODE_USER_ID,
        "role": "admin",
        "display_name": "DEV_MODE Admin",
        "is_dev_mode": True,
    }


def seed_dev_mode_user(app: Flask) -> None:
    """
    Ensure the synthetic dev-mode user exists in the users table.
    No-op if DEV_MODE is off.
    Safe to call before migrations have been applied — wraps in try/except
    so an absent users table just logs a warning instead of crashing.
    """
    if not app.config.get("DEV_MODE_ENABLED"):
        return

    # Lazy imports to keep middleware decoupled from models at import time
    from app.extensions import db
    from app.models.user import User

    try:
        with app.app_context():
            existing = db.session.get(User, DEV_MODE_USER_ID)
            if existing is None:
                user = User(
                    user_id=DEV_MODE_USER_ID,
                    display_name="DEV_MODE Admin",
                    role="admin",
                    is_active=True,
                )
                db.session.add(user)
                db.session.commit()
                app.logger.info(
                    f"[DEV] seeded synthetic dev-mode user {DEV_MODE_USER_ID}"
                )
    except Exception as exc:
        # Most common cause: users table doesn't exist yet (run `flask db upgrade`).
        # Log and continue — the next app boot after migration will seed it.
        app.logger.warning(
            f"[DEV] could not seed dev-mode user (run `flask db upgrade`?): {exc}"
        )
