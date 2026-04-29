"""
Tests for the manager dashboard endpoint.

Critical privacy invariant: the per-role breakdown must NEVER reveal
energy averages for groups smaller than AGGREGATION_THRESHOLD (default 5).
This is the architectural enforcement of the wedge UVP.
"""

from __future__ import annotations

import pytest

from app.extensions import db
from app.models.checkin import CheckIn
from app.models.user import User


@pytest.fixture
def seed_users(dev_mode_app):
    """Insert 8 employees + 3 managers to provide a real population."""
    with dev_mode_app.app_context():
        users = []
        for i in range(8):
            users.append(
                User(
                    user_id=f"emp-{i:02d}",
                    display_name=f"Employee {i}",
                    role="employee",
                    is_active=True,
                )
            )
        for i in range(3):
            users.append(
                User(
                    user_id=f"mgr-{i:02d}",
                    display_name=f"Manager {i}",
                    role="manager",
                    is_active=True,
                )
            )
        db.session.add_all(users)
        db.session.commit()
        yield users


def _seed_checkins(app, count: int, role: str, energy: int = 60):
    """Seed `count` identified check-ins for users of the given role."""
    with app.app_context():
        users = (
            db.session.query(User)
            .filter(User.role == role, User.is_active.is_(True))
            .limit(count)
            .all()
        )
        assert len(users) >= count, f"need at least {count} {role} users seeded"
        for u in users[:count]:
            db.session.add(
                CheckIn(
                    user_id=u.user_id,
                    energy=energy,
                    source="web",
                )
            )
        db.session.commit()


# ---------------------- Empty / minimal cases ---------------------- #

def test_summary_empty_db_returns_zero(dev_mode_client):
    response = dev_mode_client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    body = response.get_json()
    assert body["total_checkins"] == 0
    assert body["avg_energy"] is None
    assert body["median_energy"] is None
    assert body["role_breakdown"] == []


def test_summary_returns_aggregation_threshold(dev_mode_client):
    response = dev_mode_client.get("/api/v1/dashboard/summary")
    body = response.get_json()
    assert body["aggregation_threshold"] == 5


# ---------------------- ≥5 threshold rule ---------------------- #

def test_role_with_4_checkins_is_below_threshold(dev_mode_app, dev_mode_client, seed_users):
    """4 employee check-ins → role row exists but avg is null + below_threshold=True."""
    _seed_checkins(dev_mode_app, count=4, role="employee", energy=70)
    response = dev_mode_client.get("/api/v1/dashboard/summary")
    body = response.get_json()
    employee_row = next(
        (r for r in body["role_breakdown"] if r["role"] == "employee"), None
    )
    assert employee_row is not None
    assert employee_row["count"] == 4
    assert employee_row["below_threshold"] is True
    assert employee_row["avg"] is None  # CRITICAL: no avg leakage


def test_role_with_5_checkins_is_at_threshold(dev_mode_app, dev_mode_client, seed_users):
    """Exactly 5 → at threshold, avg is exposed."""
    _seed_checkins(dev_mode_app, count=5, role="employee", energy=70)
    response = dev_mode_client.get("/api/v1/dashboard/summary")
    body = response.get_json()
    employee_row = next(
        (r for r in body["role_breakdown"] if r["role"] == "employee"), None
    )
    assert employee_row["count"] == 5
    assert employee_row["below_threshold"] is False
    assert employee_row["avg"] == 70.0


def test_anonymous_checkins_grouped_separately(
    dev_mode_app, dev_mode_client, seed_users
):
    """Anonymous check-ins go into their own 'anonymous' group with the same threshold rule."""
    # Need a real user to derive the anon_token from
    with dev_mode_app.app_context():
        for i in range(6):
            user = (
                db.session.query(User).filter(User.role == "employee").offset(i).first()
            )
            # Direct insert with an anon_token (bypassing the service for test isolation)
            from app.utils.anon_token import generate_anon_token
            from app.models import utcnow
            from datetime import timedelta

            token = generate_anon_token(
                user.user_id,
                (utcnow() + timedelta(seconds=i)).date(),  # vary the date so tokens differ
                dev_mode_app.config["ANON_TOKEN_SALT"],
            )
            db.session.add(
                CheckIn(
                    user_id=None,
                    anon_token=token,
                    energy=50,
                    source="web",
                )
            )
        db.session.commit()

    response = dev_mode_client.get("/api/v1/dashboard/summary")
    body = response.get_json()
    anon_row = next(
        (r for r in body["role_breakdown"] if r["role"] == "anonymous"), None
    )
    assert anon_row is not None
    assert anon_row["count"] == 6
    assert anon_row["below_threshold"] is False
    assert anon_row["avg"] == 50.0


# ---------------------- Totals / period ---------------------- #

def test_summary_counts_all_checkins(dev_mode_app, dev_mode_client, seed_users):
    _seed_checkins(dev_mode_app, count=5, role="employee", energy=60)
    _seed_checkins(dev_mode_app, count=3, role="manager", energy=80)
    response = dev_mode_client.get("/api/v1/dashboard/summary")
    body = response.get_json()
    assert body["total_checkins"] == 8


def test_summary_avg_and_median(dev_mode_app, dev_mode_client, seed_users):
    _seed_checkins(dev_mode_app, count=5, role="employee", energy=50)
    response = dev_mode_client.get("/api/v1/dashboard/summary")
    body = response.get_json()
    assert body["avg_energy"] == 50.0
    assert body["median_energy"] == 50.0


def test_summary_period_param(dev_mode_app, dev_mode_client):
    response = dev_mode_client.get("/api/v1/dashboard/summary?period=30")
    assert response.status_code == 200
    assert response.get_json()["period_days"] == 30


def test_summary_period_caps_at_90(dev_mode_app, dev_mode_client):
    response = dev_mode_client.get("/api/v1/dashboard/summary?period=9999")
    assert response.get_json()["period_days"] == 90


# ---------------------- Authorization ---------------------- #

def test_summary_requires_manager_role_when_no_dev_mode(client):
    """Without DEV_MODE and no auth token → 401."""
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 401


def test_employee_role_forbidden_from_dashboard(client, app):
    """Real employee logged in → 403."""
    from app.services.auth_service import AuthService

    # Issue an OTP and capture the code
    captured = {}
    real = AuthService._deliver_code

    def cap(c, ct, code):
        captured["code"] = code

    with app.app_context():
        AuthService._deliver_code = staticmethod(cap)  # type: ignore
        try:
            AuthService.request_otp(contact="emp@example.com", contact_type="email")
        finally:
            AuthService._deliver_code = real  # type: ignore

    verify = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "emp@example.com", "code": captured["code"]},
    )
    token = verify.get_json()["accessToken"]

    response = client.get(
        "/api/v1/dashboard/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
