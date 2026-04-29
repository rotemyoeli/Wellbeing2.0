"""
Audit log model — Spec v2 §8.1 audit table.

Append-only. Retention 7 years per Spec v2 §8 (subject to Q8 final policy).
IPs are hashed before storage (never store raw IPs — Amendment 13 considers
them personal data).
"""

from __future__ import annotations

from app.extensions import db
from app.models import gen_uuid, utcnow


class AuditLog(db.Model):
    __tablename__ = "audit"

    audit_id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    actor_id = db.Column(db.String(36), nullable=True, index=True)
    action = db.Column(db.String(80), nullable=False, index=True)
    entity_type = db.Column(db.String(40), nullable=False)
    entity_id = db.Column(db.String(36), nullable=True)
    meta_json = db.Column(db.Text, nullable=True)  # JSON-encoded metadata
    ip_hash = db.Column(db.String(64), nullable=True)  # SHA-256 of IP+salt
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)

    def to_dict(self) -> dict:
        return {
            "audit_id": self.audit_id,
            "actor_id": self.actor_id,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "meta": self.meta_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
