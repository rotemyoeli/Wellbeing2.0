"""
TeamUpdate model — Spec v2 §8.1 team_updates table.

This is the closed-loop feedback feature ('what we did about it') that
research identifies as critical for sustained participation. NOT linked
to a specific check-in; managers post these in response to aggregate
trends visible on their dashboard.
"""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class TeamUpdate(db.Model, TimestampMixin):
    __tablename__ = "team_updates"

    update_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    author_id = db.Column(
        db.String(36),
        db.ForeignKey("users.user_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    department_id = db.Column(db.String(36), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    published_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    def to_dict(self) -> dict:
        return {
            "update_id": self.update_id,
            "author_id": self.author_id,
            "department_id": self.department_id,
            "content": self.content,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
