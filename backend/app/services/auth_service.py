"""
Authentication service.

Three operations:
    - request_otp(contact, contact_type)  → OtpRequest (sends/prints code)
    - verify_otp(contact, code)           → User + JWT pair
    - find_or_create_user(contact, ...)   → User (called by verify_otp)

In dev (DEV_MODE off but no Twilio/Resend keys), the OTP code is logged
to stdout. In prod, the AuthService delegates to NotificationService
(Sprint 5) which routes to Twilio / Resend.
"""

from __future__ import annotations

from datetime import timedelta
from app.models import utcnow
from typing import Optional

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token

from app.extensions import db
from app.models.otp_request import OtpRequest
from app.models.user import User
from app.utils.otp import (
    MAX_VERIFY_ATTEMPTS,
    OTP_TTL_SECONDS,
    constant_time_equals,
    generate_code,
    hash_code,
)


# Rate-limit constants for OTP requests.
# Hard limits per contact (independent of the request-rate-limit middleware).
OTP_REQUEST_WINDOW_SECONDS = 600
OTP_REQUEST_LIMIT_PER_WINDOW = 3


class OtpRequestError(Exception):
    """Generic OTP-flow error. Caller should map to 4xx response."""


class OtpRateLimitError(OtpRequestError):
    """Too many recent OTP requests for this contact."""


class OtpVerificationError(OtpRequestError):
    """Code was wrong, expired, or otherwise unverifiable."""


class AuthService:
    # ------------------------------------------------------------------
    # Request OTP
    # ------------------------------------------------------------------

    @classmethod
    def request_otp(
        cls,
        contact: str,
        contact_type: str,
        ip_hash: Optional[str] = None,
    ) -> OtpRequest:
        """
        Issue a fresh OTP for the given contact.

        Returns the persisted OtpRequest. The plaintext code is delivered
        out-of-band (Twilio/Resend in prod; stdout in dev).
        """
        if contact_type not in ("email", "phone"):
            raise OtpRequestError("contact_type must be 'email' or 'phone'")
        if not contact or len(contact) > 255:
            raise OtpRequestError("contact missing or too long")

        # Rate limit per contact
        cls._enforce_per_contact_rate_limit(contact)

        salt = current_app.config.get("ANON_TOKEN_SALT", "")
        code = generate_code()
        code_hash = hash_code(code, salt)
        now = utcnow()

        request = OtpRequest(
            contact=contact,
            contact_type=contact_type,
            code_hash=code_hash,
            expires_at=now + timedelta(seconds=OTP_TTL_SECONDS),
            attempts=0,
            ip_hash=ip_hash,
        )
        db.session.add(request)
        db.session.commit()

        cls._deliver_code(contact, contact_type, code)

        return request

    @staticmethod
    def _enforce_per_contact_rate_limit(contact: str) -> None:
        cutoff = utcnow() - timedelta(seconds=OTP_REQUEST_WINDOW_SECONDS)
        recent = (
            db.session.query(OtpRequest)
            .filter(
                OtpRequest.contact == contact,
                OtpRequest.created_at >= cutoff,
            )
            .count()
        )
        if recent >= OTP_REQUEST_LIMIT_PER_WINDOW:
            raise OtpRateLimitError(
                f"Too many OTP requests for {contact}. "
                f"Try again in {OTP_REQUEST_WINDOW_SECONDS // 60} minutes."
            )

    @staticmethod
    def _deliver_code(contact: str, contact_type: str, code: str) -> None:
        """
        Deliver the plaintext OTP to the contact.

        v0.3 implementation: log to stdout. Sprint 5 will wire Twilio + Resend.
        """
        # Print to stdout / log so dev users can see the code.
        # SECURITY: NEVER do this in production. Sprint 5 must replace this
        # with a real notification call AND remove the logger line entirely.
        current_app.logger.info(
            f"[DEV OTP] code for {contact_type}={contact}: {code} "
            f"(expires in {OTP_TTL_SECONDS // 60} min). "
            f"Sprint 5 will replace this with Twilio/Resend."
        )
        # Also print to stdout in case logging is filtered
        print(f"[DEV OTP] {contact}: {code}", flush=True)

    # ------------------------------------------------------------------
    # Verify OTP
    # ------------------------------------------------------------------

    @classmethod
    def verify_otp(cls, contact: str, code: str) -> tuple[User, dict]:
        """
        Verify a code and issue a JWT pair.

        Returns:
            (User, {"access_token": ..., "refresh_token": ...})

        Raises:
            OtpVerificationError on any failure path. The error message
            is intentionally generic — do not leak whether the contact
            exists, whether the code was right but expired, etc.
        """
        if not contact or not code:
            raise OtpVerificationError("contact and code are required")

        # Find the most recent unconsumed request for this contact
        otp = (
            db.session.query(OtpRequest)
            .filter(
                OtpRequest.contact == contact,
                OtpRequest.consumed_at.is_(None),
            )
            .order_by(OtpRequest.created_at.desc())
            .first()
        )
        if otp is None:
            raise OtpVerificationError("invalid or expired code")

        now = utcnow()

        # Expired?
        if otp.expires_at < now:
            otp.consumed_at = now
            db.session.commit()
            raise OtpVerificationError("invalid or expired code")

        # Increment attempt counter FIRST, so a wrong code still costs an attempt.
        otp.attempts = (otp.attempts or 0) + 1
        exhausted = otp.attempts >= MAX_VERIFY_ATTEMPTS

        salt = current_app.config.get("ANON_TOKEN_SALT", "")
        expected_hash = hash_code(code, salt)

        if not constant_time_equals(expected_hash, otp.code_hash):
            # If this was the last allowed attempt, consume the request so
            # subsequent attempts (even with a correct code) cannot succeed.
            if exhausted:
                otp.consumed_at = now
            db.session.commit()
            raise OtpVerificationError("invalid or expired code")

        # Success — consume the request, find or create the user, mint tokens.
        otp.consumed_at = now
        user = cls._find_or_create_user(contact, otp.contact_type)
        db.session.commit()

        token_payload = {
            "user_id": user.user_id,
            "role": user.role,
        }
        tokens = {
            "access_token": create_access_token(
                identity=user.user_id, additional_claims=token_payload
            ),
            "refresh_token": create_refresh_token(
                identity=user.user_id, additional_claims=token_payload
            ),
        }
        return user, tokens

    # ------------------------------------------------------------------
    # User resolution
    # ------------------------------------------------------------------

    @staticmethod
    def _find_or_create_user(contact: str, contact_type: str) -> User:
        """
        Look up a user by contact email/phone. Create a new employee-role user
        if one doesn't exist (first-time login).
        """
        column = User.contact_email if contact_type == "email" else User.contact_phone
        user = db.session.query(User).filter(column == contact).first()
        if user:
            if not user.is_active:
                # Deactivated users cannot log in. Sprint 4+ will emit a
                # specific code so the frontend can show a useful message.
                raise OtpVerificationError("invalid or expired code")
            return user

        # First-time login: create an employee-role user with no display name
        # set yet. Sprint 4 will add a "complete your profile" step.
        new_user = User(
            display_name=contact,  # placeholder; user can edit later
            role="employee",
            is_active=True,
            consent_at=None,  # consent must be granted explicitly
        )
        if contact_type == "email":
            new_user.contact_email = contact
        else:
            new_user.contact_phone = contact
        db.session.add(new_user)
        db.session.flush()
        return new_user
