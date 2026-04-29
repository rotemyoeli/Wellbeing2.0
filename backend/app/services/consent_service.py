"""
Consent service — Amendment 13 compliance.

Manages privacy notice consent lifecycle:
    - Record consent grant with version hash
    - Check if user has current consent
    - Re-prompt on policy version change

Design note: consent_at on the User model is a convenience denormalisation.
The authoritative record is always the consent_log table.
"""

from __future__ import annotations

from typing import Optional

from flask import current_app

from app.extensions import db
from app.models import utcnow
from app.models.consent_log import ConsentLog
from app.models.user import User


# Bump this when the privacy notice text changes.
# Users with consent for an older version will be re-prompted.
CURRENT_CONSENT_VERSION = "1.0"


class ConsentService:
    @staticmethod
    def has_current_consent(user_id: str) -> bool:
        """Check if the user has accepted the current privacy notice version."""
        row = (
            db.session.query(ConsentLog)
            .filter(
                ConsentLog.user_id == user_id,
                ConsentLog.version == CURRENT_CONSENT_VERSION,
            )
            .first()
        )
        return row is not None

    @staticmethod
    def get_latest_consent(user_id: str) -> Optional[ConsentLog]:
        """Return the most recent consent record for the user."""
        return (
            db.session.query(ConsentLog)
            .filter(ConsentLog.user_id == user_id)
            .order_by(ConsentLog.consent_at.desc())
            .first()
        )

    @classmethod
    def grant_consent(
        cls,
        *,
        user_id: str,
        ip_hash: Optional[str] = None,
        method: str = "web",
    ) -> ConsentLog:
        """
        Record a consent grant for the current privacy notice version.

        Also updates the convenience `consent_at` field on the User model.
        """
        if method not in ("web", "import", "api"):
            raise ValueError(f"Invalid consent method: {method}")

        now = utcnow()

        entry = ConsentLog(
            user_id=user_id,
            version=CURRENT_CONSENT_VERSION,
            consent_at=now,
            ip_hash=ip_hash,
            method=method,
        )
        db.session.add(entry)

        # Update convenience field on User
        user = db.session.get(User, user_id)
        if user:
            user.consent_at = now

        db.session.flush()
        return entry
