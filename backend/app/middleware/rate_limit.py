"""
Simple in-memory request rate limiter.

Spec v2 NFR-SEC-04: ≤60 req/min/user (or per-IP for unauthenticated).

This implementation:
    - In-memory dict, per-process, sliding-second-bucket counts.
    - Keyed by user_id when authenticated, else by hashed IP.
    - DEV_MODE bypasses (every request is the same synthetic admin, so the
      limit would be useless — and dev iteration shouldn't trip it).
    - Excludes /api/v1/health from limiting (uptime monitors).

Limitations and Sprint 4+ replacement plan:
    - Per-process means multi-worker gunicorn each have their own counter.
      For a single-ward pilot this is fine. At scale, swap for Redis-backed
      or use a reverse-proxy rate limiter (nginx, Cloudflare).
    - No persistence across restarts — also fine for a soft limit.
    - Memory grows unbounded if the keyspace is huge. The cleanup runs on
      every request and drops keys older than 2 minutes.
"""

from __future__ import annotations

import hashlib
import time
from collections import defaultdict
from threading import Lock
from typing import Tuple

from flask import Flask, current_app, g, jsonify, request

# {(key, minute_bucket): count}
_buckets: dict[Tuple[str, int], int] = defaultdict(int)
_lock = Lock()
_last_cleanup_minute = 0

# Endpoints that should never be rate-limited (uptime monitors, etc.)
_EXEMPT_PATHS = ("/api/v1/health",)


def _bucket_key() -> str:
    """User-id if authenticated; else hashed IP."""
    user = getattr(g, "current_user", None)
    if user and user.get("user_id"):
        return f"u:{user['user_id']}"

    salt = current_app.config.get("ANON_TOKEN_SALT", "")
    ip = request.remote_addr or "unknown"
    payload = f"{ip}|{salt}".encode("utf-8")
    return f"ip:{hashlib.sha256(payload).hexdigest()[:16]}"


def _cleanup_old_buckets(current_minute: int) -> None:
    """Drop buckets older than ~2 minutes. Called under _lock."""
    global _last_cleanup_minute
    if current_minute == _last_cleanup_minute:
        return
    cutoff = current_minute - 2
    stale = [k for k in _buckets if k[1] < cutoff]
    for k in stale:
        del _buckets[k]
    _last_cleanup_minute = current_minute


def register_rate_limiter(app: Flask) -> None:
    """Wire the rate-limit before-request hook."""

    @app.before_request
    def enforce_rate_limit():
        # Exempt list
        if request.path in _EXEMPT_PATHS:
            return None

        # DEV_MODE bypass — every request is the same admin; counters are useless.
        if app.config.get("DEV_MODE_ENABLED"):
            return None

        # Tests bypass to avoid making rate-limiting a flaky concern.
        if app.config.get("TESTING") and not app.config.get(
            "RATE_LIMIT_ENABLED_IN_TESTS", False
        ):
            return None

        limit = app.config.get("RATE_LIMIT_PER_MINUTE", 60)
        now_minute = int(time.time() // 60)

        with _lock:
            _cleanup_old_buckets(now_minute)
            key = _bucket_key()
            bucket = (key, now_minute)
            _buckets[bucket] += 1
            count = _buckets[bucket]

        if count > limit:
            return jsonify(
                {
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": f"Too many requests. Limit is {limit}/min.",
                    }
                }
            ), 429
        return None


def reset_rate_limit_counters() -> None:
    """Test helper: wipe all buckets. Do not call from app code."""
    with _lock:
        _buckets.clear()
