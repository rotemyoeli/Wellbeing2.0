"""
Team Updates endpoints — the closed-loop feedback engine.

GET    /api/v1/team-updates                    List updates for a department
GET    /api/v1/team-updates/<id>               Get single update
POST   /api/v1/team-updates                    Create (manager/admin only)
PUT    /api/v1/team-updates/<id>               Edit within 24h (author only)
DELETE /api/v1/team-updates/<id>               Soft-delete (author or admin)

Screen B5 (employee): team feed showing manager's published responses.
Screen C5 (manager): closed-loop composer (mandatory after alert ack).
Screen C7 (manager): updates feed with edit window.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.middleware.auth import auth_required, current_user, role_required
from app.services.audit_service import AuditService
from app.services.team_update_service import TeamUpdateService, TeamUpdateValidationError

team_updates_bp = Blueprint("team_updates", __name__)


@team_updates_bp.get("/")
@auth_required
def list_updates():
    """
    List published team updates for a department.

    Query params:
        departmentId: required — the ward to fetch updates for
        limit: optional (default 20, max 50)
    """
    department_id = request.args.get("departmentId")
    if not department_id:
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": "departmentId query param is required"}}
        ), 400

    limit = min(int(request.args.get("limit", 20)), 50)

    user = current_user()
    # Managers see all (including unpublished); employees see published only
    published_only = user["role"] not in ("manager", "admin")

    updates = TeamUpdateService.list_for_department(
        department_id,
        limit=limit,
        published_only=published_only,
    )

    return jsonify({
        "items": [u.to_dict() for u in updates],
        "total": len(updates),
    }), 200


@team_updates_bp.get("/<update_id>")
@auth_required
def get_update(update_id: str):
    """Get a single team update."""
    update = TeamUpdateService.get(update_id)
    if update is None or not update.is_active:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "Update not found"}}
        ), 404

    return jsonify(update.to_dict()), 200


@team_updates_bp.post("/")
@role_required("manager", "admin")
def create_update():
    """
    Create a new team update.

    Body (camelCase):
        {
            "departmentId": "string (required)",
            "content": "string (10-500 chars, required)",
            "publish": bool (default true)
        }
    """
    user = current_user()
    payload = request.get_json(silent=True) or {}

    department_id = payload.get("departmentId")
    content = payload.get("content")
    publish = payload.get("publish", True)

    try:
        update = TeamUpdateService.create(
            author_id=user["user_id"],
            department_id=department_id or "",
            content=content or "",
            publish=bool(publish),
        )
    except TeamUpdateValidationError as exc:
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}}
        ), 400

    AuditService.write(
        actor_id=user["user_id"],
        action="team_update.create",
        entity_type="team_update",
        entity_id=update.update_id,
        meta={
            "department_id": department_id,
            "published": update.published_at is not None,
        },
        commit=False,
    )
    db.session.commit()

    return jsonify(update.to_dict()), 201


@team_updates_bp.put("/<update_id>")
@role_required("manager", "admin")
def edit_update(update_id: str):
    """
    Edit a team update's content. Only allowed within 24h of creation
    and only by the original author (or admin).

    Body: { "content": "string (10-500 chars)" }
    """
    user = current_user()
    update = TeamUpdateService.get(update_id)
    if update is None or not update.is_active:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "Update not found"}}
        ), 404

    # Only the author or admin can edit
    if update.author_id != user["user_id"] and user["role"] != "admin":
        return jsonify(
            {"error": {"code": "FORBIDDEN", "message": "Only the author can edit this update"}}
        ), 403

    payload = request.get_json(silent=True) or {}
    content = payload.get("content", "")

    try:
        TeamUpdateService.update_content(update, content=content)
    except TeamUpdateValidationError as exc:
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}}
        ), 400

    AuditService.write(
        actor_id=user["user_id"],
        action="team_update.edit",
        entity_type="team_update",
        entity_id=update.update_id,
        commit=False,
    )
    db.session.commit()

    return jsonify(update.to_dict()), 200


@team_updates_bp.delete("/<update_id>")
@role_required("manager", "admin")
def delete_update(update_id: str):
    """Soft-delete a team update. Author or admin only."""
    user = current_user()
    update = TeamUpdateService.get(update_id)
    if update is None or not update.is_active:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "Update not found"}}
        ), 404

    if update.author_id != user["user_id"] and user["role"] != "admin":
        return jsonify(
            {"error": {"code": "FORBIDDEN", "message": "Only the author or admin can delete this update"}}
        ), 403

    TeamUpdateService.soft_delete(update)

    AuditService.write(
        actor_id=user["user_id"],
        action="team_update.delete",
        entity_type="team_update",
        entity_id=update.update_id,
        commit=False,
    )
    db.session.commit()

    return "", 204
