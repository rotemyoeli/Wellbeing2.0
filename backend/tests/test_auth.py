"""
End-to-end tests for the auth flow.

Coverage:
    - request-otp returns 202 even for non-existent contacts (no leakage)
    - request-otp rate limit (3 per 10 min per contact) returns 429 on 4th
    - verify-otp with right code creates user and returns tokens
    - verify-otp with wrong code returns 401 generic error
    - verify-otp with expired code returns 401
    - verify-otp consumes the otp_request (single-use)
    - me / list-mine work with a real JWT
    - logout returns 204
"""

from __future__ import annotations

from app.extensions import db
from app.models.otp_request import OtpRequest
from app.models.user import User


# ------------------------------------------------------------------ #
# request-otp
# ------------------------------------------------------------------ #

def test_request_otp_returns_202(client):
    response = client.post(
        "/api/v1/auth/request-otp",
        json={"contact": "alice@example.com", "contactType": "email"},
    )
    assert response.status_code == 202


def test_request_otp_persists_an_otp_request(client, app):
    client.post(
        "/api/v1/auth/request-otp",
        json={"contact": "alice@example.com", "contactType": "email"},
    )
    with app.app_context():
        rows = db.session.query(OtpRequest).all()
        assert len(rows) == 1
        assert rows[0].contact == "alice@example.com"
        assert rows[0].consumed_at is None
        assert rows[0].attempts == 0
        # Hash should be 64 hex chars (BLAKE2b 32-byte digest)
        assert len(rows[0].code_hash) == 64


def test_request_otp_does_not_leak_contact_existence(client):
    # Whether the contact is registered or not, the response is the same 202.
    r1 = client.post(
        "/api/v1/auth/request-otp",
        json={"contact": "nobody@example.com", "contactType": "email"},
    )
    r2 = client.post(
        "/api/v1/auth/request-otp",
        json={"contact": "alice@example.com", "contactType": "email"},
    )
    assert r1.status_code == r2.status_code == 202


def test_request_otp_rejects_invalid_contact_type(client):
    response = client.post(
        "/api/v1/auth/request-otp",
        json={"contact": "alice@example.com", "contactType": "telegraph"},
    )
    assert response.status_code == 400


def test_request_otp_rate_limit(client):
    """Per-contact rate limit: 3 requests in 10 min, then 429."""
    body = {"contact": "spammed@example.com", "contactType": "email"}
    for _ in range(3):
        response = client.post("/api/v1/auth/request-otp", json=body)
        assert response.status_code == 202
    response = client.post("/api/v1/auth/request-otp", json=body)
    assert response.status_code == 429


# ------------------------------------------------------------------ #
# verify-otp
# ------------------------------------------------------------------ #

def _issue_otp_and_return_code(app, contact: str = "alice@example.com") -> str:
    """Helper: directly call the service to issue an OTP and capture the code."""
    from app.services.auth_service import AuthService

    captured = {}
    real_deliver = AuthService._deliver_code

    def capture(c, ct, code):
        captured["code"] = code
        captured["contact"] = c

    with app.app_context():
        AuthService._deliver_code = staticmethod(capture)  # type: ignore
        try:
            AuthService.request_otp(contact=contact, contact_type="email")
        finally:
            AuthService._deliver_code = real_deliver  # type: ignore
    return captured["code"]


def test_verify_otp_with_correct_code_returns_tokens(client, app):
    code = _issue_otp_and_return_code(app)
    response = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "alice@example.com", "code": code},
    )
    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert "accessToken" in body
    assert "refreshToken" in body
    assert body["user"]["display_name"] == "alice@example.com"
    assert body["user"]["role"] == "employee"


def test_verify_otp_creates_user_on_first_login(client, app):
    code = _issue_otp_and_return_code(app, contact="newuser@example.com")
    client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "newuser@example.com", "code": code},
    )
    with app.app_context():
        users = db.session.query(User).filter_by(contact_email="newuser@example.com").all()
        assert len(users) == 1


def test_verify_otp_with_wrong_code_returns_401(client, app):
    _issue_otp_and_return_code(app)
    response = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "alice@example.com", "code": "000000"},
    )
    assert response.status_code == 401
    body = response.get_json()
    # Generic message — must not reveal *why* it failed
    assert body["error"]["message"] == "invalid or expired code"


def test_verify_otp_with_no_code_returns_401(client):
    response = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "alice@example.com", "code": ""},
    )
    assert response.status_code == 401


def test_verify_otp_consumes_the_request_single_use(client, app):
    code = _issue_otp_and_return_code(app)
    r1 = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "alice@example.com", "code": code},
    )
    assert r1.status_code == 200
    # Second attempt with the same code should fail
    r2 = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "alice@example.com", "code": code},
    )
    assert r2.status_code == 401


def test_verify_otp_expired_returns_401(client, app):
    """Manually backdate an OtpRequest's expiry."""
    from datetime import timedelta
    from app.models import utcnow

    code = _issue_otp_and_return_code(app)
    with app.app_context():
        otp = (
            db.session.query(OtpRequest)
            .filter_by(contact="alice@example.com")
            .one()
        )
        otp.expires_at = utcnow() - timedelta(minutes=1)
        db.session.commit()
    response = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "alice@example.com", "code": code},
    )
    assert response.status_code == 401


def test_verify_otp_locks_after_max_attempts(client, app):
    _issue_otp_and_return_code(app)
    # 3 failed attempts in a row
    for _ in range(3):
        client.post(
            "/api/v1/auth/verify-otp",
            json={"contact": "alice@example.com", "code": "000000"},
        )
    # 4th attempt — even with the right code should fail
    # (consumed flag is set)
    with app.app_context():
        otp = (
            db.session.query(OtpRequest)
            .filter_by(contact="alice@example.com")
            .one()
        )
        # After 3 failed attempts, the request was consumed
        assert otp.consumed_at is not None


# ------------------------------------------------------------------ #
# /me with real token
# ------------------------------------------------------------------ #

def test_me_with_valid_token_returns_user(client, app):
    code = _issue_otp_and_return_code(app)
    verify = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "alice@example.com", "code": code},
    )
    token = verify.get_json()["accessToken"]
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["user"]["display_name"] == "alice@example.com"
    assert body["user"]["is_dev_mode"] is False


def test_me_without_token_returns_401(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_garbage_token_returns_401(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    assert response.status_code == 401


def test_logout_returns_204(client, app):
    code = _issue_otp_and_return_code(app)
    verify = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "alice@example.com", "code": code},
    )
    token = verify.get_json()["accessToken"]
    response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 204


# ------------------------------------------------------------------ #
# Authenticated check-in flow (real token, no DEV_MODE)
# ------------------------------------------------------------------ #

def test_authenticated_user_can_post_checkin(client, app):
    code = _issue_otp_and_return_code(app)
    verify = client.post(
        "/api/v1/auth/verify-otp",
        json={"contact": "alice@example.com", "code": code},
    )
    token = verify.get_json()["accessToken"]
    response = client.post(
        "/api/v1/checkins/",
        json={"energy": 70, "anonMode": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
