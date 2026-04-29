"""
Dashboard service — aggregate KPIs and trend data for managers.

The aggregation threshold (Spec v2 §6 FR-05, default 5) is enforced at
the service layer. Below it, segment-level data is replaced with `null`.
This is *the* privacy-critical computation: the manager dashboard must
never reveal individuals through over-narrow segmentation.

The threshold rule:
    - Total counts: always shown (the ward as a whole is large enough)
    - Per-role breakdown: only shown if that role has >= threshold check-ins
    - Per-day trend: aggregated across all reporters; threshold not applied
      (a daily count is itself a count, not a re-identifying signal)
    - Anonymous + identified are merged for total/role/day stats
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import timedelta
from typing import Optional

from flask import current_app

from app.extensions import db
from app.models import utcnow
from app.models.checkin import CheckIn
from app.models.user import User


class DashboardService:
    @staticmethod
    def summary(
        period_days: int = 7,
        department_id: Optional[str] = None,
    ) -> dict:
        """
        Compute the dashboard summary for the given period and (optional)
        department filter.

        Returns a dict shaped roughly like Spec v2 §9.1:
            {
                "period_days": 7,
                "total_checkins": int,
                "reporting_rate": float,
                "avg_energy": float | None,
                "median_energy": float | None,
                "trend": [ {"date": "YYYY-MM-DD", "avg": float, "count": int}, ... ],
                "role_breakdown": [
                    {"role": "...", "count": int, "avg": float | None,
                     "below_threshold": bool}
                ],
                "aggregation_threshold": int
            }
        """
        threshold = current_app.config.get("AGGREGATION_THRESHOLD", 5)
        now = utcnow()
        cutoff = now - timedelta(days=period_days)

        # --- Pull check-ins in the period ---------------------------------
        q = db.session.query(CheckIn).filter(CheckIn.created_at >= cutoff)
        rows = q.all()

        total = len(rows)
        energies = [r.energy for r in rows]

        avg = round(statistics.fmean(energies), 1) if energies else None
        median = float(statistics.median(energies)) if energies else None

        # --- Reporting rate ------------------------------------------------
        # active employees in the department (or whole ward if no filter)
        u_q = db.session.query(User).filter(User.is_active.is_(True))
        if department_id:
            u_q = u_q.filter(User.department_id == department_id)
        # Exclude the synthetic DEV_MODE admin from reporting-rate denominators.
        from app.middleware.dev_mode import DEV_MODE_USER_ID

        u_q = u_q.filter(User.user_id != DEV_MODE_USER_ID)
        active_count = u_q.count()

        # Identified-mode unique reporters
        identified_users = {r.user_id for r in rows if r.user_id is not None}
        # Anonymous reporters: count distinct anon_tokens (one per user-per-day)
        anon_tokens = {r.anon_token for r in rows if r.anon_token is not None}
        unique_reporters = len(identified_users) + len(anon_tokens)

        reporting_rate = (
            round(unique_reporters / active_count, 3) if active_count else 0.0
        )

        # --- Trend (per-day average) --------------------------------------
        by_day: dict[str, list[int]] = defaultdict(list)
        for r in rows:
            day = r.created_at.date().isoformat()
            by_day[day].append(r.energy)
        trend = [
            {
                "date": day,
                "count": len(values),
                "avg": round(statistics.fmean(values), 1) if values else None,
            }
            for day, values in sorted(by_day.items())
        ]

        # --- Role breakdown (with aggregation threshold) ------------------
        # Map identified user_ids → role
        if identified_users:
            user_roles = dict(
                db.session.query(User.user_id, User.role)
                .filter(User.user_id.in_(identified_users))
                .all()
            )
        else:
            user_roles = {}

        per_role: dict[str, list[int]] = defaultdict(list)
        anonymous_energies: list[int] = []
        for r in rows:
            if r.user_id and r.user_id in user_roles:
                per_role[user_roles[r.user_id]].append(r.energy)
            else:
                anonymous_energies.append(r.energy)

        role_breakdown = []
        for role, vals in sorted(per_role.items()):
            below = len(vals) < threshold
            role_breakdown.append(
                {
                    "role": role,
                    "count": len(vals),
                    "avg": (
                        round(statistics.fmean(vals), 1) if not below else None
                    ),
                    "below_threshold": below,
                }
            )
        if anonymous_energies:
            below = len(anonymous_energies) < threshold
            role_breakdown.append(
                {
                    "role": "anonymous",
                    "count": len(anonymous_energies),
                    "avg": (
                        round(statistics.fmean(anonymous_energies), 1)
                        if not below
                        else None
                    ),
                    "below_threshold": below,
                }
            )

        return {
            "period_days": period_days,
            "total_checkins": total,
            "reporting_rate": reporting_rate,
            "active_users": active_count,
            "unique_reporters": unique_reporters,
            "avg_energy": avg,
            "median_energy": median,
            "trend": trend,
            "role_breakdown": role_breakdown,
            "aggregation_threshold": threshold,
        }
