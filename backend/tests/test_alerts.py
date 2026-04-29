"""
Tests for the alert listing + acknowledgment workflow.

State machine: open → ack1 → ack2 → closed.
Out-of-order transitions are 400. Step 3 requires a note.
"""

from __future__ import annotations

from app.extensions import db
from app.models.alert import Alert


# ---------------------- Helpers ---------------------- #

def _make_alert(dev_mode_client, energy: int = 10) -> str:
    """Trigger a check-in below threshold to generate an alert. Returns alert_id."""
    response = dev_mode_client.post(
        "/api/v1/checkins/", json={"energy": energy, "anonMode": False}
    )
    assert response.status_code == 201
    return response.get_json().get("alertCreated") and _latest_alert_id(dev_mode_client)


def _latest_alert_id(dev_mode_client) -> str:
    response = dev_mode_client.get("/api/v1/alerts/")
    return response.get_json()["items"][0]["alert_id"]


# ---------------------- GET /alerts ---------------------- #

def test_list_alerts_empty(dev_mode_client):
    response = dev_mode_client.get("/api/v1/alerts/")
    assert response.status_code == 200
    body = response.get_json()
    assert body["total"] == 0
    assert body["items"] == []


def test_list_alerts_returns_recently_created(dev_mode_client):
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 10, "anonMode": False})
    response = dev_mode_client.get("/api/v1/alerts/")
    body = response.get_json()
    assert body["total"] == 1
    assert body["items"][0]["type"] == "low"
    assert body["items"][0]["status"] == "open"


def test_list_alerts_filter_by_status(dev_mode_client):
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 10, "anonMode": False})
    response = dev_mode_client.get("/api/v1/alerts/?status=closed")
    assert response.get_json()["total"] == 0
    response = dev_mode_client.get("/api/v1/alerts/?status=open")
    assert response.get_json()["total"] == 1


def test_list_alerts_rejects_invalid_status(dev_mode_client):
    response = dev_mode_client.get("/api/v1/alerts/?status=banana")
    assert response.status_code == 400


# ---------------------- POST /alerts/:id/ack ---------------------- #

def test_ack_step1_open_to_ack1(dev_mode_client):
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 10, "anonMode": False})
    alert_id = _latest_alert_id(dev_mode_client)
    response = dev_mode_client.post(
        f"/api/v1/alerts/{alert_id}/ack",
        json={"step": 1},
    )
    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert body["status"] == "ack1"
    assert body["ack_at"] is not None
    assert body["ack_by"] == "00000000-0000-0000-0000-000000000000"


def test_ack_full_flow(dev_mode_client, dev_mode_app):
    """open → ack1 → ack2 → closed (with note)."""
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 10, "anonMode": False})
    alert_id = _latest_alert_id(dev_mode_client)

    r1 = dev_mode_client.post(f"/api/v1/alerts/{alert_id}/ack", json={"step": 1})
    assert r1.get_json()["status"] == "ack1"

    r2 = dev_mode_client.post(f"/api/v1/alerts/{alert_id}/ack", json={"step": 2})
    assert r2.get_json()["status"] == "ack2"
    assert r2.get_json()["contacted_at"] is not None

    r3 = dev_mode_client.post(
        f"/api/v1/alerts/{alert_id}/ack",
        json={"step": 3, "note": "Spoke with the employee, scheduled a follow-up next week."},
    )
    body = r3.get_json()
    assert body["status"] == "closed"
    assert body["closed_at"] is not None

    # Verify the note was stored
    with dev_mode_app.app_context():
        alert = db.session.get(Alert, alert_id)
        assert alert.closure_note == "Spoke with the employee, scheduled a follow-up next week."


def test_ack_step3_without_note_returns_400(dev_mode_client):
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 10, "anonMode": False})
    alert_id = _latest_alert_id(dev_mode_client)

    dev_mode_client.post(f"/api/v1/alerts/{alert_id}/ack", json={"step": 1})
    dev_mode_client.post(f"/api/v1/alerts/{alert_id}/ack", json={"step": 2})

    r = dev_mode_client.post(f"/api/v1/alerts/{alert_id}/ack", json={"step": 3})
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "WORKFLOW_ERROR"


def test_ack_out_of_order_step2_first_returns_400(dev_mode_client):
    """Cannot jump from open to ack2."""
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 10, "anonMode": False})
    alert_id = _latest_alert_id(dev_mode_client)
    r = dev_mode_client.post(f"/api/v1/alerts/{alert_id}/ack", json={"step": 2})
    assert r.status_code == 400


def test_ack_out_of_order_step3_first_returns_400(dev_mode_client):
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 10, "anonMode": False})
    alert_id = _latest_alert_id(dev_mode_client)
    r = dev_mode_client.post(
        f"/api/v1/alerts/{alert_id}/ack",
        json={"step": 3, "note": "x"},
    )
    assert r.status_code == 400


def test_ack_invalid_step_value_returns_400(dev_mode_client):
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 10, "anonMode": False})
    alert_id = _latest_alert_id(dev_mode_client)
    for bad in (0, 4, "1", None):
        r = dev_mode_client.post(
            f"/api/v1/alerts/{alert_id}/ack", json={"step": bad}
        )
        assert r.status_code == 400, f"step={bad!r} should be 400"


def test_ack_nonexistent_alert_returns_404(dev_mode_client):
    r = dev_mode_client.post(
        "/api/v1/alerts/00000000-0000-0000-0000-000000000999/ack",
        json={"step": 1},
    )
    assert r.status_code == 404


def test_ack_already_closed_cannot_be_reopened(dev_mode_client):
    """Closed alerts are terminal — re-acking returns 400."""
    dev_mode_client.post("/api/v1/checkins/", json={"energy": 10, "anonMode": False})
    alert_id = _latest_alert_id(dev_mode_client)
    dev_mode_client.post(f"/api/v1/alerts/{alert_id}/ack", json={"step": 1})
    dev_mode_client.post(f"/api/v1/alerts/{alert_id}/ack", json={"step": 2})
    dev_mode_client.post(
        f"/api/v1/alerts/{alert_id}/ack",
        json={"step": 3, "note": "done"},
    )
    r = dev_mode_client.post(f"/api/v1/alerts/{alert_id}/ack", json={"step": 1})
    assert r.status_code == 400


# ---------------------- Authorization ---------------------- #

def test_alerts_endpoint_requires_auth(client):
    response = client.get("/api/v1/alerts/")
    assert response.status_code == 401
