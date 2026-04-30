"""
CheckIn model — Spec v2 §8.1 checkins table.

The anonymity invariant is critical:
    - Identified check-in:  user_id IS NOT NULL, anon_token IS NULL
    - Anonymous check-in:   user_id IS NULL,     anon_token IS NOT NULL

This is enforced by:
    1. A CHECK constraint in the migration (Sprint 2).
    2. The CheckIn.create_identified() / create_anonymous() factory methods.

Do NOT instantiate CheckIn directly with both/neither populated.
"""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class CheckIn(db.Model, TimestampMixin):
    __tablename__ = "checkins"

    check_in_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)

    # Anonymity invariant: exactly one of these is populated.
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    anon_token = db.Column(db.String(128), nullable=True, index=True)

    # Core report data
    energy = db.Column(db.Integer, nullable=False)  # 0..100

    # Optional binary follow-ups (Spec v2 FR-03)
    support_q = db.Column(db.Boolean, nullable=True)   # "felt supported by manager?"
    workload_q = db.Column(db.Boolean, nullable=True)  # "overwhelmed with workload?"

    # Optional comment, encrypted at app layer (Sprint 4 activates).
    comment_ciphertext = db.Column(db.Text, nullable=True)

    # Anonymous "I need a conversation" flag — manager sees that someone in
    # the team needs support, without knowing who.
    needs_talk = db.Column(db.Boolean, nullable=True, default=False)

    # Department snapshot — captures the reporter's department at check-in time.
    # Used for safe aggregate reporting. Anonymous check-ins still carry this
    # so dashboards can scope by department without joining to users.
    department_id = db.Column(db.String(36), nullable=True, index=True)

    source = db.Column(db.String(40), nullable=False, default="web")
    shift_id = db.Column(
        db.String(36),
        db.ForeignKey("shifts.shift_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        db.CheckConstraint(
            "energy >= 0 AND energy <= 100",
            name="ck_checkins_energy_range",
        ),
        # Mode invariant. SQLite < 3.37 may ignore this; Postgres enforces it.
        db.CheckConstraint(
            "(user_id IS NOT NULL AND anon_token IS NULL) "
            "OR (user_id IS NULL AND anon_token IS NOT NULL)",
            name="ck_checkins_anonymity_invariant",
        ),
        db.Index("ix_checkins_created_at", "created_at"),
    )

    @property
    def is_anonymous(self) -> bool:
        return self.user_id is None

    def to_dict(self, include_anon_token: bool = False) -> dict:
        """
        Public representation.

        anon_token is excluded by default since it's a sensitive identifier
        (one-way hash, but still a stable per-day identifier). Include it
        only when intentional, never in manager-facing dashboards.
        """
        out = {
            "check_in_id": self.check_in_id,
            "energy": self.energy,
            "support_q": self.support_q,
            "workload_q": self.workload_q,
            "is_anonymous": self.is_anonymous,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if not self.is_anonymous:
            out["user_id"] = self.user_id
        if include_anon_token and self.is_anonymous:
            out["anon_token"] = self.anon_token
        return out

    def __repr__(self) -> str:
        mode = "anon" if self.is_anonymous else "id"
        return f"<CheckIn {self.check_in_id} energy={self.energy} mode={mode}>"
