"""
Test the in-memory rate-limit middleware.

The middleware bypasses by default in TESTING; we toggle it on for these tests.
"""

from __future__ import annotations

import pytest

from app import create_app
from app.extensions import db as _db
from app.middleware.rate_limit import reset_rate_limit_counters


@pytest.fixture
def rate_limited_client():
    """An app + client with rate limiting actually enabled."""
    app = create_app("testing")
    app.config["RATE_LIMIT_ENABLED_IN_TESTS"] = True
    app.config["RATE_LIMIT_PER_MINUTE"] = 5  # tight cap for the test
    reset_rate_limit_counters()
    with app.app_context():
        _db.create_all()
        yield app.test_client()
        _db.session.remove()
        _db.drop_all()
    reset_rate_limit_counters()


def test_rate_limit_blocks_after_threshold(rate_limited_client):
    """The 6th request in the same minute should return 429."""
    for _ in range(5):
        r = rate_limited_client.post(
            "/api/v1/auth/request-otp",
            json={"contact": "spammer@example.com", "contactType": "email"},
        )
        # The OTP per-contact limit kicks in at 4 requests; we're testing
        # the global rate limit, so we vary the contact.
        # On reflection, easier: just hit /me which is auth-required.

    # Reset and use a different endpoint
    reset_rate_limit_counters()
    for i in range(5):
        r = rate_limited_client.get("/api/v1/auth/me")
        # 401 because no JWT — but the rate limiter ran first (or after).
        # Looking at the code: rate limiter runs in before_request, so it
        # counts whether or not the endpoint is auth-protected.
        assert r.status_code in (401,), f"request {i+1} got {r.status_code}"

    # 6th request should be rate limited
    r = rate_limited_client.get("/api/v1/auth/me")
    assert r.status_code == 429
    body = r.get_json()
    assert body["error"]["code"] == "RATE_LIMITED"


def test_health_endpoint_is_exempt_from_rate_limit(rate_limited_client):
    """Uptime monitors hit /health a lot. It must never be limited."""
    for _ in range(20):
        r = rate_limited_client.get("/api/v1/health")
        assert r.status_code == 200
