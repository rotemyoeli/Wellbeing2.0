"""User model — Spec v2 §8.1 users table."""

from __future__ import annotations

from app.extensions import db
from app.models import TimestampMixin, gen_uuid


class User(db.Model, TimestampMixin):
    __tablename__ = "users"

    user_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    display_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(40), nullable=False, default="employee")
    department_id = db.Column(db.String(36), nullable=True, index=True)

    # PII — encrypted at app layer (Sprint 4 activates the encryption).
    contact_email = db.Column(db.String(255), nullable=True)
    contact_phone = db.Column(db.String(40), nullable=True)

    shift_group = db.Column(db.String(40), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    consent_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.Index("ix_users_role_dept", "role", "department_id"),
    )

    # Allowed role values. Enforce in service-layer; DB column is a string for
    # forward compatibility (avoid creating an enum type that's painful to alter).
    ROLES = (
        "employee",       # staff member (nurse / doctor / paramedic / etc.)
        "manager",        # ward manager
        "social_worker",  # social worker (limited alert access)
        "admin",          # full management
        "it_security",    # audit log access only
    )

    def to_dict(self) -> dict:
        """Safe public representation. Never returns contact info."""
        return {
            "user_id": self.user_id,
            "display_name": self.display_name,
            "role": self.role,
            "department_id": self.department_id,
            "is_active": self.is_active,
        }

    def __repr__(self) -> str:
        return f"<User {self.user_id} role={self.role}>"
