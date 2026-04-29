"""Alert model — Spec v2 §8.1 alerts table + multi-step ack flow."""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class Alert(db.Model, TimestampMixin):
    __tablename__ = "alerts"

    alert_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    check_in_id = db.Column(
        db.String(36),
        db.ForeignKey("checkins.check_in_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # "low" (energy below ALERT_THRESHOLD_LOW) or "high" (above ALERT_THRESHOLD_HIGH)
    type = db.Column(db.String(10), nullable=False)

    # Multi-step status: open -> ack1 (seen) -> ack2 (contacted) -> closed
    status = db.Column(db.String(20), nullable=False, default="open", index=True)

    ack_by = db.Column(
        db.String(36),
        db.ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
    )
    ack_at = db.Column(db.DateTime, nullable=True)
    contacted_at = db.Column(db.DateTime, nullable=True)
    closed_at = db.Column(db.DateTime, nullable=True)
    closure_note = db.Column(db.Text, nullable=True)
    escalated_at = db.Column(db.DateTime, nullable=True)

    # Closed-loop tracking: links alert closure to a published team update.
    # If team_update_id is NULL after closure, the manager chose not to publish.
    team_update_id = db.Column(
        db.String(36),
        db.ForeignKey("team_updates.update_id", ondelete="SET NULL"),
        nullable=True,
    )
    closure_published = db.Column(db.Boolean, default=False, nullable=False)

    __table_args__ = (
        db.CheckConstraint(
            "type IN ('low', 'high')",
            name="ck_alerts_type",
        ),
        db.CheckConstraint(
            "status IN ('open', 'ack1', 'ack2', 'closed')",
            name="ck_alerts_status",
        ),
    )

    def to_dict(self) -> dict:
        return {
            "alert_id": self.alert_id,
            "check_in_id": self.check_in_id,
            "type": self.type,
            "status": self.status,
            "ack_by": self.ack_by,
            "ack_at": self.ack_at.isoformat() if self.ack_at else None,
            "contacted_at": self.contacted_at.isoformat() if self.contacted_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "closure_note": self.closure_note,
            "escalated_at": self.escalated_at.isoformat() if self.escalated_at else None,
            "team_update_id": self.team_update_id,
            "closure_published": self.closure_published,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
