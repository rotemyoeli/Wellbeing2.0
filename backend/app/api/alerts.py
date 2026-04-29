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

    try:
        AlertService.acknowledge(
            alert,
            step=step,
            actor_id=user["user_id"],
            note=note,
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
        },
        commit=False,
    )
    db.session.commit()
    return jsonify(alert.to_dict()), 200
