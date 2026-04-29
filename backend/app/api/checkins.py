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
from app.models.checkin import CheckIn
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


@checkins_bp.patch("/<check_in_id>/follow-up")
@auth_required
def update_follow_up(check_in_id: str):
    """
    Update follow-up answers (B3 screen: support_q and workload_q)
    after initial check-in submission.

    Body: { "supportQ": bool|null, "workloadQ": bool|null }
    """
    user = current_user()
    user_id = user["user_id"]

    check_in = db.session.get(CheckIn, check_in_id)
    if check_in is None:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "Check-in not found"}}
        ), 404

    # Only the owner can update their own identified check-in
    if check_in.user_id != user_id:
        return jsonify(
            {"error": {"code": "FORBIDDEN", "message": "Cannot update another user's check-in"}}
        ), 403

    payload = request.get_json(silent=True) or {}

    support_q = payload.get("supportQ")
    workload_q = payload.get("workloadQ")

    if support_q is not None and not isinstance(support_q, bool):
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": "supportQ must be a boolean or null"}}
        ), 400
    if workload_q is not None and not isinstance(workload_q, bool):
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": "workloadQ must be a boolean or null"}}
        ), 400

    if "supportQ" in payload:
        check_in.support_q = support_q
    if "workloadQ" in payload:
        check_in.workload_q = workload_q

    AuditService.write(
        actor_id=user_id,
        action="checkin.update.followup",
        entity_type="checkin",
        entity_id=check_in_id,
        commit=False,
    )
    db.session.commit()

    return jsonify(check_in.to_dict()), 200


@checkins_bp.patch("/<check_in_id>/comment")
@auth_required
def update_comment(check_in_id: str):
    """
    Add or update comment on an existing check-in (B4 screen).

    Body: { "comment": "string (max 300 chars)" }
    """
    user = current_user()
    user_id = user["user_id"]

    check_in = db.session.get(CheckIn, check_in_id)
    if check_in is None:
        return jsonify(
            {"error": {"code": "NOT_FOUND", "message": "Check-in not found"}}
        ), 404

    # Only the owner can update their own identified check-in
    if check_in.user_id != user_id:
        return jsonify(
            {"error": {"code": "FORBIDDEN", "message": "Cannot update another user's check-in"}}
        ), 403

    payload = request.get_json(silent=True) or {}
    comment = payload.get("comment")

    if comment is not None and len(comment) > 300:
        return jsonify(
            {"error": {"code": "VALIDATION_ERROR", "message": "Comment exceeds 300 character limit"}}
        ), 400

    check_in.comment_ciphertext = CheckInService._encrypt_comment(comment)

    AuditService.write(
        actor_id=user_id,
        action="checkin.update.comment",
        entity_type="checkin",
        entity_id=check_in_id,
        meta={"has_comment": comment is not None},
        commit=False,
    )
    db.session.commit()

    return jsonify(check_in.to_dict()), 200


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
