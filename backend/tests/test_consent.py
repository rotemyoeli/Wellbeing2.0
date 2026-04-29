"""Tests for consent endpoints (A3 screen)."""

from __future__ import annotations

from app.models.consent_log import ConsentLog
from app.models.user import User
from app.extensions import db as _db


def test_consent_status_no_consent(dev_mode_client):
    """New user should not have consent."""
    resp = dev_mode_client.get("/api/v1/consent/status")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["hasConsent"] is False
    assert data["currentVersion"] is not None


def test_accept_consent(dev_mode_client):
    """Accepting consent should create a consent record."""
    resp = dev_mode_client.post("/api/v1/consent/accept")
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["status"] == "accepted"
    assert data["consentId"] is not None


def test_accept_consent_idempotent(dev_mode_client):
    """Accepting consent twice should return already_accepted."""
    dev_mode_client.post("/api/v1/consent/accept")
    resp = dev_mode_client.post("/api/v1/consent/accept")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "already_accepted"


def test_consent_status_after_accept(dev_mode_client):
    """After accepting, status should show hasConsent=True."""
    dev_mode_client.post("/api/v1/consent/accept")
    resp = dev_mode_client.get("/api/v1/consent/status")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["hasConsent"] is True


def test_consent_requires_auth(client):
    """Consent endpoints require authentication."""
    resp = client.get("/api/v1/consent/status")
    assert resp.status_code == 401
    resp = client.post("/api/v1/consent/accept")
    assert resp.status_code == 401
