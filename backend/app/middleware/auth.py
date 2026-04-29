"""
Authentication middleware.

Behaviour:
    - If WELLBEING_DEV_MODE=true:    bypass auth; current_user = DEV_MODE Admin
    - If a valid JWT is present:     resolve user from JWT subject + DB
    - Otherwise:                     401

The decorators are:
    @auth_required          — requires any authenticated user
    @role_required("...")   — requires a specific role (implies authenticated)

The resolved user is on flask.g.current_user as a dict:
    {"user_id": "...", "role": "...", "display_name": "...", "is_dev_mode": bool}
"""

from __future__ import annotations

from functools import wraps
from typing import Callable

from flask import current_app, g, jsonify, request
from flask_jwt_extended import decode_token
from flask_jwt_extended.exceptions import JWTExtendedException
from jwt.exceptions import PyJWTError

from app.middleware.dev_mode import dev_mode_user_payload, is_dev_mode_active


def _resolve_from_jwt() -> dict | None:
    """Pull a user dict from a valid Bearer JWT, or None on any failure."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):].strip()
    if not token:
        return None
    try:
        decoded = decode_token(token)
    except (JWTExtendedException, PyJWTError):
        return None

    user_id = decoded.get("sub")
    if not user_id:
        return None

    # Lazy import to avoid circular imports at module load
    from app.extensions import db
    from app.models.user import User

    user = db.session.get(User, user_id)
    if user is None or not user.is_active:
        return None

    return {
        "user_id": user.user_id,
        "role": user.role,
        "display_name": user.display_name,
        "is_dev_mode": False,
    }


def _resolve_current_user() -> dict | None:
    """Resolve the user behind this request, or None if unauthenticated."""
    if is_dev_mode_active(current_app):
        # DEV MODE BACKDOOR — every request is an admin.
        return dev_mode_user_payload()
    return _resolve_from_jwt()


def auth_required(fn: Callable) -> Callable:
    """Decorator: requires an authenticated request."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _resolve_current_user()
        if user is None:
            return jsonify(
                {
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Authentication required.",
                    }
                }
            ), 401
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def role_required(*allowed_roles: str) -> Callable:
    """Decorator: requires an authenticated user with one of the allowed roles."""

    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = _resolve_current_user()
            if user is None:
                return jsonify(
                    {
                        "error": {
                            "code": "UNAUTHORIZED",
                            "message": "Authentication required.",
                        }
                    }
                ), 401
            if user.get("role") not in allowed_roles:
                return jsonify(
                    {
                        "error": {
                            "code": "FORBIDDEN",
                            "message": f"Requires one of: {', '.join(allowed_roles)}.",
                        }
                    }
                ), 403
            g.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def current_user() -> dict:
    """Return the user resolved by the decorator. Raises if none is set."""
    user = getattr(g, "current_user", None)
    if user is None:
        raise RuntimeError(
            "current_user() called outside of an authenticated request. "
            "Apply @auth_required to the endpoint."
        )
    return user
