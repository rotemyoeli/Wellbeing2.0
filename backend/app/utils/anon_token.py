"""
Anonymous token generation — the architectural anonymity primitive.

This is THE differentiator (UVP 1 in
docs/01_strategy/02_Differentiation_and_Positioning.md). Every change to
this module needs a `security` commit type and explicit review.

Design:
    anon_token = blake2b(user_id || '|' || iso_date || '|' || salt).hex()

Properties:
    - One-way: cannot be reversed without brute-forcing every employee
      against every day against the salt.
    - Stable per (user, day): allows duplicate-report prevention without
      revealing identity.
    - Salt-rotated: rotating ANON_TOKEN_SALT invalidates old tokens, which
      is acceptable given they only live as duplicate-prevention markers.
    - Deterministic: same inputs produce same output (we use this for tests).

Why BLAKE2b and not SHA-256?
    BLAKE2b is faster, designed for keyed hashing, and resistant to length-
    extension attacks. Both are FIPS-acceptable in their respective regimes.
    If your DPO mandates SHA-256, change `_HASHER` and document in an ADR.

Why include the date?
    The duplicate-prevention window is per-day, not per-lifetime. Including
    the date means a single user produces a different token each day, which
    further weakens any re-identification attempt across time.
"""

from __future__ import annotations

import hashlib
from datetime import date


_HASHER = hashlib.blake2b
_DIGEST_SIZE_BYTES = 32  # 64 hex chars


class AnonTokenError(Exception):
    """Raised when token generation cannot proceed safely."""


def generate_anon_token(user_id: str, on_date: date, salt: str) -> str:
    """
    Compute the one-way anonymity token for (user, day).

    Args:
        user_id: The actual user UUID. NEVER stored alongside the resulting
                 token — only the token is persisted on the check-in row.
        on_date: The date of the check-in (UTC).
        salt:    The application-wide ANON_TOKEN_SALT.

    Returns:
        Hex-encoded BLAKE2b digest, 64 chars.

    Raises:
        AnonTokenError: if salt is missing or trivially weak (refuses to
                        compute rather than produce a guessable token).
    """
    if not user_id:
        raise AnonTokenError("user_id is required")
    if not isinstance(on_date, date):
        raise AnonTokenError("on_date must be a datetime.date")
    if not salt or len(salt) < 16:
        raise AnonTokenError(
            "ANON_TOKEN_SALT is missing or too short (need >=16 chars). "
            "Refusing to generate a weak anonymity token."
        )

    payload = f"{user_id}|{on_date.isoformat()}|{salt}".encode("utf-8")
    digest = _HASHER(payload, digest_size=_DIGEST_SIZE_BYTES).hexdigest()
    return digest


def verify_anon_token_unsafe(
    candidate_user_id: str,
    on_date: date,
    salt: str,
    expected_token: str,
) -> bool:
    """
    Check whether a (user, date, salt) triple would produce the given token.

    'unsafe' is in the name because this function exists ONLY for legitimate
    operational uses (e.g., the user themselves checking 'did I already
    submit today?'). It must NEVER be exposed to managers or admins as a
    re-identification mechanism.

    A manager calling this in a loop over all employees defeats the entire
    anonymity guarantee. Therefore:
        - This function is not exposed via any HTTP endpoint.
        - A grep for `verify_anon_token_unsafe` should return only legitimate
          callsites, all of which should be reviewed.
    """
    if not expected_token:
        return False
    try:
        return generate_anon_token(candidate_user_id, on_date, salt) == expected_token
    except AnonTokenError:
        return False
