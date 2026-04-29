"""
Comment encryption — AES-256-GCM.

Spec v2 NFR-SEC-03 + §8.2: free-text comments on check-ins are encrypted
at the application layer (column-level encryption), independent of any
DB-level encryption-at-rest. This is the layer that protects against:
    - DB dumps leaking plaintext comments
    - Accidental selection of the column in a SQL console
    - The application-server compromise where DB credentials are stolen
      but the comment encryption key isn't

The key derivation:
    key = blake2b(COMMENT_ENCRYPTION_KEY).digest(32)
This way the env var can be a human-readable string in dev or a 64-hex
production secret — both work, dev iteration is fast, prod is strong.

Storage format:
    base64( nonce(12) || ciphertext+tag(N+16) )

This is one continuous opaque blob written into `comment_ciphertext`.
The DB cannot meaningfully index, search, or filter it.

Sprint 5+ should consider a key-rotation scheme: prefix the blob with a
key-version byte so a cycle of (decrypt-with-old → encrypt-with-new) can
be performed online.
"""

from __future__ import annotations

import base64
import hashlib
import os
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


_NONCE_BYTES = 12  # AES-GCM standard
_DEV_KEY_REFUSE_TOKENS = ("dev-encryption-key-not-for-prod-replace-me",)


class CommentEncryptionError(Exception):
    """Raised when encryption/decryption cannot proceed safely."""


def _derive_key(key_str: str, *, allow_dev_key: bool = True) -> bytes:
    """
    Turn an arbitrary-format env var into a 32-byte AES-256 key.

    Args:
        key_str:        the raw COMMENT_ENCRYPTION_KEY value
        allow_dev_key:  if False, refuse the placeholder dev key. Production
                        config sets this False.
    """
    if not key_str:
        raise CommentEncryptionError(
            "COMMENT_ENCRYPTION_KEY is empty. Generate one with "
            "`python -c 'import secrets; print(secrets.token_hex(32))'`"
        )
    if not allow_dev_key and key_str in _DEV_KEY_REFUSE_TOKENS:
        raise CommentEncryptionError(
            "COMMENT_ENCRYPTION_KEY is the default placeholder. "
            "Replace with a real key before launch."
        )
    # BLAKE2b derivation accepts any input length and produces a 32-byte digest.
    return hashlib.blake2b(key_str.encode("utf-8"), digest_size=32).digest()


def encrypt(plaintext: str, key_str: str) -> str:
    """
    Encrypt a UTF-8 string and return a single base64 blob.

    Returns:
        base64(nonce || ciphertext-with-tag)
    """
    if plaintext is None:
        raise CommentEncryptionError("plaintext is None")
    key = _derive_key(key_str)
    aesgcm = AESGCM(key)
    nonce = os.urandom(_NONCE_BYTES)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), associated_data=None)
    blob = nonce + ct
    return base64.b64encode(blob).decode("ascii")


def decrypt(ciphertext_b64: Optional[str], key_str: str) -> Optional[str]:
    """
    Decrypt a previously-encrypted blob back into the original UTF-8 string.

    Returns None if input is None (so callers can pass-through nullable
    columns without checking).

    Raises CommentEncryptionError on tampering or wrong key.
    """
    if ciphertext_b64 is None:
        return None
    key = _derive_key(key_str)
    try:
        blob = base64.b64decode(ciphertext_b64.encode("ascii"))
    except Exception as exc:
        raise CommentEncryptionError(f"invalid base64 ciphertext: {exc}")
    if len(blob) <= _NONCE_BYTES + 16:
        raise CommentEncryptionError("ciphertext too short")
    nonce = blob[:_NONCE_BYTES]
    ct = blob[_NONCE_BYTES:]
    try:
        plaintext = AESGCM(key).decrypt(nonce, ct, associated_data=None)
    except Exception as exc:
        # Wrong key, tampered ciphertext, etc.
        raise CommentEncryptionError(f"decryption failed: {exc}")
    return plaintext.decode("utf-8")
