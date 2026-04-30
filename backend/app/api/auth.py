"""
Authentication endpoints.

POST /api/v1/auth/request-otp
    Body: { "contact": "user@example.com", "contactType": "email" }
    Returns: 202 Accepted (always — never reveals whether contact exists)

POST /api/v1/auth/verify-otp
    Body: { "contact": "...", "code": "123456" }
    Returns: 200 { accessToken, refreshToken, user: {...} }

POST /api/v1/auth/refresh
    Authorization: Bearer <refresh_token>
    Returns: 200 { accessToken }

POST /api/v1/auth/logout
    Authorization: Bearer <access_token>
    Returns: 204
    (Sprint 4 will add a token-revocation list backed by Redis)

POST /api/v1/auth/me
    Authorization: Bearer <access_token>
    Returns: 200 { user: {...} }

In dev mode (WELLBEING_DEV_MODE=true), the auth_required decorator
bypasses these checks for OTHER endpoints — but the OTP endpoints
themselves remain testable so you can exercise the real flow.
"""

from __future__ import annotations

from flask import Blueprint, current_app, g, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from app.middleware.auth import auth_required, current_user
from app.services.audit_service import AuditService
from app.services.auth_service import (
    AuthService,
    OtpRateLimitError,
    OtpRequestError,
    OtpVerificationError,
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/request-otp")
def request_otp():
    payload = request.get_json(silent=True) or {}
    contact = (payload.get("contact") or "").strip()
    contact_type = payload.get("contactType", "email")

    # Always return 202 to avoid contact-existence leakage. Errors that
    # would surface real attack signal (e.g., rate limit) still return 4xx.
    try:
        AuthService.request_otp(
            contact=contact,
            contact_type=contact_type,
            ip_hash=AuditService.hash_ip(AuditService._request_ip()),
        )
    except OtpRateLimitError as exc:
        AuditService.write(
            actor_id=None,
            action="auth.otp.request.ratelimited",
            entity_type="otp_request",
            meta={"contact_type": contact_type},
        )
        return jsonify(
            {"error": {"code": "RATE_LIMITED", "message": str(exc)}}
        ), 429
    except OtpRequestError as exc:
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}}
        ), 400

    AuditService.write(
        actor_id=None,
        action="auth.otp.request",
        entity_type="otp_request",
        meta={"contact_type": contact_type},
    )
    return jsonify({"status": "accepted"}), 202


@auth_bp.post("/verify-otp")
def verify_otp():
    payload = request.get_json(silent=True) or {}
    contact = (payload.get("contact") or "").strip()
    code = (payload.get("code") or "").strip()

    try:
        user, tokens = AuthService.verify_otp(contact=contact, code=code)
    except OtpVerificationError as exc:
        # Generic error — never reveal *why* it failed
        AuditService.write(
            actor_id=None,
            action="auth.otp.verify.failed",
            entity_type="otp_request",
        )
        return jsonify(
            {"error": {"code": "INVALID_CODE", "message": str(exc)}}
        ), 401

    AuditService.write(
        actor_id=user.user_id,
        action="auth.otp.verify.success",
        entity_type="user",
        entity_id=user.user_id,
    )
    return jsonify(
        {
            "accessToken": tokens["access_token"],
            "refreshToken": tokens["refresh_token"],
            "user": user.to_dict(),
        }
    ), 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    """Exchange a refresh token for a new access token."""
    identity = get_jwt_identity()
    claims = get_jwt()
    new_token = create_access_token(
        identity=identity,
        additional_claims={"user_id": identity, "role": claims.get("role", "employee")},
    )
    AuditService.write(
        actor_id=identity,
        action="auth.refresh",
        entity_type="user",
        entity_id=identity,
    )
    return jsonify({"accessToken": new_token}), 200


@auth_bp.post("/logout")
@auth_required
def logout():
    """
    Logout — currently a client-side gesture. Sprint 4 will add a
    server-side token-revocation list (Redis-backed).
    """
    user = current_user()
    AuditService.write(
        actor_id=user["user_id"],
        action="auth.logout",
        entity_type="user",
        entity_id=user["user_id"],
    )
    return "", 204


@auth_bp.post("/demo-login")
def demo_login():
    """
    Demo/dev login — issues a real JWT for a seeded demo user without OTP.

    Only available when DEV_MODE_ENABLED is True. Controlled by env var
    WELLBEING_DEV_MODE=true.

    Body: { "userId": "demo-superadmin" }
       or { "email": "superadmin@demo.local" }
    Returns: 200 { accessToken, refreshToken, user }
    """
    if not current_app.config.get("DEV_MODE_ENABLED"):
        return jsonify(
            {"error": {"code": "FORBIDDEN", "message": "Demo login is disabled"}}
        ), 403

    from app.extensions import db as _db
    from app.models.user import User

    payload = request.get_json(silent=True) or {}
    user_id = payload.get("userId")
    email = payload.get("email")

    user = None
    if user_id:
        user = _db.session.get(User, user_id)
    elif email:
        user = _db.session.query(User).filter_by(contact_email=email).first()

    if not user or not user.is_active:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "Demo user not found"}}
        ), 404

    access_token = create_access_token(
        identity=user.user_id,
        additional_claims={"user_id": user.user_id, "role": user.role},
    )
    from flask_jwt_extended import create_refresh_token
    refresh_token = create_refresh_token(
        identity=user.user_id,
        additional_claims={"user_id": user.user_id, "role": user.role},
    )

    AuditService.write(
        actor_id=user.user_id,
        action="auth.demo_login",
        entity_type="user",
        entity_id=user.user_id,
        meta={"method": "demo_login"},
    )

    # Return user dict with department_id included
    user_dict = user.to_dict()
    user_dict["is_dev_mode"] = True

    return jsonify({
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "user": user_dict,
    }), 200


@auth_bp.get("/me")
@auth_required
def me():
    """Return the current user's profile, including department_id from DB."""
    user = current_user()
    # Enrich with department_id from DB (the g.current_user dict may not have it)
    from app.extensions import db as _db
    from app.models.user import User
    db_user = _db.session.get(User, user["user_id"])
    dept_id = db_user.department_id if db_user else None

    return jsonify(
        {
            "user": {
                "user_id": user["user_id"],
                "role": user.get("role"),
                "display_name": user.get("display_name"),
                "department_id": dept_id,
                "is_dev_mode": user.get("is_dev_mode", False),
            }
        }
    ), 200
