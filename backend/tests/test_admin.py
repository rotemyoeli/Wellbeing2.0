"""Tests for admin API endpoints."""

from __future__ import annotations

import pytest

from app.extensions import db
from app.models.organization import Department, Organization
from app.models.user import User
from app.models import utcnow


@pytest.fixture
def admin_client(dev_mode_app):
    """Admin client with seeded admin user."""
    with dev_mode_app.app_context():
        # The dev_mode_app already has a DEV_MODE admin seeded
        yield dev_mode_app.test_client()


# ─── Organization ───

def test_get_organization_empty(admin_client):
    r = admin_client.get("/api/v1/admin/organization")
    assert r.status_code == 200
    assert r.get_json()["organization"] is None


def test_create_and_get_organization(admin_client):
    r = admin_client.put("/api/v1/admin/organization",
        json={"name": "Test Hospital", "phone": "03-1234567"})
    assert r.status_code == 200
    org = r.get_json()["organization"]
    assert org["name"] == "Test Hospital"

    r2 = admin_client.get("/api/v1/admin/organization")
    assert r2.get_json()["organization"]["name"] == "Test Hospital"


# ─── Departments ───

def test_create_department(admin_client):
    r = admin_client.post("/api/v1/admin/departments",
        json={"name": "Internal Med A", "slug": "internal-a"})
    assert r.status_code == 201
    assert r.get_json()["slug"] == "internal-a"


def test_duplicate_department_slug(admin_client):
    admin_client.post("/api/v1/admin/departments",
        json={"name": "Dept 1", "slug": "dup-slug"})
    r = admin_client.post("/api/v1/admin/departments",
        json={"name": "Dept 2", "slug": "dup-slug"})
    assert r.status_code == 409


def test_list_departments(admin_client):
    admin_client.post("/api/v1/admin/departments", json={"name": "A", "slug": "a"})
    admin_client.post("/api/v1/admin/departments", json={"name": "B", "slug": "b"})
    r = admin_client.get("/api/v1/admin/departments")
    assert r.status_code == 200
    assert r.get_json()["total"] >= 2


def test_update_department(admin_client):
    r = admin_client.post("/api/v1/admin/departments", json={"name": "Old", "slug": "upd"})
    dept_id = r.get_json()["dept_id"]
    r2 = admin_client.patch(f"/api/v1/admin/departments/{dept_id}",
        json={"name": "New Name"})
    assert r2.status_code == 200
    assert r2.get_json()["name"] == "New Name"


# ─── User Management ───

def test_list_users(admin_client, dev_mode_app):
    with dev_mode_app.app_context():
        db.session.add(User(user_id="test-u1", display_name="User One", role="employee", is_active=True))
        db.session.commit()
    r = admin_client.get("/api/v1/admin/users")
    assert r.status_code == 200
    assert r.get_json()["total"] >= 1


def test_create_user(admin_client):
    r = admin_client.post("/api/v1/admin/users",
        json={"displayName": "New Nurse", "email": "nurse@test.local", "role": "employee"})
    assert r.status_code == 201
    assert r.get_json()["user"]["display_name"] == "New Nurse"


def test_update_user_role(admin_client, dev_mode_app):
    with dev_mode_app.app_context():
        db.session.add(User(user_id="role-test", display_name="Role Test", role="employee", is_active=True))
        db.session.commit()
    r = admin_client.patch("/api/v1/admin/users/role-test",
        json={"role": "manager", "departmentId": "dept-x"})
    assert r.status_code == 200
    assert r.get_json()["user"]["role"] == "manager"


def test_deactivate_user(admin_client, dev_mode_app):
    with dev_mode_app.app_context():
        db.session.add(User(user_id="deact-test", display_name="Deact", role="employee", is_active=True))
        db.session.commit()
    r = admin_client.patch("/api/v1/admin/users/deact-test", json={"isActive": False})
    assert r.status_code == 200
    assert r.get_json()["user"]["is_active"] is False


# ─── Policies ───

def test_get_default_policies(admin_client):
    r = admin_client.get("/api/v1/admin/policies")
    assert r.status_code == 200
    policies = r.get_json()["policies"]
    keys = [p["key"] for p in policies]
    assert "alert_threshold_low" in keys
    assert "aggregation_threshold" in keys


def test_update_policy(admin_client):
    r = admin_client.put("/api/v1/admin/policies",
        json={"policies": {"alert_threshold_low": "20"}})
    assert r.status_code == 200
    policies = r.get_json()["policies"]
    low = next(p for p in policies if p["key"] == "alert_threshold_low")
    assert low["value"] == "20"


# ─── Stats ───

def test_system_stats(admin_client):
    r = admin_client.get("/api/v1/admin/stats")
    assert r.status_code == 200
    body = r.get_json()
    assert "total_users" in body
    assert "total_checkins" in body
    assert "open_alerts" in body


# ─── Audit Log ───

def test_audit_log(admin_client):
    # Trigger an action
    admin_client.put("/api/v1/admin/organization", json={"name": "Audit Test"})
    r = admin_client.get("/api/v1/admin/audit-log")
    assert r.status_code == 200
    assert len(r.get_json()["items"]) > 0


# ─── System Info ───

def test_system_info(admin_client):
    r = admin_client.get("/api/v1/admin/system-info")
    assert r.status_code == 200
    body = r.get_json()
    assert "version" in body
    assert "consent_version" in body


# ─── Export ───

def test_export_users_csv(admin_client):
    r = admin_client.get("/api/v1/admin/export/users")
    assert r.status_code == 200
    assert "text/csv" in r.content_type
    assert b"user_id" in r.data


def test_export_invalid_type(admin_client):
    r = admin_client.get("/api/v1/admin/export/invalid")
    assert r.status_code == 400


# ─── Auth guard ───

def test_admin_endpoints_require_admin_role(app):
    """Non-admin cannot access admin endpoints."""
    client = app.test_client()
    r = client.get("/api/v1/admin/organization")
    assert r.status_code == 401
