"""
Notification model — Spec v2 §8.1 notifications table.

Tracks deliverability across channels. Deleted after 90 days per Spec v2 §8.
"""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class Notification(db.Model, TimestampMixin):
    __tablename__ = "notifications"

    notif_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel = db.Column(db.String(20), nullable=False)   # sms / email / wa / push
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    template_id = db.Column(db.String(80), nullable=True)
    error_detail = db.Column(db.String(500), nullable=True)

    __table_args__ = (
        db.CheckConstraint(
            "channel IN ('sms', 'email', 'wa', 'push')",
            name="ck_notifications_channel",
        ),
        db.CheckConstraint(
            "status IN ('pending', 'sent', 'delivered', 'failed')",
            name="ck_notifications_status",
        ),
    )

    def to_dict(self) -> dict:
        return {
            "notif_id": self.notif_id,
            "user_id": self.user_id,
            "channel": self.channel,
            "status": self.status,
            "template_id": self.template_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
