"""Tests for user profile endpoints (A2 screen)."""

from __future__ import annotations


def test_get_profile(dev_mode_client):
    """GET /users/me should return the current user."""
    resp = dev_mode_client.get("/api/v1/users/me")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "user" in data
    assert "user_id" in data["user"]


def test_update_display_name(dev_mode_client):
    """PATCH /users/me should update display name."""
    resp = dev_mode_client.patch(
        "/api/v1/users/me",
        json={"displayName": "New Name"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["user"]["display_name"] == "New Name"


def test_update_role(dev_mode_client):
    """PATCH /users/me should update role."""
    resp = dev_mode_client.patch(
        "/api/v1/users/me",
        json={"role": "manager"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["user"]["role"] == "manager"


def test_update_department(dev_mode_client):
    """PATCH /users/me should update department."""
    resp = dev_mode_client.patch(
        "/api/v1/users/me",
        json={"departmentId": "ward-b"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["user"]["department_id"] == "ward-b"


def test_update_invalid_role(dev_mode_client):
    """Invalid role should return 400."""
    resp = dev_mode_client.patch(
        "/api/v1/users/me",
        json={"role": "ceo"},
    )
    assert resp.status_code == 400


def test_update_short_name(dev_mode_client):
    """Name shorter than 3 chars should return 400."""
    resp = dev_mode_client.patch(
        "/api/v1/users/me",
        json={"displayName": "ab"},
    )
    assert resp.status_code == 400


def test_update_empty_body(dev_mode_client):
    """Empty update body should return 400."""
    resp = dev_mode_client.patch(
        "/api/v1/users/me",
        json={},
    )
    assert resp.status_code == 400


def test_profile_requires_auth(client):
    """Profile endpoints require authentication."""
    resp = client.get("/api/v1/users/me")
    assert resp.status_code == 401
    resp = client.patch("/api/v1/users/me", json={"displayName": "Test"})
    assert resp.status_code == 401
