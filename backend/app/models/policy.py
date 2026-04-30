"""
Policy model — runtime-editable system settings.

Stores key-value pairs for thresholds and policies that admins can
change from the UI instead of requiring env var changes + redeploy.
"""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class PolicySetting(db.Model, TimestampMixin):
    __tablename__ = "policy_settings"

    setting_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    key = db.Column(db.String(80), nullable=False, unique=True, index=True)
    value = db.Column(db.String(500), nullable=False)
    description = db.Column(db.String(300), nullable=True)
    updated_by = db.Column(db.String(36), nullable=True)

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "value": self.value,
            "description": self.description,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
