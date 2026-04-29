"""
Tests for AES-256-GCM comment encryption.
"""

from __future__ import annotations

import pytest

from app.utils.crypto import (
    CommentEncryptionError,
    decrypt,
    encrypt,
)


KEY = "test-key-with-arbitrary-content-derived-via-blake2b"


def test_round_trip():
    plaintext = "I felt overwhelmed today. The 12-hour shift was a lot."
    blob = encrypt(plaintext, KEY)
    assert blob != plaintext
    assert plaintext.encode() not in blob.encode()  # not just b64-ed plaintext
    assert decrypt(blob, KEY) == plaintext


def test_round_trip_unicode():
    plaintext = "🩺 חולשה אחרי משמרת לילה — ok"  # mixed scripts + emoji
    blob = encrypt(plaintext, KEY)
    assert decrypt(blob, KEY) == plaintext


def test_decrypt_with_wrong_key_raises():
    blob = encrypt("secret data", KEY)
    with pytest.raises(CommentEncryptionError):
        decrypt(blob, "totally-different-key-also-arbitrary-length")


def test_decrypt_tampered_ciphertext_raises():
    blob = encrypt("hello", KEY)
    # Flip a byte in the middle of the b64 string
    middle = len(blob) // 2
    tampered = blob[:middle] + ("A" if blob[middle] != "A" else "B") + blob[middle + 1:]
    with pytest.raises(CommentEncryptionError):
        decrypt(tampered, KEY)


def test_encrypt_empty_key_refused():
    with pytest.raises(CommentEncryptionError):
        encrypt("hello", "")


def test_decrypt_none_returns_none():
    """None passes through — useful for nullable comment columns."""
    assert decrypt(None, KEY) is None


def test_encrypt_produces_different_ciphertext_each_time():
    """Nonce is fresh per encrypt call → ciphertext is non-deterministic."""
    a = encrypt("same plaintext", KEY)
    b = encrypt("same plaintext", KEY)
    assert a != b
    assert decrypt(a, KEY) == decrypt(b, KEY) == "same plaintext"


def test_decrypt_short_ciphertext_raises():
    with pytest.raises(CommentEncryptionError):
        decrypt("dGlueQ==", KEY)  # b64 of "tiny" — too short to be a real blob
