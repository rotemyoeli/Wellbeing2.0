"""
Tests for audit log writes.

Verifies that mutating endpoints record audit entries with the right
shape (no PII, hashed IPs, structured action names).
"""

from __future__ import annotations

import json

from app.extensions import db
from app.models.audit import AuditLog


def test_checkin_create_writes_audit(dev_mode_client, dev_mode_app):
    dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": 60, "anonMode": False}
    )
    with dev_mode_app.app_context():
        rows = (
            db.session.query(AuditLog)
            .filter_by(action="checkin.create")
            .all()
        )
        assert len(rows) == 1
        row = rows[0]
        assert row.entity_type == "checkin"
        assert row.entity_id is not None
        meta = json.loads(row.meta_json)
        assert meta["anon_mode"] is False
        assert meta["alert_created"] is False


def test_anonymous_checkin_audit_does_not_record_user_id(
    dev_mode_client, dev_mode_app
):
    """For anonymous mode, the audit entry has actor_id=NULL."""
    dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": 30, "anonMode": True}
    )
    with dev_mode_app.app_context():
        row = (
            db.session.query(AuditLog)
            .filter_by(action="checkin.create")
            .one()
        )
        assert row.actor_id is None
        meta = json.loads(row.meta_json)
        assert meta["anon_mode"] is True


def test_audit_ip_hash_is_set_when_present(dev_mode_client, dev_mode_app):
    """Without an X-Forwarded-For header, remote_addr is the test client default."""
    dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": 60, "anonMode": False}
    )
    with dev_mode_app.app_context():
        row = (
            db.session.query(AuditLog)
            .filter_by(action="checkin.create")
            .one()
        )
        # Test client always provides 127.0.0.1, which gets hashed
        assert row.ip_hash is not None
        assert len(row.ip_hash) == 64


def test_audit_writes_for_alerts(dev_mode_client, dev_mode_app):
    """A low-energy check-in produces an audit entry noting the alert."""
    dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": 10, "anonMode": False}
    )
    with dev_mode_app.app_context():
        row = (
            db.session.query(AuditLog)
            .filter_by(action="checkin.create")
            .one()
        )
        meta = json.loads(row.meta_json)
        assert meta["alert_created"] is True
        assert meta["alert_type"] == "low"


def test_otp_request_writes_audit(client, app):
    client.post(
        "/api/v1/auth/request-otp",
        json={"contact": "alice@example.com", "contactType": "email"},
    )
    with app.app_context():
        rows = (
            db.session.query(AuditLog)
            .filter_by(action="auth.otp.request")
            .all()
        )
        assert len(rows) == 1
        # actor_id is None — pre-authentication
        assert rows[0].actor_id is None
