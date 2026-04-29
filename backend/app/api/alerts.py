"""
Manager alert endpoints.

GET  /api/v1/alerts                  list, optional ?status= filter
POST /api/v1/alerts/<id>/ack         body: {step: 1|2|3, note?: str}

The acknowledge flow is a strict state machine:
    open  → ack1 (Seen)        sets ack_at, ack_by
    ack1  → ack2 (Contacted)   sets contacted_at
    ack2  → closed             sets closed_at, REQUIRES note

Out-of-order transitions return 400. Step 3 without a note returns 400.
Auth: requires role manager / admin.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.middleware.auth import current_user, role_required
from app.services.alert_service import AlertService, AlertWorkflowError
from app.services.audit_service import AuditService

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.get("/")
@role_required("manager", "admin")
def list_alerts():
    status = request.args.get("status")
    if status and status not in ("open", "ack1", "ack2", "closed"):
        return jsonify(
            {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "status must be one of open, ack1, ack2, closed",
                }
            }
        ), 400

    alerts = AlertService.list_alerts(status=status)
    return jsonify(
        {"items": [a.to_dict() for a in alerts], "total": len(alerts)}
    ), 200


@alerts_bp.post("/<alert_id>/ack")
@role_required("manager", "admin")
def acknowledge(alert_id: str):
    alert = AlertService.get_alert(alert_id)
    if alert is None:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "alert not found"}}
        ), 404

    payload = request.get_json(silent=True) or {}
    step = payload.get("step")
    note = payload.get("note")

    if not isinstance(step, int):
        return jsonify(
            {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "step must be an integer (1, 2, or 3)",
                }
            }
        ), 400

    user = current_user()

    publish_to_team = bool(payload.get("publishToTeam", False))
    department_id = payload.get("departmentId")

    try:
        AlertService.acknowledge(
            alert,
            step=step,
            actor_id=user["user_id"],
            note=note,
            publish_to_team=publish_to_team,
            department_id=department_id,
        )
    except AlertWorkflowError as exc:
        return jsonify(
            {"error": {"code": "WORKFLOW_ERROR", "message": str(exc)}}
        ), 400

    AuditService.write(
        actor_id=user["user_id"],
        action=f"alert.ack.step{step}",
        entity_type="alert",
        entity_id=alert.alert_id,
        meta={
            "alert_type": alert.type,
            "new_status": alert.status,
            "has_note": bool(note),
            "published_to_team": publish_to_team,
        },
        commit=False,
    )
    db.session.commit()
    return jsonify(alert.to_dict()), 200


@alerts_bp.get("/unpublished-closures")
@role_required("manager", "admin")
def unpublished_closures():
    """
    C8 screen: list closed alerts that were NOT published as team updates.
    Query params:
        days: int (default 14, max 90)
    """
    days = min(int(request.args.get("days", 14)), 90)
    unpublished = AlertService.list_unpublished_closures(days=days)
    published = AlertService.list_published_closures(days=days)

    user = current_user()
    AuditService.write(
        actor_id=user["user_id"],
        action="alert.closures.review",
        entity_type="alert",
        meta={"days": days, "unpublished_count": len(unpublished)},
    )

    return jsonify({
        "unpublished": [a.to_dict() for a in unpublished],
        "published": [a.to_dict() for a in published],
        "days": days,
    }), 200


@alerts_bp.post("/<alert_id>/publish")
@role_required("manager", "admin")
def publish_closure(alert_id: str):
    """
    Retroactively publish a closed alert's note as a team update.
    Used from C8 screen.

    Body: { "departmentId": "string", "content": "optional override" }
    """
    alert = AlertService.get_alert(alert_id)
    if alert is None:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "Alert not found"}}
        ), 404

    payload = request.get_json(silent=True) or {}
    department_id = payload.get("departmentId")
    content = payload.get("content")

    if not department_id:
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": "departmentId is required"}}
        ), 400

    user = current_user()

    try:
        AlertService.publish_closure(
            alert,
            actor_id=user["user_id"],
            department_id=department_id,
            content=content,
        )
    except AlertWorkflowError as exc:
        return jsonify(
            {"error": {"code": "WORKFLOW_ERROR", "message": str(exc)}}
        ), 400

    AuditService.write(
        actor_id=user["user_id"],
        action="alert.closure.publish",
        entity_type="alert",
        entity_id=alert.alert_id,
        meta={"department_id": department_id},
        commit=False,
    )
    db.session.commit()

    return jsonify(alert.to_dict()), 200
