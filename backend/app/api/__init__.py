"""
API blueprint registration.

Each API module registers its own blueprint at /api/v1/<resource>.
This file just wires them up.
"""

from __future__ import annotations

from flask import Flask


def register_blueprints(app: Flask) -> None:
    from app.api.health import health_bp
    from app.api.auth import auth_bp
    from app.api.checkins import checkins_bp
    from app.api.consent import consent_bp
    from app.api.dashboard import dashboard_bp
    from app.api.alerts import alerts_bp
    from app.api.users import users_bp
    from app.api.team_updates import team_updates_bp

    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(checkins_bp, url_prefix="/api/v1/checkins")
    app.register_blueprint(consent_bp, url_prefix="/api/v1/consent")
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1/dashboard")
    app.register_blueprint(alerts_bp, url_prefix="/api/v1/alerts")
    app.register_blueprint(users_bp, url_prefix="/api/v1/users")
    app.register_blueprint(team_updates_bp, url_prefix="/api/v1/team-updates")
