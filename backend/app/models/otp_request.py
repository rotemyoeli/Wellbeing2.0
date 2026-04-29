"""
OtpRequest model.

Tracks every OTP issued: contact (email or phone), code hash, expiry,
attempt count, consumed flag. Retained for 30 days for audit / rate-limit
analysis, then purged.
"""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class OtpRequest(db.Model, TimestampMixin):
    __tablename__ = "otp_requests"

    request_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    contact = db.Column(db.String(255), nullable=False, index=True)
    contact_type = db.Column(db.String(20), nullable=False)  # 'email' | 'phone'
    code_hash = db.Column(db.String(64), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    consumed_at = db.Column(db.DateTime, nullable=True)
    ip_hash = db.Column(db.String(64), nullable=True)

    __table_args__ = (
        db.CheckConstraint(
            "contact_type IN ('email', 'phone')",
            name="ck_otp_requests_contact_type",
        ),
        db.Index("ix_otp_requests_contact_created", "contact", "created_at"),
    )

    @property
    def is_consumed(self) -> bool:
        return self.consumed_at is not None
