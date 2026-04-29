"""
Consent endpoints — Amendment 13 (Israeli Privacy Law).

GET  /api/v1/consent/status     Check if current user has consented
POST /api/v1/consent/accept     Record consent grant

Screen A3 in the design pack presents the Privacy Notice on first sign-in.
The user must accept before accessing any other feature.
"""

from __future__ import annotations

from flask import Blueprint, jsonify

from app.extensions import db
from app.middleware.auth import auth_required, current_user
from app.services.audit_service import AuditService
from app.services.consent_service import CURRENT_CONSENT_VERSION, ConsentService

consent_bp = Blueprint("consent", __name__)


@consent_bp.get("/status")
@auth_required
def consent_status():
    """Check whether the current user has accepted the current privacy notice."""
    user = current_user()
    user_id = user["user_id"]

    has_consent = ConsentService.has_current_consent(user_id)
    latest = ConsentService.get_latest_consent(user_id)

    return jsonify({
        "hasConsent": has_consent,
        "currentVersion": CURRENT_CONSENT_VERSION,
        "consentedVersion": latest.version if latest else None,
        "consentedAt": latest.consent_at.isoformat() if latest else None,
    }), 200


@consent_bp.post("/accept")
@auth_required
def accept_consent():
    """Record the user's consent to the current privacy notice version."""
    user = current_user()
    user_id = user["user_id"]

    # Idempotent: if already consented to current version, return success
    if ConsentService.has_current_consent(user_id):
        return jsonify({
            "status": "already_accepted",
            "version": CURRENT_CONSENT_VERSION,
        }), 200

    ip_hash = AuditService.hash_ip(AuditService._request_ip())

    entry = ConsentService.grant_consent(
        user_id=user_id,
        ip_hash=ip_hash,
        method="web",
    )

    AuditService.write(
        actor_id=user_id,
        action="consent.grant",
        entity_type="consent",
        entity_id=entry.consent_id,
        meta={"version": CURRENT_CONSENT_VERSION},
        commit=False,
    )
    db.session.commit()

    return jsonify({
        "status": "accepted",
        "version": CURRENT_CONSENT_VERSION,
        "consentId": entry.consent_id,
    }), 201
