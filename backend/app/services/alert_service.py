"""
Service for alert lifecycle (create, ack, escalate, close).

Alerts are auto-generated when a check-in's energy crosses a configured
threshold. Default thresholds (Spec v2 §6 FR-06):
    energy < 25  → low alert
    energy > 85  → high alert

Spec v2 §14.1 specifies alert creation latency <2 minutes. We create
alerts synchronously inside the check-in transaction — this gives ~ms
latency in practice.

Acknowledgment workflow (Spec v2 §6 FR-07): 3 strict transitions.
    open  → ack1 (Seen)        — sets ack_at, ack_by
    ack1  → ack2 (Contacted)   — sets contacted_at
    ack2  → closed             — sets closed_at, REQUIRES note

Out-of-order transitions are rejected. The note is mandatory on close.
"""

from __future__ import annotations

from typing import Optional

from flask import current_app

from app.extensions import db
from app.models import utcnow
from app.models.alert import Alert
from app.models.checkin import CheckIn
from app.models.team_update import TeamUpdate


class AlertWorkflowError(Exception):
    """Invalid alert state transition."""


class AlertService:
    @staticmethod
    def maybe_create_for_checkin(check_in: CheckIn) -> Optional[Alert]:
        """
        Inspect a check-in's energy against the configured thresholds.
        Create + persist (in the current session) an Alert if needed.
        Returns the new Alert, or None if no alert was triggered.
        """
        low = current_app.config.get("ALERT_THRESHOLD_LOW", 25)
        high = current_app.config.get("ALERT_THRESHOLD_HIGH", 85)

        alert_type: Optional[str] = None
        if check_in.energy < low:
            alert_type = "low"
        elif check_in.energy > high:
            alert_type = "high"

        if alert_type is None:
            return None

        alert = Alert(
            check_in_id=check_in.check_in_id,
            type=alert_type,
            status="open",
        )
        db.session.add(alert)
        db.session.flush()
        return alert

    # ---- Listing ---------------------------------------------------------

    @staticmethod
    def list_alerts(
        status: Optional[str] = None,
        department_id: Optional[str] = None,
        limit: int = 100,
    ) -> list[Alert]:
        """List alerts, newest first, optionally filtered by status and department."""
        q = db.session.query(Alert).order_by(Alert.created_at.desc())
        if status:
            q = q.filter(Alert.status == status)
        if department_id:
            q = q.join(CheckIn, Alert.check_in_id == CheckIn.check_in_id).filter(
                CheckIn.department_id == department_id
            )
        return q.limit(limit).all()

    @staticmethod
    def get_alert(alert_id: str) -> Optional[Alert]:
        return db.session.get(Alert, alert_id)

    # ---- Acknowledgement workflow ---------------------------------------

    @classmethod
    def acknowledge(
        cls,
        alert: Alert,
        *,
        step: int,
        actor_id: str,
        note: Optional[str] = None,
        publish_to_team: bool = False,
        department_id: Optional[str] = None,
    ) -> Alert:
        """
        Advance the alert state machine by one step.

        Args:
            step: 1 (Seen), 2 (Contacted), 3 (Closed)
            actor_id: the manager performing the action
            note: required if step == 3, otherwise optional
            publish_to_team: if True on step 3, create a TeamUpdate from the note
            department_id: required if publish_to_team is True

        Raises:
            AlertWorkflowError on invalid transition or missing note.
        """
        if step not in (1, 2, 3):
            raise AlertWorkflowError(
                f"step must be 1 (Seen), 2 (Contacted), or 3 (Closed); got {step}"
            )

        now = utcnow()

        if step == 1:
            if alert.status != "open":
                raise AlertWorkflowError(
                    f"step 1 (Seen) requires status=open, but status={alert.status}"
                )
            alert.status = "ack1"
            alert.ack_at = now
            alert.ack_by = actor_id

        elif step == 2:
            if alert.status != "ack1":
                raise AlertWorkflowError(
                    f"step 2 (Contacted) requires status=ack1, but status={alert.status}"
                )
            alert.status = "ack2"
            alert.contacted_at = now

        elif step == 3:
            if alert.status != "ack2":
                raise AlertWorkflowError(
                    f"step 3 (Closed) requires status=ack2, but status={alert.status}"
                )
            if not note or not note.strip():
                raise AlertWorkflowError("a closure note is required for step 3")
            alert.status = "closed"
            alert.closed_at = now
            alert.closure_note = note.strip()

            # Optionally publish the closure note as a team update
            if publish_to_team:
                if not department_id:
                    raise AlertWorkflowError(
                        "department_id is required when publishing to team"
                    )
                team_update = TeamUpdate(
                    author_id=actor_id,
                    department_id=department_id,
                    content=note.strip(),
                    published_at=now,
                )
                db.session.add(team_update)
                db.session.flush()
                alert.team_update_id = team_update.update_id
                alert.closure_published = True

        db.session.flush()
        return alert

    # ---- Unpublished closures (C8 screen) --------------------------------

    @staticmethod
    def list_unpublished_closures(
        days: int = 14,
        limit: int = 50,
        department_id: Optional[str] = None,
    ) -> list[Alert]:
        """
        List closed alerts that were NOT published as team updates.
        Used by C8 screen for Mehva admin escalation review.
        """
        from datetime import timedelta
        cutoff = utcnow() - timedelta(days=days)
        q = (
            db.session.query(Alert)
            .filter(
                Alert.status == "closed",
                Alert.closure_published.is_(False),
                Alert.closed_at >= cutoff,
            )
        )
        if department_id:
            q = q.join(CheckIn, Alert.check_in_id == CheckIn.check_in_id).filter(
                CheckIn.department_id == department_id
            )
        return q.order_by(Alert.closed_at.desc()).limit(limit).all()

    @staticmethod
    def list_published_closures(
        days: int = 14,
        limit: int = 50,
        department_id: Optional[str] = None,
    ) -> list[Alert]:
        """List closed alerts that WERE published as team updates."""
        from datetime import timedelta
        cutoff = utcnow() - timedelta(days=days)
        q = (
            db.session.query(Alert)
            .filter(
                Alert.status == "closed",
                Alert.closure_published.is_(True),
                Alert.closed_at >= cutoff,
            )
        )
        if department_id:
            q = q.join(CheckIn, Alert.check_in_id == CheckIn.check_in_id).filter(
                CheckIn.department_id == department_id
            )
        return q.order_by(Alert.closed_at.desc()).limit(limit).all()

    @classmethod
    def publish_closure(
        cls,
        alert: Alert,
        *,
        actor_id: str,
        department_id: str,
        content: Optional[str] = None,
    ) -> Alert:
        """
        Retroactively publish a closed alert's note as a team update.
        Used from C8 when manager decides to publish after initial closure.
        """
        if alert.status != "closed":
            raise AlertWorkflowError("Only closed alerts can be published")
        if alert.closure_published:
            raise AlertWorkflowError("Alert closure is already published")

        publish_content = content.strip() if content else alert.closure_note
        if not publish_content:
            raise AlertWorkflowError("No content to publish")

        now = utcnow()
        team_update = TeamUpdate(
            author_id=actor_id,
            department_id=department_id,
            content=publish_content,
            published_at=now,
        )
        db.session.add(team_update)
        db.session.flush()

        alert.team_update_id = team_update.update_id
        alert.closure_published = True
        db.session.flush()
        return alert
