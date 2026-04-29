"""Shift model — Spec v2 §8.1 shifts table."""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class Shift(db.Model, TimestampMixin):
    __tablename__ = "shifts"

    shift_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shift_type = db.Column(db.String(20), nullable=False)  # morning / evening / night
    start_at = db.Column(db.DateTime, nullable=False, index=True)
    end_at = db.Column(db.DateTime, nullable=False)

    __table_args__ = (
        db.CheckConstraint(
            "shift_type IN ('morning', 'evening', 'night')",
            name="ck_shifts_type",
        ),
        db.CheckConstraint(
            "end_at > start_at",
            name="ck_shifts_chronology",
        ),
    )

    def to_dict(self) -> dict:
        return {
            "shift_id": self.shift_id,
            "user_id": self.user_id,
            "shift_type": self.shift_type,
            "start_at": self.start_at.isoformat() if self.start_at else None,
            "end_at": self.end_at.isoformat() if self.end_at else None,
        }
