"""Tests for team updates endpoints (B5, C5, C7, C8 screens)."""

from __future__ import annotations

from app.extensions import db as _db
from app.middleware.dev_mode import DEV_MODE_USER_ID
from app.models.user import User


def _set_department(app):
    """Set department_id on the dev mode user so team updates can be scoped."""
    with app.app_context():
        user = _db.session.get(User, DEV_MODE_USER_ID)
        if user:
            user.department_id = "ward-b"
            _db.session.commit()


def test_create_team_update(dev_mode_client, dev_mode_app):
    """POST /team-updates should create a new update."""
    _set_department(dev_mode_app)
    resp = dev_mode_client.post(
        "/api/v1/team-updates/",
        json={
            "departmentId": "ward-b",
            "content": "We adjusted shift schedules based on your feedback.",
        },
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["department_id"] == "ward-b"
    assert data["published_at"] is not None


def test_create_update_too_short(dev_mode_client):
    """Content shorter than 10 chars should fail."""
    resp = dev_mode_client.post(
        "/api/v1/team-updates/",
        json={"departmentId": "ward-b", "content": "Short"},
    )
    assert resp.status_code == 400


def test_create_update_too_long(dev_mode_client):
    """Content longer than 500 chars should fail."""
    resp = dev_mode_client.post(
        "/api/v1/team-updates/",
        json={"departmentId": "ward-b", "content": "x" * 501},
    )
    assert resp.status_code == 400


def test_list_team_updates(dev_mode_client, dev_mode_app):
    """GET /team-updates should list updates for a department."""
    _set_department(dev_mode_app)
    dev_mode_client.post(
        "/api/v1/team-updates/",
        json={
            "departmentId": "ward-b",
            "content": "First update for the team members.",
        },
    )
    resp = dev_mode_client.get("/api/v1/team-updates/?departmentId=ward-b")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["total"] >= 1


def test_list_requires_department_id(dev_mode_client):
    """GET /team-updates without departmentId should fail."""
    resp = dev_mode_client.get("/api/v1/team-updates/")
    assert resp.status_code == 400


def test_edit_team_update(dev_mode_client, dev_mode_app):
    """PUT /team-updates/<id> should edit within 24h."""
    _set_department(dev_mode_app)
    create_resp = dev_mode_client.post(
        "/api/v1/team-updates/",
        json={
            "departmentId": "ward-b",
            "content": "Original content for the team update.",
        },
    )
    update_id = create_resp.get_json()["update_id"]

    resp = dev_mode_client.put(
        f"/api/v1/team-updates/{update_id}",
        json={"content": "Updated content for the team update."},
    )
    assert resp.status_code == 200
    assert resp.get_json()["content"] == "Updated content for the team update."


def test_delete_team_update(dev_mode_client, dev_mode_app):
    """DELETE /team-updates/<id> should soft-delete."""
    _set_department(dev_mode_app)
    create_resp = dev_mode_client.post(
        "/api/v1/team-updates/",
        json={
            "departmentId": "ward-b",
            "content": "Update to be deleted from the feed.",
        },
    )
    update_id = create_resp.get_json()["update_id"]

    resp = dev_mode_client.delete(f"/api/v1/team-updates/{update_id}")
    assert resp.status_code == 204

    # Should be gone from list
    resp = dev_mode_client.get(f"/api/v1/team-updates/{update_id}")
    assert resp.status_code == 404


def test_create_unpublished_update(dev_mode_client, dev_mode_app):
    """POST with publish=false should not set published_at."""
    _set_department(dev_mode_app)
    resp = dev_mode_client.post(
        "/api/v1/team-updates/",
        json={
            "departmentId": "ward-b",
            "content": "Draft update that should not be published yet.",
            "publish": False,
        },
    )
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["published_at"] is None
