"""
Admin API — organization, users, departments, policies, stats, audit, export.

All endpoints require role=admin.
"""

from __future__ import annotations

import csv
import io
from datetime import timedelta

from flask import Blueprint, Response, current_app, jsonify, request

from app.extensions import db
from app.middleware.auth import current_user, role_required
from app.models import utcnow
from app.models.alert import Alert
from app.models.audit import AuditLog
from app.models.checkin import CheckIn
from app.models.consent_log import ConsentLog
from app.models.organization import Department, Organization
from app.models.policy import PolicySetting
from app.models.team_update import TeamUpdate
from app.models.user import User
from app.services.audit_service import AuditService

admin_bp = Blueprint("admin", __name__)


# ─── Organization ───────────────────────────────────────────────────────

@admin_bp.get("/organization")
@role_required("admin")
def get_organization():
    org = db.session.query(Organization).filter_by(is_active=True).first()
    return jsonify({"organization": org.to_dict() if org else None}), 200


@admin_bp.put("/organization")
@role_required("admin")
def update_organization():
    payload = request.get_json(silent=True) or {}
    org = db.session.query(Organization).filter_by(is_active=True).first()
    if not org:
        org = Organization(name=payload.get("name", "My Hospital"))
        db.session.add(org)

    for field in ("name", "logo_url", "address", "phone", "email", "timezone"):
        if field in payload:
            setattr(org, field, payload[field])

    user = current_user()
    AuditService.write(
        actor_id=user["user_id"], action="admin.org.update",
        entity_type="organization", entity_id=org.org_id, commit=False,
    )
    db.session.commit()
    return jsonify({"organization": org.to_dict()}), 200


# ─── Departments ────────────────────────────────────────────────────────

@admin_bp.get("/departments")
@role_required("admin")
def list_departments():
    depts = db.session.query(Department).order_by(Department.name).all()
    return jsonify({"items": [d.to_dict() for d in depts], "total": len(depts)}), 200


@admin_bp.post("/departments")
@role_required("admin")
def create_department():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    slug = (payload.get("slug") or "").strip().lower()
    if not name or not slug:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "name and slug are required"}}), 400
    if db.session.query(Department).filter_by(slug=slug).first():
        return jsonify({"error": {"code": "DUPLICATE", "message": "slug already exists"}}), 409

    org = db.session.query(Organization).filter_by(is_active=True).first()
    dept = Department(name=name, slug=slug, org_id=org.org_id if org else None)
    db.session.add(dept)

    user = current_user()
    AuditService.write(
        actor_id=user["user_id"], action="admin.dept.create",
        entity_type="department", meta={"name": name, "slug": slug}, commit=False,
    )
    db.session.commit()
    return jsonify(dept.to_dict()), 201


@admin_bp.patch("/departments/<dept_id>")
@role_required("admin")
def update_department(dept_id: str):
    dept = db.session.get(Department, dept_id)
    if not dept:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "department not found"}}), 404

    payload = request.get_json(silent=True) or {}
    if "name" in payload:
        dept.name = payload["name"]
    if "is_active" in payload:
        dept.is_active = bool(payload["is_active"])

    user = current_user()
    AuditService.write(
        actor_id=user["user_id"], action="admin.dept.update",
        entity_type="department", entity_id=dept_id, commit=False,
    )
    db.session.commit()
    return jsonify(dept.to_dict()), 200


# ─── User Management ───────────────────────────────────────────────────

@admin_bp.get("/users")
@role_required("admin")
def list_users():
    q = db.session.query(User)
    # Filters
    role = request.args.get("role")
    dept = request.args.get("departmentId")
    status = request.args.get("status")
    search = request.args.get("search", "").strip()

    if role:
        q = q.filter(User.role == role)
    if dept:
        q = q.filter(User.department_id == dept)
    if status == "active":
        q = q.filter(User.is_active.is_(True))
    elif status == "inactive":
        q = q.filter(User.is_active.is_(False))
    if search:
        q = q.filter(User.display_name.ilike(f"%{search}%"))

    users = q.order_by(User.display_name).all()
    return jsonify({
        "items": [u.to_dict() for u in users],
        "total": len(users),
    }), 200


@admin_bp.post("/users")
@role_required("admin")
def create_user():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("displayName") or "").strip()
    email = (payload.get("email") or "").strip()
    role = payload.get("role", "employee")
    dept_id = payload.get("departmentId")

    if not name or len(name) < 2:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "displayName is required (min 2 chars)"}}), 400
    if role not in User.ROLES:
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": f"role must be one of {User.ROLES}"}}), 400

    new_user = User(
        display_name=name,
        role=role,
        department_id=dept_id,
        contact_email=email or None,
        is_active=True,
    )
    db.session.add(new_user)

    actor = current_user()
    AuditService.write(
        actor_id=actor["user_id"], action="admin.user.create",
        entity_type="user", entity_id=new_user.user_id,
        meta={"role": role, "department_id": dept_id}, commit=False,
    )
    db.session.commit()
    return jsonify({"user": new_user.to_dict()}), 201


@admin_bp.patch("/users/<user_id>")
@role_required("admin")
def update_user(user_id: str):
    target = db.session.get(User, user_id)
    if not target:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "user not found"}}), 404

    payload = request.get_json(silent=True) or {}
    if "displayName" in payload:
        target.display_name = payload["displayName"]
    if "role" in payload and payload["role"] in User.ROLES:
        target.role = payload["role"]
    if "departmentId" in payload:
        target.department_id = payload["departmentId"]
    if "isActive" in payload:
        target.is_active = bool(payload["isActive"])

    actor = current_user()
    AuditService.write(
        actor_id=actor["user_id"], action="admin.user.update",
        entity_type="user", entity_id=user_id, commit=False,
    )
    db.session.commit()
    return jsonify({"user": target.to_dict()}), 200


@admin_bp.post("/users/<user_id>/reset-consent")
@role_required("admin")
def reset_consent(user_id: str):
    target = db.session.get(User, user_id)
    if not target:
        return jsonify({"error": {"code": "NOT_FOUND", "message": "user not found"}}), 404

    target.consent_at = None
    actor = current_user()
    AuditService.write(
        actor_id=actor["user_id"], action="admin.user.reset_consent",
        entity_type="user", entity_id=user_id, commit=False,
    )
    db.session.commit()
    return jsonify({"status": "consent_reset"}), 200


# ─── Policies ───────────────────────────────────────────────────────────

DEFAULT_POLICIES = {
    "alert_threshold_low": {"value": "25", "description": "Energy below this triggers a low alert"},
    "alert_threshold_high": {"value": "85", "description": "Energy above this triggers a high alert"},
    "aggregation_threshold": {"value": "5", "description": "Minimum reports to show role breakdown"},
    "anonymity_policy": {"value": "user_choice", "description": "always_anonymous / always_identified / user_choice"},
    "session_timeout_minutes": {"value": "15", "description": "JWT access token lifetime in minutes"},
    "rate_limit_per_minute": {"value": "60", "description": "Max requests per user per minute"},
}


@admin_bp.get("/policies")
@role_required("admin")
def get_policies():
    stored = {s.key: s for s in db.session.query(PolicySetting).all()}
    result = []
    for key, defaults in DEFAULT_POLICIES.items():
        if key in stored:
            result.append(stored[key].to_dict())
        else:
            result.append({"key": key, "value": defaults["value"], "description": defaults["description"], "updated_at": None})
    return jsonify({"policies": result}), 200


@admin_bp.put("/policies")
@role_required("admin")
def update_policies():
    payload = request.get_json(silent=True) or {}
    policies = payload.get("policies", {})
    user = current_user()

    for key, value in policies.items():
        if key not in DEFAULT_POLICIES:
            continue
        existing = db.session.query(PolicySetting).filter_by(key=key).first()
        if existing:
            existing.value = str(value)
            existing.updated_by = user["user_id"]
        else:
            db.session.add(PolicySetting(
                key=key, value=str(value),
                description=DEFAULT_POLICIES[key]["description"],
                updated_by=user["user_id"],
            ))

    AuditService.write(
        actor_id=user["user_id"], action="admin.policies.update",
        entity_type="policy", meta={"keys": list(policies.keys())}, commit=False,
    )
    db.session.commit()
    return get_policies()


# ─── Stats ──────────────────────────────────────────────────────────────

@admin_bp.get("/stats")
@role_required("admin")
def system_stats():
    now = utcnow()
    week_ago = now - timedelta(days=7)

    total_users = db.session.query(User).filter(User.is_active.is_(True), User.user_id != "00000000-0000-0000-0000-000000000000").count()
    total_checkins = db.session.query(CheckIn).count()
    checkins_7d = db.session.query(CheckIn).filter(CheckIn.created_at >= week_ago).count()
    open_alerts = db.session.query(Alert).filter(Alert.status == "open").count()
    closed_alerts = db.session.query(Alert).filter(Alert.status == "closed").count()
    total_updates = db.session.query(TeamUpdate).filter(TeamUpdate.is_active.is_(True)).count()
    consented = db.session.query(User).filter(User.consent_at.isnot(None), User.is_active.is_(True)).count()

    # Per-department breakdown
    dept_stats = []
    depts = db.session.query(Department).filter_by(is_active=True).all()
    for dept in depts:
        ci_count = db.session.query(CheckIn).filter(CheckIn.department_id == dept.slug).count()
        user_count = db.session.query(User).filter(User.department_id == dept.slug, User.is_active.is_(True)).count()
        dept_stats.append({
            "dept_id": dept.dept_id,
            "slug": dept.slug,
            "name": dept.name,
            "users": user_count,
            "checkins": ci_count,
        })

    # Also check legacy dept-* IDs from seed data
    if not dept_stats:
        from sqlalchemy import func
        legacy = (
            db.session.query(User.department_id, func.count(User.user_id))
            .filter(User.is_active.is_(True), User.department_id.isnot(None))
            .group_by(User.department_id)
            .all()
        )
        for dept_id, count in legacy:
            ci_count = db.session.query(CheckIn).filter(CheckIn.department_id == dept_id).count()
            dept_stats.append({"dept_id": dept_id, "slug": dept_id, "name": dept_id, "users": count, "checkins": ci_count})

    return jsonify({
        "total_users": total_users,
        "total_checkins": total_checkins,
        "checkins_7d": checkins_7d,
        "open_alerts": open_alerts,
        "closed_alerts": closed_alerts,
        "total_updates": total_updates,
        "consented_users": consented,
        "departments": dept_stats,
    }), 200


# ─── Audit Log ──────────────────────────────────────────────────────────

@admin_bp.get("/audit-log")
@role_required("admin")
def get_audit_log():
    limit = min(int(request.args.get("limit", 20)), 100)
    entries = (
        db.session.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return jsonify({
        "items": [e.to_dict() for e in entries],
        "total": len(entries),
    }), 200


# ─── Comparative Dashboard ──────────────────────────────────────────────

@admin_bp.get("/compare-departments")
@role_required("admin")
def compare_departments():
    """Cross-department comparison: avg energy, participation, alerts per dept."""
    import statistics
    from datetime import timedelta

    period = min(int(request.args.get("period", 30)), 90)
    now = utcnow()
    cutoff = now - timedelta(days=period)

    # Get all departments with data
    from sqlalchemy import func
    dept_ids = [
        row[0] for row in
        db.session.query(CheckIn.department_id)
        .filter(CheckIn.department_id.isnot(None), CheckIn.created_at >= cutoff)
        .group_by(CheckIn.department_id)
        .all()
    ]

    results = []
    for dept_id in dept_ids:
        checkins = db.session.query(CheckIn).filter(
            CheckIn.department_id == dept_id,
            CheckIn.created_at >= cutoff,
        ).all()
        energies = [c.energy for c in checkins]
        avg_energy = round(statistics.fmean(energies), 1) if energies else None

        user_count = db.session.query(User).filter(
            User.department_id == dept_id, User.is_active.is_(True)
        ).count()
        reporters = len({c.user_id for c in checkins if c.user_id} | {c.anon_token for c in checkins if c.anon_token})
        rate = round(reporters / max(user_count, 1), 3)

        open_alerts = db.session.query(Alert).join(
            CheckIn, Alert.check_in_id == CheckIn.check_in_id
        ).filter(
            CheckIn.department_id == dept_id, Alert.status == "open"
        ).count()

        needs_talk = sum(1 for c in checkins if c.needs_talk)

        # Try to get department name from departments table
        dept_obj = db.session.query(Department).filter_by(slug=dept_id).first()
        dept_name = dept_obj.name if dept_obj else dept_id

        results.append({
            "dept_id": dept_id,
            "name": dept_name,
            "avg_energy": avg_energy,
            "total_checkins": len(checkins),
            "reporting_rate": rate,
            "user_count": user_count,
            "open_alerts": open_alerts,
            "needs_talk": needs_talk,
        })

    # Sort by avg_energy ascending (worst first)
    results.sort(key=lambda d: d["avg_energy"] or 999)

    return jsonify({"departments": results, "period_days": period}), 200


# ─── System Info ────────────────────────────────────────────────────────

@admin_bp.get("/system-info")
@role_required("admin")
def system_info():
    consent_version = "1.0"
    consented = db.session.query(ConsentLog).filter_by(version=consent_version).count()
    total_users = db.session.query(User).filter(User.is_active.is_(True)).count()

    return jsonify({
        "version": current_app.config.get("VERSION", "unknown"),
        "dev_mode": current_app.config.get("DEV_MODE_ENABLED", False),
        "demo_mode": current_app.config.get("DEMO_MODE_ENABLED", False),
        "consent_version": consent_version,
        "consented_users": consented,
        "total_users": total_users,
        "cors_origins": current_app.config.get("CORS_ORIGINS", []),
        "anonymity_policy": current_app.config.get("DEFAULT_ANONYMITY_POLICY", "user_choice"),
    }), 200


# ─── Data Export ────────────────────────────────────────────────────────

@admin_bp.get("/export/<export_type>")
@role_required("admin")
def export_data(export_type: str):
    if export_type not in ("checkins", "users", "alerts"):
        return jsonify({"error": {"code": "VALIDATION_ERROR", "message": "type must be checkins, users, or alerts"}}), 400

    output = io.StringIO()
    writer = csv.writer(output)

    if export_type == "users":
        writer.writerow(["user_id", "display_name", "role", "department_id", "is_active", "consent_at", "created_at"])
        for u in db.session.query(User).order_by(User.display_name).all():
            writer.writerow([u.user_id, u.display_name, u.role, u.department_id or "", u.is_active,
                             u.consent_at.isoformat() if u.consent_at else "", u.created_at.isoformat() if u.created_at else ""])

    elif export_type == "checkins":
        writer.writerow(["check_in_id", "energy", "is_anonymous", "department_id", "support_q", "workload_q", "created_at"])
        for ci in db.session.query(CheckIn).order_by(CheckIn.created_at.desc()).limit(5000).all():
            writer.writerow([ci.check_in_id, ci.energy, ci.is_anonymous, ci.department_id or "",
                             ci.support_q, ci.workload_q, ci.created_at.isoformat() if ci.created_at else ""])

    elif export_type == "alerts":
        writer.writerow(["alert_id", "type", "status", "department_id", "closure_note", "closure_published", "created_at", "closed_at"])
        for a in db.session.query(Alert).order_by(Alert.created_at.desc()).limit(2000).all():
            ci = db.session.get(CheckIn, a.check_in_id)
            dept = ci.department_id if ci else ""
            writer.writerow([a.alert_id, a.type, a.status, dept, a.closure_note or "",
                             a.closure_published, a.created_at.isoformat() if a.created_at else "",
                             a.closed_at.isoformat() if a.closed_at else ""])

    user = current_user()
    AuditService.write(
        actor_id=user["user_id"], action=f"admin.export.{export_type}",
        entity_type="export", meta={"type": export_type},
    )

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=wellbeing_{export_type}.csv"},
    )


# ─── Weekly Summary ─────────────────────────────────────────────────────

@admin_bp.get("/weekly-summary")
@role_required("manager", "admin")
def weekly_summary():
    """Generate a text summary of the last 7 days for the manager's department."""
    from app.services.dashboard_service import DashboardService

    user = current_user()
    dept_id = None
    if user["role"] == "manager":
        from app.models.user import User as UserModel
        db_user = db.session.get(UserModel, user["user_id"])
        dept_id = db_user.department_id if db_user else None

    data = DashboardService.summary(period_days=7, department_id=dept_id)

    lines = [
        f"Weekly Summary — {data['period_days']} days",
        f"Total check-ins: {data['total_checkins']}",
        f"Average energy: {data['avg_energy']}",
        f"Participation rate: {round(data['reporting_rate'] * 100)}%",
        f"Open alerts: {data['open_alerts_count']}",
        f"Needs talk: {data.get('needs_talk_count', 0)}",
    ]
    if data.get('prev_avg_energy') is not None:
        delta = round((data['avg_energy'] or 0) - data['prev_avg_energy'], 1)
        lines.append(f"Change vs previous week: {'+' if delta >= 0 else ''}{delta}")

    for rb in data.get('role_breakdown', []):
        if not rb['below_threshold'] and rb['avg'] is not None:
            lines.append(f"  {rb['role']}: {rb['avg']}% ({rb['count']} reports)")

    return jsonify({"summary": "\n".join(lines)}), 200


# ─── Demo Data Reset ───────────────────────────────────────────────────

@admin_bp.post("/reset-demo")
@role_required("admin")
def reset_demo_data():
    """Delete all demo-* prefixed users and dept-* data."""
    demo_checkin_ids = [
        row[0] for row in
        db.session.query(CheckIn.check_in_id)
        .filter(CheckIn.department_id.like("dept-%"))
        .all()
    ]
    if demo_checkin_ids:
        for i in range(0, len(demo_checkin_ids), 500):
            chunk = demo_checkin_ids[i:i + 500]
            db.session.query(Alert).filter(Alert.check_in_id.in_(chunk)).delete(synchronize_session=False)

    db.session.query(CheckIn).filter(CheckIn.department_id.like("dept-%")).delete(synchronize_session=False)
    db.session.query(TeamUpdate).filter(TeamUpdate.department_id.like("dept-%")).delete(synchronize_session=False)
    db.session.query(ConsentLog).filter(ConsentLog.user_id.like("demo-%")).delete(synchronize_session=False)
    db.session.query(User).filter(User.user_id.like("demo-%")).delete(synchronize_session=False)

    user = current_user()
    AuditService.write(
        actor_id=user["user_id"], action="admin.reset_demo",
        entity_type="system", commit=False,
    )
    db.session.commit()
    return jsonify({"status": "demo_data_reset"}), 200
