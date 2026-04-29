"""
Tests for the architectural anonymity primitive.

These verify the invariants that the entire UVP rests on. If any of these
fails, the anonymity guarantee is broken — block the deploy.
"""

from __future__ import annotations

from datetime import date

import pytest

from app.utils.anon_token import (
    AnonTokenError,
    generate_anon_token,
    verify_anon_token_unsafe,
)


SALT = "test-salt-with-enough-length-to-pass-the-guard"


def test_deterministic_same_inputs():
    a = generate_anon_token("user-1", date(2026, 4, 29), SALT)
    b = generate_anon_token("user-1", date(2026, 4, 29), SALT)
    assert a == b


def test_different_user_different_token():
    a = generate_anon_token("user-1", date(2026, 4, 29), SALT)
    b = generate_anon_token("user-2", date(2026, 4, 29), SALT)
    assert a != b


def test_different_day_different_token():
    a = generate_anon_token("user-1", date(2026, 4, 29), SALT)
    b = generate_anon_token("user-1", date(2026, 4, 30), SALT)
    assert a != b


def test_different_salt_different_token():
    a = generate_anon_token("user-1", date(2026, 4, 29), SALT)
    b = generate_anon_token("user-1", date(2026, 4, 29), "another-salt-of-sufficient-length")
    assert a != b


def test_digest_is_64_hex_chars():
    token = generate_anon_token("u", date(2026, 4, 29), SALT)
    assert len(token) == 64
    int(token, 16)  # raises if not valid hex


def test_short_salt_refused():
    """Trivially-short salts MUST raise rather than producing a guessable token."""
    with pytest.raises(AnonTokenError):
        generate_anon_token("user-1", date(2026, 4, 29), "short")


def test_empty_salt_refused():
    with pytest.raises(AnonTokenError):
        generate_anon_token("user-1", date(2026, 4, 29), "")


def test_empty_user_id_refused():
    with pytest.raises(AnonTokenError):
        generate_anon_token("", date(2026, 4, 29), SALT)


def test_non_date_refused():
    with pytest.raises(AnonTokenError):
        generate_anon_token("user-1", "2026-04-29", SALT)  # str, not date


def test_verify_returns_true_for_match():
    token = generate_anon_token("user-1", date(2026, 4, 29), SALT)
    assert verify_anon_token_unsafe("user-1", date(2026, 4, 29), SALT, token) is True


def test_verify_returns_false_for_mismatch():
    token = generate_anon_token("user-1", date(2026, 4, 29), SALT)
    assert (
        verify_anon_token_unsafe("user-2", date(2026, 4, 29), SALT, token) is False
    )
    assert (
        verify_anon_token_unsafe("user-1", date(2026, 4, 30), SALT, token) is False
    )


def test_verify_returns_false_for_empty_token():
    assert verify_anon_token_unsafe("user-1", date(2026, 4, 29), SALT, "") is False


def test_verify_returns_false_when_salt_too_short():
    """Verify gracefully returns False rather than raising."""
    assert verify_anon_token_unsafe("u", date(2026, 4, 29), "short", "x" * 64) is False
