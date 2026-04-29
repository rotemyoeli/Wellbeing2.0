"""
User profile endpoints.

GET   /api/v1/users/me          Get current user profile
PATCH /api/v1/users/me          Update display_name and/or role

Screen A2 in the design pack: after first OTP verification, the user
sets their display name and role (nurse / doctor / admin / other).
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.middleware.auth import auth_required, current_user
from app.models.user import User
from app.services.audit_service import AuditService

users_bp = Blueprint("users", __name__)


@users_bp.get("/me")
@auth_required
def get_profile():
    """Return the current user's full profile."""
    user = current_user()
    user_obj = db.session.get(User, user["user_id"])
    if user_obj is None:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "User not found"}}
        ), 404

    return jsonify({"user": user_obj.to_dict()}), 200


@users_bp.patch("/me")
@auth_required
def update_profile():
    """
    Update the current user's profile.

    Body (camelCase):
        {
            "displayName": "string (3-120 chars)",
            "role": "employee | manager | social_worker | admin",
            "departmentId": "string | null"
        }

    All fields are optional. Only provided fields are updated.
    """
    user = current_user()
    user_id = user["user_id"]
    user_obj = db.session.get(User, user_id)
    if user_obj is None:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "User not found"}}
        ), 404

    payload = request.get_json(silent=True) or {}
    changes = {}

    # Display name
    if "displayName" in payload:
        name = payload["displayName"]
        if not isinstance(name, str) or not name.strip():
            return jsonify(
                {"error": {"code": "VALIDATION_ERROR", "message": "displayName must be a non-empty string"}}
            ), 400
        name = name.strip()
        if len(name) < 3 or len(name) > 120:
            return jsonify(
                {"error": {"code": "VALIDATION_ERROR", "message": "displayName must be 3-120 characters"}}
            ), 400
        user_obj.display_name = name
        changes["display_name"] = name

    # Role
    if "role" in payload:
        role = payload["role"]
        if role not in User.ROLES:
            return jsonify(
                {"error": {"code": "VALIDATION_ERROR", "message": f"role must be one of: {', '.join(User.ROLES)}"}}
            ), 400
        user_obj.role = role
        changes["role"] = role

    # Department
    if "departmentId" in payload:
        dept = payload["departmentId"]
        if dept is not None and not isinstance(dept, str):
            return jsonify(
                {"error": {"code": "VALIDATION_ERROR", "message": "departmentId must be a string or null"}}
            ), 400
        user_obj.department_id = dept
        changes["department_id"] = dept

    if not changes:
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": "No valid fields to update"}}
        ), 400

    AuditService.write(
        actor_id=user_id,
        action="user.update",
        entity_type="user",
        entity_id=user_id,
        meta={"fields": list(changes.keys())},
        commit=False,
    )
    db.session.commit()

    return jsonify({"user": user_obj.to_dict()}), 200
