"""
Tests for demo login endpoint and seed data access patterns.

Phase 6X: Validates that the demo access system works end-to-end.
"""

from __future__ import annotations

import pytest

from app.extensions import db
from app.models.user import User
from app.models.checkin import CheckIn
from app.models.alert import Alert
from app.models.team_update import TeamUpdate
from app.models.consent_log import ConsentLog


@pytest.fixture
def seeded_app(dev_mode_app):
    """Create a minimal set of demo users for testing."""
    with dev_mode_app.app_context():
        from app.models import utcnow
        now = utcnow()

        # Seed users first (FK target)
        for u_data in [
            {"user_id": "demo-superadmin", "display_name": "Demo Admin", "role": "admin", "department_id": None, "contact_email": "superadmin@demo.local"},
            {"user_id": "demo-mgr-test", "display_name": "Demo Manager", "role": "manager", "department_id": "dept-test", "contact_email": "manager.test@demo.local"},
            {"user_id": "demo-emp-test", "display_name": "Demo Employee", "role": "employee", "department_id": "dept-test", "contact_email": "emp.test@demo.local"},
        ]:
            db.session.add(User(is_active=True, consent_at=now, **u_data))
        db.session.commit()

        # Grant consent (users must exist first for FK)
        for uid in ["demo-superadmin", "demo-mgr-test", "demo-emp-test"]:
            db.session.add(ConsentLog(user_id=uid, version="1.0", consent_at=now, method="import"))
        db.session.commit()
        yield dev_mode_app


# ─── Demo login endpoint ─────────────────────────────────────────────────

def test_demo_login_returns_jwt_for_valid_user(seeded_app):
    """Demo login returns real JWT tokens for seeded demo users."""
    client = seeded_app.test_client()
    response = client.post("/api/v1/auth/demo-login",
        json={"userId": "demo-superadmin"})
    assert response.status_code == 200
    body = response.get_json()
    assert "accessToken" in body
    assert "refreshToken" in body
    assert body["user"]["user_id"] == "demo-superadmin"
    assert body["user"]["role"] == "admin"


def test_demo_login_by_email(seeded_app):
    """Demo login works with email parameter."""
    client = seeded_app.test_client()
    response = client.post("/api/v1/auth/demo-login",
        json={"email": "manager.test@demo.local"})
    assert response.status_code == 200
    body = response.get_json()
    assert body["user"]["user_id"] == "demo-mgr-test"
    assert body["user"]["department_id"] == "dept-test"


def test_demo_login_returns_department_id(seeded_app):
    """Demo login response includes department_id for scoping."""
    client = seeded_app.test_client()
    response = client.post("/api/v1/auth/demo-login",
        json={"userId": "demo-mgr-test"})
    body = response.get_json()
    assert body["user"]["department_id"] == "dept-test"


def test_demo_login_rejects_unknown_user(seeded_app):
    """Demo login returns 404 for non-existent user."""
    client = seeded_app.test_client()
    response = client.post("/api/v1/auth/demo-login",
        json={"userId": "nonexistent"})
    assert response.status_code == 404


def test_demo_login_disabled_when_dev_mode_off(app):
    """Demo login returns 403 when both DEV_MODE and DEMO_MODE are off."""
    client = app.test_client()
    response = client.post("/api/v1/auth/demo-login",
        json={"userId": "demo-superadmin"})
    assert response.status_code == 403


def test_demo_login_works_with_demo_mode(seeded_app):
    """Demo login works when DEMO_MODE is enabled (even without full DEV_MODE)."""
    # Override: disable DEV_MODE but enable DEMO_MODE
    seeded_app.config["DEV_MODE_ENABLED"] = False
    seeded_app.config["DEMO_MODE_ENABLED"] = True
    client = seeded_app.test_client()
    response = client.post("/api/v1/auth/demo-login",
        json={"userId": "demo-superadmin"})
    assert response.status_code == 200
    body = response.get_json()
    assert "accessToken" in body
    assert body["user"]["user_id"] == "demo-superadmin"


def test_demo_login_jwt_works_for_api_calls(seeded_app):
    """JWT from demo login can be used to call authenticated endpoints."""
    client = seeded_app.test_client()
    # Get JWT
    login_resp = client.post("/api/v1/auth/demo-login",
        json={"userId": "demo-superadmin"})
    token = login_resp.get_json()["accessToken"]

    # Use JWT to call /auth/me
    me_resp = client.get("/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.get_json()["user"]["user_id"] == "demo-superadmin"


def test_demo_login_jwt_can_submit_checkin(seeded_app):
    """JWT from demo login can submit check-ins."""
    client = seeded_app.test_client()
    # Login as employee
    login_resp = client.post("/api/v1/auth/demo-login",
        json={"userId": "demo-emp-test"})
    token = login_resp.get_json()["accessToken"]

    # Submit check-in
    ci_resp = client.post("/api/v1/checkins/",
        headers={"Authorization": f"Bearer {token}"},
        json={"energy": 65, "anonMode": False})
    assert ci_resp.status_code == 201
    body = ci_resp.get_json()
    assert "checkInId" in body


def test_demo_login_jwt_manager_can_access_dashboard(seeded_app):
    """JWT from demo login allows manager to access dashboard."""
    client = seeded_app.test_client()
    login_resp = client.post("/api/v1/auth/demo-login",
        json={"userId": "demo-mgr-test"})
    token = login_resp.get_json()["accessToken"]

    dash_resp = client.get("/api/v1/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"})
    assert dash_resp.status_code == 200
    body = dash_resp.get_json()
    assert "total_checkins" in body


def test_auth_me_includes_department_id(seeded_app):
    """/auth/me response includes department_id from DB."""
    client = seeded_app.test_client()
    login_resp = client.post("/api/v1/auth/demo-login",
        json={"userId": "demo-mgr-test"})
    token = login_resp.get_json()["accessToken"]

    me_resp = client.get("/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    body = me_resp.get_json()
    assert body["user"]["department_id"] == "dept-test"
