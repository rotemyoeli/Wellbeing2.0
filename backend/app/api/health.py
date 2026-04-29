"""
Health endpoint — GET /api/v1/health.

Public, no auth. Used by uptime monitors and the frontend boot check.
"""

from __future__ import annotations

from flask import Blueprint, current_app, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    """
    Returns:
        200 with {"status": "ok", "version": "...", "dev_mode": bool}

    The `dev_mode` field is intentionally exposed so monitoring can alert
    if production accidentally has the backdoor on.
    """
    return jsonify(
        {
            "status": "ok",
            "version": current_app.config.get("VERSION", "unknown"),
            "dev_mode": bool(current_app.config.get("DEV_MODE_ENABLED")),
        }
    ), 200
