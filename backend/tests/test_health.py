"""Smoke tests for the health endpoint and app boot."""

from __future__ import annotations


def test_app_boots(app):
    """The app fixture itself proves the app factory runs without exceptions."""
    assert app is not None
    assert app.config["TESTING"] is True


def test_health_endpoint_returns_200(client):
    """GET /api/v1/health returns 200 with the expected shape."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    body = response.get_json()
    assert body["status"] == "ok"
    assert body["version"]
    # In testing config, dev_mode is False (testing exercises real auth paths).
    assert body["dev_mode"] is False


def test_dev_mode_off_in_test_config(app):
    """Defensive: testing config must NOT enable the DEV_MODE backdoor."""
    assert app.config["DEV_MODE_ENABLED"] is False


def test_anon_token_deterministic_in_tests(app):
    """The anon_token utility produces stable output with the test salt."""
    from datetime import date

    from app.utils.anon_token import generate_anon_token

    salt = app.config["ANON_TOKEN_SALT"]
    assert len(salt) >= 16, "test config salt must be long enough"

    token_a = generate_anon_token("user-1", date(2026, 4, 29), salt)
    token_b = generate_anon_token("user-1", date(2026, 4, 29), salt)
    token_other_user = generate_anon_token("user-2", date(2026, 4, 29), salt)
    token_other_day = generate_anon_token("user-1", date(2026, 4, 30), salt)

    assert token_a == token_b, "same inputs should produce same token"
    assert token_a != token_other_user, "different user should produce different token"
    assert token_a != token_other_day, "different day should produce different token"
    assert len(token_a) == 64, "BLAKE2b 32-byte digest = 64 hex chars"
