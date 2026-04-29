"""
One-time-password utilities.

Design:
    - 6-digit numeric code (zero-padded), generated from `secrets`
    - Stored as a salted hash (BLAKE2b), never plaintext
    - Time-bounded (default 10 min)
    - Single-use (the otp_request row is marked consumed after verify)

Security notes:
    - secrets.randbelow is the right primitive (cryptographically random).
    - We deliberately accept 6 digits despite ~1M codespace because:
        * Codes expire in 10 min
        * Rate-limit caps to 3 attempts per request
        * Brute-force expected attempts to succeed = 10^6 / 3 = 333k requests,
          each requiring valid contact + valid recent request_id
    - For higher-security contexts (e.g., admin role), 8 digits or
      a longer alphabet is appropriate. Sprint 4+ consideration.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

OTP_LENGTH = 6
OTP_TTL_SECONDS = 600          # 10 minutes
MAX_VERIFY_ATTEMPTS = 3        # consumed after this many failed attempts


def generate_code() -> str:
    """Return a freshly-generated zero-padded numeric OTP."""
    upper = 10 ** OTP_LENGTH
    return str(secrets.randbelow(upper)).zfill(OTP_LENGTH)


def hash_code(code: str, salt: str) -> str:
    """
    Hash an OTP for storage. Salt is the application-wide ANON_TOKEN_SALT
    or a dedicated OTP_HASH_SALT (use ANON_TOKEN_SALT for v0.3 — same
    salt-rotation policy applies).
    """
    if not salt or len(salt) < 16:
        raise ValueError("salt too short for OTP hashing")
    payload = f"{code}|{salt}".encode("utf-8")
    return hashlib.blake2b(payload, digest_size=32).hexdigest()


def constant_time_equals(a: str, b: str) -> bool:
    """Timing-safe string comparison."""
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))
