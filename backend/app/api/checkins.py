"""
Check-in endpoints.

POST /api/v1/checkins
    Create a new check-in. Identified or anonymous depending on `anonMode`.
    Triggers an Alert synchronously if energy crosses the threshold.

GET /api/v1/checkins/me
    List the authenticated user's IDENTIFIED check-ins.
    Anonymous check-ins are unrecoverable by design.

Wire format follows Spec v2 §9.1 (camelCase JSON body).
"""

from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from app.extensions import db
from app.middleware.auth import auth_required, current_user
from app.services.alert_service import AlertService
from app.services.audit_service import AuditService
from app.services.check_in_service import CheckInService, CheckInValidationError

checkins_bp = Blueprint("checkins", __name__)


@checkins_bp.post("/")
@auth_required
def create_checkin():
    """
    Body (camelCase per Spec v2 §9.1):
        {
            "energy": 0..100,
            "anonMode": bool,
            "supportQ": bool | null,
            "workloadQ": bool | null,
            "comment": str | null,    (max 300 chars)
            "shiftId": str | null
        }

    Returns:
        201 { "checkInId": "...", "timestamp": "..." }
        400 { "error": ... } on validation failure
        401 if not authenticated
    """
    user = current_user()
    user_id = user["user_id"]

    payload = request.get_json(silent=True) or {}

    # Translate camelCase wire format → service kwargs
    energy = payload.get("energy")
    anon_mode = bool(payload.get("anonMode", False))
    support_q = payload.get("supportQ")
    workload_q = payload.get("workloadQ")
    comment = payload.get("comment")
    shift_id = payload.get("shiftId")

    try:
        if anon_mode:
            salt = current_app.config.get("ANON_TOKEN_SALT", "")
            check_in = CheckInService.create_anonymous(
                user_id=user_id,
                salt=salt,
                energy=energy,
                support_q=support_q,
                workload_q=workload_q,
                comment=comment,
                shift_id=shift_id,
            )
        else:
            check_in = CheckInService.create_identified(
                user_id=user_id,
                energy=energy,
                support_q=support_q,
                workload_q=workload_q,
                comment=comment,
                shift_id=shift_id,
            )
    except CheckInValidationError as exc:
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}}
        ), 400

    # Synchronously generate an alert if thresholds breached.
    alert = AlertService.maybe_create_for_checkin(check_in)

    # Audit log entry. Note: for anonymous mode, we record only that an
    # anonymous check-in was created — never the original user_id.
    AuditService.write(
        actor_id=user_id if not anon_mode else None,
        action="checkin.create",
        entity_type="checkin",
        entity_id=check_in.check_in_id,
        meta={
            "anon_mode": anon_mode,
            "alert_created": alert is not None,
            "alert_type": alert.type if alert else None,
        },
        commit=False,
    )

    db.session.commit()

    response_body = {
        "checkInId": check_in.check_in_id,
        "timestamp": check_in.created_at.isoformat() if check_in.created_at else None,
    }
    if alert is not None:
        response_body["alertCreated"] = True
        response_body["alertType"] = alert.type
    return jsonify(response_body), 201


@checkins_bp.get("/me")
@auth_required
def list_my_checkins():
    """
    List the user's IDENTIFIED check-ins. Anonymous check-ins are not
    returned (by design — they cannot be joined back to a user).
    """
    user = current_user()
    rows = CheckInService.list_for_user(user["user_id"])
    AuditService.write(
        actor_id=user["user_id"],
        action="checkin.read.me",
        entity_type="checkin",
        meta={"count": len(rows)},
    )
    return jsonify(
        {"items": [r.to_dict() for r in rows], "total": len(rows)}
    ), 200
