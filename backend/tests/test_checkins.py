"""
End-to-end tests for the check-in API.

Covers:
    - identified-mode submission
    - anonymous-mode submission (verifies user_id NULL, anon_token populated)
    - validation errors (out-of-range energy, oversize comment)
    - alert auto-generation on threshold breach
    - GET /me returns identified check-ins only

DEV_MODE is on for these tests so we can hit the endpoint without a JWT.
The synthetic DEV_MODE user is the actor.
"""

from __future__ import annotations

from app.extensions import db
from app.models.alert import Alert
from app.models.checkin import CheckIn


# -------------------- POST /api/v1/checkins -------------------- #

def test_post_identified_checkin_returns_201(dev_mode_client):
    response = dev_mode_client.post(
        "/api/v1/checkins/",
        json={"energy": 75, "anonMode": False},
    )
    assert response.status_code == 201, response.get_json()
    body = response.get_json()
    assert "checkInId" in body
    assert body["checkInId"]
    assert body.get("alertCreated") is None  # 75 is mid-range, no alert


def test_post_identified_persists_user_id(dev_mode_client, dev_mode_app):
    response = dev_mode_client.post(
        "/api/v1/checkins/",
        json={"energy": 60, "anonMode": False},
    )
    assert response.status_code == 201
    with dev_mode_app.app_context():
        rows = db.session.query(CheckIn).all()
        assert len(rows) == 1
        row = rows[0]
        # DEV_MODE user_id is the synthetic admin
        assert row.user_id == "00000000-0000-0000-0000-000000000000"
        assert row.anon_token is None
        assert row.energy == 60


def test_post_anonymous_persists_anon_token_only(dev_mode_client, dev_mode_app):
    response = dev_mode_client.post(
        "/api/v1/checkins/",
        json={"energy": 40, "anonMode": True},
    )
    assert response.status_code == 201
    with dev_mode_app.app_context():
        row = db.session.query(CheckIn).one()
        # Anonymity invariant: identified field is NULL, hash is set.
        assert row.user_id is None
        assert row.anon_token is not None
        assert len(row.anon_token) == 64  # BLAKE2b 32-byte digest hex


def test_post_anonymous_with_same_user_same_day_yields_same_token(
    dev_mode_client, dev_mode_app
):
    """The duplicate-prevention property of anon_token."""
    r1 = dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": 30, "anonMode": True}
    )
    r2 = dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": 50, "anonMode": True}
    )
    assert r1.status_code == 201 and r2.status_code == 201
    with dev_mode_app.app_context():
        rows = db.session.query(CheckIn).order_by(CheckIn.created_at).all()
        assert len(rows) == 2
        assert rows[0].anon_token == rows[1].anon_token, (
            "same user + same day should produce the same anon_token "
            "(this is the duplicate-prevention property)"
        )


# -------------------- Validation -------------------- #

def test_post_rejects_out_of_range_energy(dev_mode_client):
    response = dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": 150, "anonMode": False}
    )
    assert response.status_code == 400
    body = response.get_json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_post_rejects_negative_energy(dev_mode_client):
    response = dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": -5, "anonMode": False}
    )
    assert response.status_code == 400


def test_post_rejects_non_integer_energy(dev_mode_client):
    response = dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": "high", "anonMode": False}
    )
    assert response.status_code == 400


def test_post_rejects_oversize_comment(dev_mode_client):
    response = dev_mode_client.post(
        "/api/v1/checkins/",
        json={"energy": 50, "anonMode": False, "comment": "x" * 301},
    )
    assert response.status_code == 400


# -------------------- Alert auto-generation -------------------- #

def test_low_energy_triggers_low_alert(dev_mode_client, dev_mode_app):
    response = dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": 10, "anonMode": False}
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body.get("alertCreated") is True
    assert body.get("alertType") == "low"

    with dev_mode_app.app_context():
        alerts = db.session.query(Alert).all()
        assert len(alerts) == 1
        assert alerts[0].type == "low"
        assert alerts[0].status == "open"


def test_high_energy_triggers_high_alert(dev_mode_client, dev_mode_app):
    response = dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": 95, "anonMode": False}
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body.get("alertCreated") is True
    assert body.get("alertType") == "high"


def test_threshold_boundary_no_alert(dev_mode_client, dev_mode_app):
    """Exactly 25 and 85 should NOT trigger (the spec uses < and >, not <= and >=)."""
    for energy in (25, 85):
        response = dev_mode_client.post(
            "/api/v1/checkins/", json={"energy": energy, "anonMode": False}
        )
        assert response.status_code == 201
        body = response.get_json()
        assert body.get("alertCreated") is None, f"energy={energy} should not alert"


# -------------------- GET /me -------------------- #

def test_get_me_returns_only_identified_checkins(dev_mode_client, dev_mode_app):
    # Submit one identified, one anonymous
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 60, "anonMode": False})
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 40, "anonMode": True})

    response = dev_mode_client.get("/api/v1/checkins/me")
    assert response.status_code == 200
    body = response.get_json()
    # Only the identified one belongs to this user
    assert body["total"] == 1
    assert body["items"][0]["energy"] == 60
    assert body["items"][0]["is_anonymous"] is False


# -------------------- Auth -------------------- #

def test_post_without_auth_returns_401(client):
    """Without DEV_MODE and without JWT, the endpoint refuses."""
    response = client.post("/api/v1/checkins/", json={"energy": 50, "anonMode": False})
    assert response.status_code == 401
    body = response.get_json()
    assert body["error"]["code"] == "UNAUTHORIZED"
