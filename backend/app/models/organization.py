"""
Organization model — stores hospital/org info + departments.

Phase 7: Admin settings.
"""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class Organization(db.Model, TimestampMixin):
    __tablename__ = "organizations"

    org_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(200), nullable=False)
    logo_url = db.Column(db.String(500), nullable=True)
    address = db.Column(db.String(300), nullable=True)
    phone = db.Column(db.String(40), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    timezone = db.Column(db.String(60), nullable=True, default="Asia/Jerusalem")
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    def to_dict(self) -> dict:
        return {
            "org_id": self.org_id,
            "name": self.name,
            "logo_url": self.logo_url,
            "address": self.address,
            "phone": self.phone,
            "email": self.email,
            "timezone": self.timezone,
            "is_active": self.is_active,
        }


class Department(db.Model, TimestampMixin):
    __tablename__ = "departments"

    dept_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    org_id = db.Column(
        db.String(36),
        db.ForeignKey("organizations.org_id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(60), nullable=False, unique=True, index=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    def to_dict(self) -> dict:
        return {
            "dept_id": self.dept_id,
            "org_id": self.org_id,
            "name": self.name,
            "slug": self.slug,
            "is_active": self.is_active,
        }
