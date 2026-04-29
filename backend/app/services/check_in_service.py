"""
Service layer for check-in operations.

Why a service layer?
    Keeping API endpoints thin and pushing business logic here:
    - makes the rules testable independent of HTTP
    - centralises the anonymity invariant (one place to audit)
    - makes Sprint 4's RLS migration easier (the queries are in one file)

The two factory methods enforce the anonymity invariant:
    - create_identified()  → user_id set, anon_token NULL
    - create_anonymous()   → user_id NULL, anon_token = blake2b hash
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from app.extensions import db
from app.models import utcnow
from app.models.checkin import CheckIn
from app.utils.anon_token import generate_anon_token


class CheckInValidationError(ValueError):
    """Raised when a check-in cannot be created due to bad input."""


class CheckInService:
    """All check-in CRUD goes through here."""

    # ----- Validation -------------------------------------------------------

    @staticmethod
    def validate_payload(
        energy: int,
        comment: Optional[str],
        support_q: Optional[bool],
        workload_q: Optional[bool],
    ) -> None:
        """
        Validate raw payload fields. Raises CheckInValidationError on issues.

        - energy must be int 0..100
        - comment max 300 chars (Spec v2 FR-04)
        - support_q / workload_q must be bool or None
        """
        if not isinstance(energy, int) or isinstance(energy, bool):
            raise CheckInValidationError("energy must be an integer")
        if energy < 0 or energy > 100:
            raise CheckInValidationError("energy must be between 0 and 100")
        if comment is not None and len(comment) > 300:
            raise CheckInValidationError("comment exceeds 300 character limit")
        if support_q is not None and not isinstance(support_q, bool):
            raise CheckInValidationError("support_q must be a boolean or null")
        if workload_q is not None and not isinstance(workload_q, bool):
            raise CheckInValidationError("workload_q must be a boolean or null")

    # ----- Create — identified ----------------------------------------------

    @classmethod
    def create_identified(
        cls,
        *,
        user_id: str,
        energy: int,
        support_q: Optional[bool] = None,
        workload_q: Optional[bool] = None,
        comment: Optional[str] = None,
        shift_id: Optional[str] = None,
        source: str = "web",
    ) -> CheckIn:
        """
        Create an identified check-in. user_id is stored; anon_token is NULL.

        Caller is responsible for confirming the user_id matches the
        authenticated session (do not pass arbitrary user_ids from the
        request body).
        """
        cls.validate_payload(energy, comment, support_q, workload_q)
        if not user_id:
            raise CheckInValidationError("user_id is required for identified mode")

        check_in = CheckIn(
            user_id=user_id,
            anon_token=None,
            energy=energy,
            support_q=support_q,
            workload_q=workload_q,
            comment_ciphertext=cls._encrypt_comment(comment),
            shift_id=shift_id,
            source=source,
        )
        db.session.add(check_in)
        db.session.flush()  # populate check_in_id without committing
        return check_in

    # ----- Create — anonymous ----------------------------------------------

    @classmethod
    def create_anonymous(
        cls,
        *,
        user_id: str,
        salt: str,
        on_date: Optional[date] = None,
        energy: int,
        support_q: Optional[bool] = None,
        workload_q: Optional[bool] = None,
        comment: Optional[str] = None,
        shift_id: Optional[str] = None,
        source: str = "web",
    ) -> CheckIn:
        """
        Create an anonymous check-in.

        user_id is hashed with the salt and date to produce anon_token, then
        DROPPED (never persisted). The check-in row stores user_id=NULL and
        anon_token=hash. This is the architectural anonymity guarantee.

        Args:
            user_id: The actual authenticated user. Used ONLY to compute the
                     hash; never written to the row. Even if the database is
                     compromised, the user_id is not present alongside the
                     anon_token, so re-identification requires brute-forcing
                     the salt.
            salt:    Application-wide ANON_TOKEN_SALT.
            on_date: Defaults to today (UTC).

        Returns:
            The committed-to-session CheckIn (call db.session.commit() in the
            caller's request handler).
        """
        cls.validate_payload(energy, comment, support_q, workload_q)
        if not user_id:
            raise CheckInValidationError(
                "user_id is required to compute the anonymity hash, even though "
                "it will not be persisted on the row"
            )

        if on_date is None:
            on_date = utcnow().date()

        anon_token = generate_anon_token(user_id, on_date, salt)

        check_in = CheckIn(
            user_id=None,
            anon_token=anon_token,
            energy=energy,
            support_q=support_q,
            workload_q=workload_q,
            comment_ciphertext=cls._encrypt_comment(comment),
            shift_id=shift_id,
            source=source,
        )
        db.session.add(check_in)
        db.session.flush()
        return check_in

    # ----- Read -------------------------------------------------------------

    @staticmethod
    def list_for_user(user_id: str, limit: int = 50) -> list[CheckIn]:
        """
        Return the user's IDENTIFIED check-ins, newest first.

        Anonymous check-ins are NOT returned by this method — they are
        unjoinable to the user by construction. If a user wants to see
        their own anonymous reports, they must make that decision before
        the report is anonymised (e.g., a 'remember me locally' option),
        which is out of scope for v0.2.
        """
        return (
            db.session.query(CheckIn)
            .filter(CheckIn.user_id == user_id)
            .order_by(CheckIn.created_at.desc())
            .limit(limit)
            .all()
        )

    # ----- Internals --------------------------------------------------------

    @staticmethod
    def _encrypt_comment(comment: Optional[str]) -> Optional[str]:
        """
        Encrypt the comment with AES-256-GCM (Spec v2 NFR-SEC-03).

        Sprint 4 activates this. Returns None if comment is None.
        """
        if comment is None:
            return None
        from flask import current_app

        from app.utils.crypto import encrypt

        key = current_app.config.get("COMMENT_ENCRYPTION_KEY", "")
        return encrypt(comment, key)

    @staticmethod
    def decrypt_comment(ciphertext: Optional[str]) -> Optional[str]:
        """
        Decrypt a stored comment ciphertext back to plaintext.

        Should be called only when the consumer has been authorized to read
        the comment (manager with drill-down rights on an identified
        check-in; the original user themselves).
        """
        if ciphertext is None:
            return None
        from flask import current_app

        from app.utils.crypto import decrypt

        key = current_app.config.get("COMMENT_ENCRYPTION_KEY", "")
        return decrypt(ciphertext, key)
