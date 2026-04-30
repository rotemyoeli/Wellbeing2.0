"""
UpdateReaction — anonymous employee feedback on team updates.

"Did you feel the change?" → felt_it (true) or not_yet (false).
Stored with anon_token so one user = one reaction per update per day.
Manager sees only aggregate counts.
"""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class UpdateReaction(db.Model, TimestampMixin):
    __tablename__ = "update_reactions"

    reaction_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    update_id = db.Column(
        db.String(36),
        db.ForeignKey("team_updates.update_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Anonymous: hash of user to prevent duplicates, never reveals identity
    anon_hash = db.Column(db.String(128), nullable=False)
    felt_it = db.Column(db.Boolean, nullable=False)  # True = felt change, False = not yet

    __table_args__ = (
        db.UniqueConstraint("update_id", "anon_hash", name="uq_reaction_per_user"),
    )

    def to_dict(self) -> dict:
        return {
            "reaction_id": self.reaction_id,
            "update_id": self.update_id,
            "felt_it": self.felt_it,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
