"""
Manager dashboard endpoints.

GET /api/v1/dashboard/summary
    Query params:
        period: int (days, default 7)
        departmentId: optional filter

    Returns:
        Summary KPIs with ≥5 aggregation enforced on per-role breakdown.

Auth: requires role manager / admin.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.middleware.auth import current_user, role_required
from app.services.audit_service import AuditService
from app.services.dashboard_service import DashboardService

dashboard_bp = Blueprint("dashboard", __name__)


def _parse_period(raw: str | None) -> int:
    """Accept '7', '30', '7d', '30d'. Default 7. Cap at 90."""
    if not raw:
        return 7
    raw = raw.strip().lower().rstrip("d")
    try:
        n = int(raw)
    except ValueError:
        return 7
    if n < 1:
        return 1
    if n > 90:
        return 90
    return n


@dashboard_bp.get("/summary")
@role_required("manager", "admin")
def summary():
    period_days = _parse_period(request.args.get("period"))
    department_id = request.args.get("departmentId") or None

    user = current_user()

    # Department scoping: managers can only see their own department.
    # Admins can see any department or all (no filter).
    if user["role"] == "manager":
        from app.extensions import db as _db
        from app.models.user import User as UserModel
        db_user = _db.session.get(UserModel, user["user_id"])
        manager_dept = db_user.department_id if db_user else None
        if manager_dept:
            # Ignore any client-supplied departmentId — enforce the manager's own
            department_id = manager_dept
        # If manager has no department assigned, allow the request but with
        # whatever was sent (backwards compat for dev mode users).

    data = DashboardService.summary(
        period_days=period_days,
        department_id=department_id,
    )

    AuditService.write(
        actor_id=user["user_id"],
        action="dashboard.summary.read",
        entity_type="dashboard",
        meta={
            "period_days": period_days,
            "department_id": department_id,
            "total_checkins_seen": data["total_checkins"],
        },
    )
    return jsonify(data), 200
