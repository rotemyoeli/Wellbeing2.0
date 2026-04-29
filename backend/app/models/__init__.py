"""
SQLAlchemy models for wellbeing-app.

All models follow Spec v2 §8 schema. Field names are snake_case (Python
convention) but semantics are unchanged from the spec's camelCase.

Anonymity model invariant:
    A check-in is anonymous when user_id IS NULL and anon_token IS NOT NULL.
    A check-in is identified when user_id IS NOT NULL and anon_token IS NULL.
    No check-in should have both fields populated. (Enforced by check constraint
    in the migration, Sprint 2.)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


def gen_uuid() -> str:
    """Generate a UUID4 string. Used as default for primary keys."""
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """
    Timezone-aware UTC now. Replaces the deprecated `datetime.utcnow()`.

    Note: the value is stripped of tzinfo before being written to SQLite
    (sqlite3 doesn't preserve tz). We tolerate this naive-on-disk style
    because every comparison goes through this function — both sides are
    UTC, just one is naive. PostgreSQL stores TIMESTAMP WITH TIME ZONE
    when the column type is set to TIMESTAMPTZ, but for our use we use
    plain TIMESTAMP, which strips tz on insert there too.

    Net: store naive UTC, compare against `utcnow().replace(tzinfo=None)`
    when reading back. To minimize foot-guns, we strip tzinfo here:
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


class TimestampMixin:
    """Adds created_at / updated_at columns. Inherit on entities that need them."""

    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )
