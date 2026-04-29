"""
ConsentLog model — Spec v2 §8.1 consent_log table.

Required by Israeli Privacy Law Amendment 13 (effective 14 Aug 2025).
Retains record of who gave consent, when, and to which version of the
privacy notice. Retained until erasure request.
"""

from __future__ import annotations

from app.extensions import db
from app.models import gen_uuid, utcnow


class ConsentLog(db.Model):
    __tablename__ = "consent_log"

    consent_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version = db.Column(db.String(20), nullable=False)  # privacy notice version
    consent_at = db.Column(
        db.DateTime, default=utcnow, nullable=False, index=True
    )
    ip_hash = db.Column(db.String(64), nullable=True)
    method = db.Column(db.String(20), nullable=False)  # web / import / api

    __table_args__ = (
        db.CheckConstraint(
            "method IN ('web', 'import', 'api')",
            name="ck_consent_log_method",
        ),
    )

    def to_dict(self) -> dict:
        return {
            "consent_id": self.consent_id,
            "user_id": self.user_id,
            "version": self.version,
            "consent_at": self.consent_at.isoformat() if self.consent_at else None,
            "method": self.method,
        }
