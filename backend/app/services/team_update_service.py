"""
Team Updates service — the closed-loop feedback engine.

This is the "what we did about it" feature. Research shows participation
drops ~60% within 3 months without visible manager response. The team
update is the product's primary retention mechanism.

Rules:
    - Only managers/admins can create updates
    - Updates belong to a department_id (ward-scoped)
    - Updates can be edited within 24 hours of creation
    - Soft-delete only (is_active=False)
    - Published updates appear in the employee B5 home feed
"""

from __future__ import annotations

from datetime import timedelta
from typing import Optional

from app.extensions import db
from app.models import utcnow
from app.models.team_update import TeamUpdate


class TeamUpdateValidationError(ValueError):
    """Raised when a team update fails validation."""


class TeamUpdateService:
    @staticmethod
    def create(
        *,
        author_id: str,
        department_id: str,
        content: str,
        publish: bool = True,
    ) -> TeamUpdate:
        """
        Create a new team update.

        Args:
            author_id: The manager creating the update.
            department_id: The ward/department this update targets.
            content: The update text (10-500 chars).
            publish: If True, set published_at to now.
        """
        if not content or not content.strip():
            raise TeamUpdateValidationError("Content is required")
        content = content.strip()
        if len(content) < 10:
            raise TeamUpdateValidationError(
                "Content must be at least 10 characters"
            )
        if len(content) > 500:
            raise TeamUpdateValidationError(
                "Content must not exceed 500 characters"
            )
        if not department_id:
            raise TeamUpdateValidationError("department_id is required")

        now = utcnow()
        update = TeamUpdate(
            author_id=author_id,
            department_id=department_id,
            content=content,
            published_at=now if publish else None,
        )
        db.session.add(update)
        db.session.flush()
        return update

    @staticmethod
    def get(update_id: str) -> Optional[TeamUpdate]:
        return db.session.get(TeamUpdate, update_id)

    @staticmethod
    def list_for_department(
        department_id: str,
        *,
        limit: int = 20,
        published_only: bool = True,
    ) -> list[TeamUpdate]:
        """List team updates for a department, newest first."""
        q = (
            db.session.query(TeamUpdate)
            .filter(
                TeamUpdate.department_id == department_id,
                TeamUpdate.is_active.is_(True),
            )
            .order_by(TeamUpdate.created_at.desc())
        )
        if published_only:
            q = q.filter(TeamUpdate.published_at.isnot(None))
        return q.limit(limit).all()

    @staticmethod
    def list_for_author(
        author_id: str,
        *,
        limit: int = 50,
    ) -> list[TeamUpdate]:
        """List all updates by a specific author."""
        return (
            db.session.query(TeamUpdate)
            .filter(
                TeamUpdate.author_id == author_id,
                TeamUpdate.is_active.is_(True),
            )
            .order_by(TeamUpdate.created_at.desc())
            .limit(limit)
            .all()
        )

    @classmethod
    def update_content(
        cls,
        update: TeamUpdate,
        *,
        content: str,
    ) -> TeamUpdate:
        """
        Edit a team update's content. Only allowed within 24h of creation.
        """
        now = utcnow()
        age = now - update.created_at
        if age > timedelta(hours=24):
            raise TeamUpdateValidationError(
                "Updates can only be edited within 24 hours of creation"
            )
        content = content.strip()
        if not content:
            raise TeamUpdateValidationError("Content is required")
        if len(content) < 10:
            raise TeamUpdateValidationError(
                "Content must be at least 10 characters"
            )
        if len(content) > 500:
            raise TeamUpdateValidationError(
                "Content must not exceed 500 characters"
            )
        update.content = content
        db.session.flush()
        return update

    @staticmethod
    def soft_delete(update: TeamUpdate) -> TeamUpdate:
        """Soft-delete a team update."""
        update.is_active = False
        db.session.flush()
        return update

    @staticmethod
    def publish(update: TeamUpdate) -> TeamUpdate:
        """Mark an unpublished update as published."""
        if update.published_at is None:
            update.published_at = utcnow()
            db.session.flush()
        return update
