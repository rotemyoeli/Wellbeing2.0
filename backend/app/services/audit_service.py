"""
Audit logging service.

Spec v2 §6 FR-14 + Amendment 13 audit trail requirement: every
mutating action and every privileged read is logged with actor, action,
entity, timestamp, and hashed IP.

Usage:
    AuditService.write(
        actor_id=user["user_id"],
        action="checkin.create",
        entity_type="checkin",
        entity_id=check_in.check_in_id,
        meta={"anon_mode": True},
    )

Action naming convention: `<entity>.<verb>` — e.g.,
    user.create, user.update, user.delete,
    checkin.create, checkin.read.list,
    alert.ack.seen, alert.ack.contacted, alert.close,
    auth.otp.request, auth.otp.verify, auth.logout,
    consent.grant, consent.withdraw,
    admin.export.audit
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Optional

from flask import current_app, request

from app.extensions import db
from app.models.audit import AuditLog


class AuditService:
    @staticmethod
    def hash_ip(ip: Optional[str]) -> Optional[str]:
        """Hash an IP with the application salt. Never store raw IPs."""
        if not ip:
            return None
        salt = current_app.config.get("ANON_TOKEN_SALT", "")
        if not salt:
            # If we can't salt, refuse to store — better to drop than to
            # store an unsalted hash that can be rainbow-tabled.
            return None
        payload = f"{ip}|{salt}".encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    @staticmethod
    def _request_ip() -> Optional[str]:
        """Best-effort client IP — respects X-Forwarded-For if behind a proxy."""
        try:
            xff = request.headers.get("X-Forwarded-For")
            if xff:
                return xff.split(",")[0].strip()
            return request.remote_addr
        except RuntimeError:
            # Outside request context (e.g., background job)
            return None

    @classmethod
    def write(
        cls,
        *,
        actor_id: Optional[str],
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        meta: Optional[dict[str, Any]] = None,
        commit: bool = True,
    ) -> AuditLog:
        """
        Append an audit row.

        Args:
            actor_id:    The user performing the action. None for unauthenticated
                         events (e.g., a failed OTP verify before user identity
                         is established).
            action:      Dotted action name (e.g., "checkin.create").
            entity_type: The kind of entity being acted on.
            entity_id:   The ID of the specific entity (None for list-level actions).
            meta:        Arbitrary JSON-serialisable metadata. Do NOT include PII;
                         this column is retained for 7 years.
            commit:      Whether to commit immediately. False if the caller is
                         already inside a transaction.

        Returns:
            The persisted AuditLog row.
        """
        meta_json = json.dumps(meta, separators=(",", ":")) if meta else None

        entry = AuditLog(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            meta_json=meta_json,
            ip_hash=cls.hash_ip(cls._request_ip()),
        )
        db.session.add(entry)
        if commit:
            db.session.commit()
        return entry
