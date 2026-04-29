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

    data = DashboardService.summary(
        period_days=period_days,
        department_id=department_id,
    )

    user = current_user()
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
