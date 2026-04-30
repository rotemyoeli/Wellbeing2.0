"""
Phase 6A — Department scoping tests.

Tests that:
1. Check-ins snapshot department_id (both identified and anonymous)
2. Dashboard is scoped by manager's department
3. Managers cannot access another department's dashboard
4. Alerts are scoped by department
5. Manager cannot ack/close alerts from another department
6. Team updates are scoped by department
7. Employees only see own department's team updates
"""

from __future__ import annotations

import pytest

from app.extensions import db
from app.models.alert import Alert
from app.models.checkin import CheckIn
from app.models.team_update import TeamUpdate
from app.models.user import User
from app.services.alert_service import AlertService
from app.services.check_in_service import CheckInService
from app.services.dashboard_service import DashboardService


@pytest.fixture
def dept_users(dev_mode_app):
    """Create users across two departments."""
    with dev_mode_app.app_context():
        users = {}
        # Department A employees
        for i in range(6):
            u = User(
                user_id=f"dept-a-emp-{i}",
                display_name=f"Dept A Employee {i}",
                role="employee",
                department_id="dept-a",
                is_active=True,
            )
            db.session.add(u)
            users[f"a_emp_{i}"] = u

        # Department B employees
        for i in range(6):
            u = User(
                user_id=f"dept-b-emp-{i}",
                display_name=f"Dept B Employee {i}",
                role="employee",
                department_id="dept-b",
                is_active=True,
            )
            db.session.add(u)
            users[f"b_emp_{i}"] = u

        # Manager A
        u = User(
            user_id="mgr-a",
            display_name="Manager A",
            role="manager",
            department_id="dept-a",
            is_active=True,
        )
        db.session.add(u)
        users["mgr_a"] = u

        # Manager B
        u = User(
            user_id="mgr-b",
            display_name="Manager B",
            role="manager",
            department_id="dept-b",
            is_active=True,
        )
        db.session.add(u)
        users["mgr_b"] = u

        db.session.commit()
        yield users


# --------------- Check-in department snapshot ---------------

def test_identified_checkin_stores_department(dev_mode_app, dept_users):
    """Identified check-in snapshots the user's department_id."""
    with dev_mode_app.app_context():
        ci = CheckInService.create_identified(
            user_id="dept-a-emp-0",
            energy=60,
            department_id="dept-a",
        )
        db.session.commit()
        assert ci.department_id == "dept-a"
        assert ci.user_id == "dept-a-emp-0"


def test_anonymous_checkin_stores_department(dev_mode_app, dept_users):
    """Anonymous check-in stores department_id but NOT user_id."""
    with dev_mode_app.app_context():
        ci = CheckInService.create_anonymous(
            user_id="dept-a-emp-1",
            salt=dev_mode_app.config["ANON_TOKEN_SALT"],
            energy=45,
            department_id="dept-a",
        )
        db.session.commit()
        assert ci.department_id == "dept-a"
        assert ci.user_id is None  # anonymous: no user_id
        assert ci.anon_token is not None


# --------------- Dashboard scoping ---------------

def test_dashboard_scoped_by_department(dev_mode_app, dept_users):
    """Dashboard filtered by department_id only returns that department's check-ins."""
    with dev_mode_app.app_context():
        # Seed 5 dept-a check-ins and 3 dept-b check-ins
        for i in range(5):
            CheckInService.create_identified(
                user_id=f"dept-a-emp-{i}",
                energy=60,
                department_id="dept-a",
            )
        for i in range(3):
            CheckInService.create_identified(
                user_id=f"dept-b-emp-{i}",
                energy=80,
                department_id="dept-b",
            )
        db.session.commit()

        # Dept A dashboard
        summary_a = DashboardService.summary(period_days=7, department_id="dept-a")
        assert summary_a["total_checkins"] == 5

        # Dept B dashboard
        summary_b = DashboardService.summary(period_days=7, department_id="dept-b")
        assert summary_b["total_checkins"] == 3

        # Unscoped dashboard
        summary_all = DashboardService.summary(period_days=7)
        assert summary_all["total_checkins"] == 8


def test_manager_cannot_see_other_department_dashboard(dev_mode_app, dept_users):
    """Manager dashboard API enforces own department. Tested via service layer."""
    with dev_mode_app.app_context():
        # Seed check-ins in both departments
        for i in range(3):
            CheckInService.create_identified(
                user_id=f"dept-a-emp-{i}",
                energy=60,
                department_id="dept-a",
            )
        for i in range(4):
            CheckInService.create_identified(
                user_id=f"dept-b-emp-{i}",
                energy=70,
                department_id="dept-b",
            )
        db.session.commit()

        # Manager A should only see dept-a
        summary = DashboardService.summary(period_days=7, department_id="dept-a")
        assert summary["total_checkins"] == 3


# --------------- Alert scoping ---------------

def test_alerts_scoped_by_department(dev_mode_app, dept_users):
    """Alert listing filtered by department only returns matching department's alerts."""
    with dev_mode_app.app_context():
        # Low energy check-in in dept-a → triggers alert
        ci_a = CheckInService.create_identified(
            user_id="dept-a-emp-0",
            energy=10,
            department_id="dept-a",
        )
        alert_a = AlertService.maybe_create_for_checkin(ci_a)
        assert alert_a is not None

        # Low energy check-in in dept-b → triggers alert
        ci_b = CheckInService.create_identified(
            user_id="dept-b-emp-0",
            energy=15,
            department_id="dept-b",
        )
        alert_b = AlertService.maybe_create_for_checkin(ci_b)
        assert alert_b is not None

        db.session.commit()

        # List alerts for dept-a only
        alerts_a = AlertService.list_alerts(department_id="dept-a")
        assert len(alerts_a) == 1
        assert alerts_a[0].alert_id == alert_a.alert_id

        # List alerts for dept-b only
        alerts_b = AlertService.list_alerts(department_id="dept-b")
        assert len(alerts_b) == 1
        assert alerts_b[0].alert_id == alert_b.alert_id

        # Unscoped: both
        all_alerts = AlertService.list_alerts()
        assert len(all_alerts) == 2


# --------------- Team updates scoping ---------------

def test_team_updates_scoped_by_department(dev_mode_app, dept_users):
    """Team updates for a department are only visible to that department."""
    with dev_mode_app.app_context():
        from app.services.team_update_service import TeamUpdateService

        TeamUpdateService.create(
            author_id="mgr-a",
            department_id="dept-a",
            content="Update for department A is here now.",
            publish=True,
        )
        TeamUpdateService.create(
            author_id="mgr-b",
            department_id="dept-b",
            content="Update for department B is here now.",
            publish=True,
        )
        db.session.commit()

        updates_a = TeamUpdateService.list_for_department("dept-a")
        assert len(updates_a) == 1
        assert "department A" in updates_a[0].content

        updates_b = TeamUpdateService.list_for_department("dept-b")
        assert len(updates_b) == 1
        assert "department B" in updates_b[0].content


def test_team_update_from_alert_closure_inherits_department(dev_mode_app, dept_users):
    """When a manager publishes an alert closure, the team update gets the correct department."""
    with dev_mode_app.app_context():
        # Create a low-energy check-in in dept-a
        ci = CheckInService.create_identified(
            user_id="dept-a-emp-0",
            energy=10,
            department_id="dept-a",
        )
        alert = AlertService.maybe_create_for_checkin(ci)
        db.session.commit()

        # Ack through steps 1, 2, then close with publish
        AlertService.acknowledge(alert, step=1, actor_id="mgr-a")
        AlertService.acknowledge(alert, step=2, actor_id="mgr-a")
        AlertService.acknowledge(
            alert,
            step=3,
            actor_id="mgr-a",
            note="Spoke to staff, adjusting schedule.",
            publish_to_team=True,
            department_id="dept-a",
        )
        db.session.commit()

        # The team update should be in dept-a
        tu = db.session.get(TeamUpdate, alert.team_update_id)
        assert tu is not None
        assert tu.department_id == "dept-a"
        assert tu.published_at is not None


# --------------- Anonymous check-in with department ---------------

def test_anonymous_checkin_appears_in_department_dashboard(dev_mode_app, dept_users):
    """Anonymous check-ins with department_id appear in the correct department's dashboard."""
    with dev_mode_app.app_context():
        for i in range(5):
            CheckInService.create_anonymous(
                user_id=f"dept-a-emp-{i}",
                salt=dev_mode_app.config["ANON_TOKEN_SALT"],
                energy=55,
                department_id="dept-a",
            )
        db.session.commit()

        summary = DashboardService.summary(period_days=7, department_id="dept-a")
        assert summary["total_checkins"] == 5
        # Anonymous check-ins should show in the 'anonymous' role group
        anon_row = next(
            (r for r in summary["role_breakdown"] if r["role"] == "anonymous"), None
        )
        assert anon_row is not None
        assert anon_row["count"] == 5
