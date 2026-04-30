#!/usr/bin/env python3
"""
Seed script — creates a realistic demo dataset for Wellbeing2.0.

Usage:
    # From backend/ directory:
    python scripts/seed_demo_data.py --days 90
    python scripts/seed_demo_data.py --reset-demo-data --days 90

    # On Railway:
    railway run -s backend -e production python scripts/seed_demo_data.py --reset-demo-data --days 90

Creates:
  - 3 departments
  - 30 users (1 admin + 3 managers + 26 caregivers)
  - Dozens of check-ins per user over 90 days
  - Alerts at various workflow stages
  - Team updates per department
  - Consent records for all users

Idempotent: uses stable user_ids, re-running upserts users and adds data.
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app
from app.extensions import db
from app.models.alert import Alert
from app.models.checkin import CheckIn
from app.models.consent_log import ConsentLog
from app.models.team_update import TeamUpdate
from app.models.user import User
from app.models import gen_uuid, utcnow
from app.utils.anon_token import generate_anon_token


# ─── Configuration ──────────────────────────────────────────────────────────

DEPARTMENTS = [
    {"id": "dept-internal-a", "name": "Internal Medicine A"},
    {"id": "dept-er",         "name": "Emergency Department"},
    {"id": "dept-pediatrics", "name": "Pediatric Ward"},
]

DEPT_IDS = [d["id"] for d in DEPARTMENTS]

# ─── Users (30 total) ──────────────────────────────────────────────────────
#  1  admin (super-admin, no department)
#  3  managers (one per department)
# 26  employees/caregivers (~8-9 per department)

DEMO_USERS: list[dict] = [
    # Super admin
    {
        "user_id": "demo-superadmin",
        "display_name": "Admin Demo",
        "role": "admin",
        "department_id": None,
        "contact_email": "superadmin@demo.local",
    },
    # ── Department managers ──
    {
        "user_id": "demo-mgr-internal-a",
        "display_name": "Rivka Segal",
        "role": "manager",
        "department_id": "dept-internal-a",
        "contact_email": "manager.internal@demo.local",
    },
    {
        "user_id": "demo-mgr-er",
        "display_name": "Yossi Levi",
        "role": "manager",
        "department_id": "dept-er",
        "contact_email": "manager.er@demo.local",
    },
    {
        "user_id": "demo-mgr-pediatrics",
        "display_name": "Dana Cohen",
        "role": "manager",
        "department_id": "dept-pediatrics",
        "contact_email": "manager.pediatrics@demo.local",
    },
]

# Caregivers: 9 for Internal, 9 for ER, 8 for Pediatrics = 26
_CAREGIVER_NAMES = {
    "dept-internal-a": [
        ("Noa", "Peretz"),   ("Yael", "Mizrachi"), ("Sarah", "Avraham"),
        ("Rachel", "David"), ("Michal", "Biton"),   ("Orit", "Alon"),
        ("Hila", "Barak"),   ("Tamar", "Golan"),    ("Liat", "Shemesh"),
    ],
    "dept-er": [
        ("Adi", "Vardi"),    ("Mor", "Haim"),       ("Shira", "Yosef"),
        ("Ronit", "Nahum"),  ("Galit", "Katz"),     ("Efrat", "Shapira"),
        ("Orna", "Dahan"),   ("Merav", "Ben-David"), ("Keren", "Levi"),
    ],
    "dept-pediatrics": [
        ("Tali", "Cohen"),   ("Inbar", "Fridman"),  ("Maya", "Oz"),
        ("Nofar", "Gal"),    ("Sapir", "Oren"),     ("Ayala", "Moshe"),
        ("Lihi", "Shalom"),  ("Roni", "Tzur"),
    ],
}

for dept_id, names in _CAREGIVER_NAMES.items():
    slug = dept_id.replace("dept-", "")
    for i, (first, last) in enumerate(names):
        DEMO_USERS.append({
            "user_id": f"demo-{slug}-{i:02d}",
            "display_name": f"{first} {last}",
            "role": "employee",
            "department_id": dept_id,
            "contact_email": f"{first.lower()}.{last.lower()}@demo.local",
        })

assert len(DEMO_USERS) == 30, f"Expected 30 users, got {len(DEMO_USERS)}"

# ─── Team update templates ──────────────────────────────────────────────────

TEAM_UPDATES_HE = [
    "We reinforced the evening shift following workload reports this week.",
    "Break schedule updated: 20 min break guaranteed every shift.",
    "Request to reduce documentation burden is being reviewed. Will update.",
    "Team debrief held after high-stress reports. Thank you for honesty.",
    "Social worker now available during morning shifts -- feel free to reach out.",
    "Rest room renovation approved. Work starts next week.",
    "We noticed lower energy on Wednesdays -- reviewing shift rotation.",
    "Monthly team meeting set for Tuesday. We will discuss what the reports show.",
    "Two additional nurses joining the rotation starting next month.",
    "Feedback from last week: schedule adjusted to reduce back-to-back night shifts.",
]

CLOSURE_NOTES = [
    "Spoke privately, scheduled follow-up meeting",
    "Referred to social worker",
    "Team-wide intervention via team update",
    "Conversation with the staff member. Situation improved.",
    "Shift change made in response to the report.",
    "Manager check-in completed. No further action needed.",
    "Discussed with head nurse, workload redistributed.",
]


def _energy_for(day_offset: int, user_seed: int) -> int:
    """Realistic energy: weekly cycle + individual variance + noise."""
    base = 55 + 15 * math.sin(day_offset * 0.9 + user_seed * 0.7)
    dow = (date.today() - timedelta(days=day_offset)).weekday()
    dow_fx = {0: 3, 1: 0, 2: -5, 3: -8, 4: -3, 5: 5, 6: 8}.get(dow, 0)
    noise = random.gauss(0, 12)
    return max(5, min(95, int(base + dow_fx + noise)))


# ─── Reset ──────────────────────────────────────────────────────────────────

def reset_demo_data():
    """Delete all demo records (safe: only touches demo-prefixed IDs and dept-* departments)."""
    print("Resetting demo data...")

    demo_checkin_ids = [
        row[0] for row in
        db.session.query(CheckIn.check_in_id)
        .filter(CheckIn.department_id.in_(DEPT_IDS))
        .all()
    ]
    if demo_checkin_ids:
        # Batch delete in chunks to avoid parameter limits
        for chunk_start in range(0, len(demo_checkin_ids), 500):
            chunk = demo_checkin_ids[chunk_start:chunk_start + 500]
            db.session.query(Alert).filter(
                Alert.check_in_id.in_(chunk)
            ).delete(synchronize_session=False)
        db.session.flush()

    db.session.query(CheckIn).filter(
        CheckIn.department_id.in_(DEPT_IDS)
    ).delete(synchronize_session=False)

    db.session.query(TeamUpdate).filter(
        TeamUpdate.department_id.in_(DEPT_IDS)
    ).delete(synchronize_session=False)

    demo_ids = [u["user_id"] for u in DEMO_USERS]
    db.session.query(ConsentLog).filter(
        ConsentLog.user_id.in_(demo_ids)
    ).delete(synchronize_session=False)

    db.session.query(User).filter(
        User.user_id.in_(demo_ids)
    ).delete(synchronize_session=False)

    db.session.commit()
    print("  Done.")


# ─── Seed functions ─────────────────────────────────────────────────────────

def seed_users():
    print(f"Seeding {len(DEMO_USERS)} users...")
    for u in DEMO_USERS:
        existing = db.session.get(User, u["user_id"])
        if existing:
            existing.display_name = u["display_name"]
            existing.role = u["role"]
            existing.department_id = u["department_id"]
            existing.contact_email = u["contact_email"]
            existing.is_active = True
        else:
            db.session.add(User(
                user_id=u["user_id"],
                display_name=u["display_name"],
                role=u["role"],
                department_id=u["department_id"],
                contact_email=u["contact_email"],
                is_active=True,
            ))
    db.session.commit()
    print(f"  {len(DEMO_USERS)} users ready.")


def seed_consent():
    print("Seeding consent records...")
    now = utcnow()
    added = 0
    for u in DEMO_USERS:
        exists = db.session.query(ConsentLog).filter_by(
            user_id=u["user_id"], version="1.0"
        ).first()
        if not exists:
            db.session.add(ConsentLog(
                user_id=u["user_id"],
                version="1.0",
                consent_at=now - timedelta(days=120),
                method="import",
            ))
            usr = db.session.get(User, u["user_id"])
            if usr:
                usr.consent_at = now - timedelta(days=120)
            added += 1
    db.session.commit()
    print(f"  {added} new consent records.")


def seed_checkins(days: int):
    """Generate check-ins: each employee reports most days -> dozens per user."""
    print(f"Seeding check-ins over {days} days...")
    today = date.today()
    salt = "demo-seed-salt-long-enough-for-validation"

    employees_by_dept: dict[str, list[dict]] = {}
    for dept_id in DEPT_IDS:
        employees_by_dept[dept_id] = [
            u for u in DEMO_USERS
            if u["department_id"] == dept_id and u["role"] in ("employee", "social_worker")
        ]

    total_checkins = 0
    total_alerts = 0

    for day_offset in range(days, 0, -1):
        report_date = today - timedelta(days=day_offset)

        for dept_id in DEPT_IDS:
            emps = employees_by_dept[dept_id]
            if not emps:
                continue

            # 70-95% of employees report each workday, 40-60% on weekends
            is_weekend = report_date.weekday() >= 5
            rate = random.uniform(0.40, 0.60) if is_weekend else random.uniform(0.70, 0.95)
            k = max(3, int(len(emps) * rate))
            reporters = random.sample(emps, k=min(k, len(emps)))

            for emp in reporters:
                energy = _energy_for(day_offset, hash(emp["user_id"]))
                is_anon = random.random() < 0.65

                ts = datetime.combine(report_date, datetime.min.time()) + timedelta(
                    hours=random.randint(6, 21),
                    minutes=random.randint(0, 59),
                )

                if is_anon:
                    token = generate_anon_token(emp["user_id"], report_date, salt)
                    ci = CheckIn(
                        user_id=None,
                        anon_token=token,
                        energy=energy,
                        department_id=dept_id,
                        source="web",
                    )
                else:
                    ci = CheckIn(
                        user_id=emp["user_id"],
                        energy=energy,
                        department_id=dept_id,
                        source="web",
                    )

                # Follow-up questions ~35%
                if random.random() < 0.35:
                    ci.support_q = random.choice([True, True, False])
                if random.random() < 0.35:
                    ci.workload_q = random.choice([True, False, False])

                ci.created_at = ts
                ci.updated_at = ts
                db.session.add(ci)
                db.session.flush()

                # Alerts for extreme energy
                if energy < 25:
                    a = Alert(check_in_id=ci.check_in_id, type="low", status="open")
                    a.created_at = ts
                    db.session.add(a)
                    total_alerts += 1
                elif energy > 85:
                    a = Alert(check_in_id=ci.check_in_id, type="high", status="open")
                    a.created_at = ts
                    db.session.add(a)
                    total_alerts += 1

                total_checkins += 1

        # Batch commit every 10 days
        if day_offset % 10 == 0:
            db.session.commit()

    db.session.commit()
    print(f"  {total_checkins} check-ins created.")
    print(f"  {total_alerts} alerts generated.")


def seed_alert_workflow():
    """Walk open alerts through the ack state machine to get a realistic distribution."""
    print("Processing alert workflow stages...")
    all_open = db.session.query(Alert).filter(Alert.status == "open").order_by(Alert.created_at).all()
    if not all_open:
        print("  No open alerts.")
        return

    random.shuffle(all_open)
    stats = {"open": 0, "ack1": 0, "ack2": 0, "closed": 0, "published": 0}

    for i, alert in enumerate(all_open):
        # Leave ~30% open
        if i >= len(all_open) * 0.70:
            stats["open"] += 1
            continue

        ci = db.session.get(CheckIn, alert.check_in_id)
        if not ci or not ci.department_id:
            stats["open"] += 1
            continue

        mgr_id = f"demo-mgr-{ci.department_id.replace('dept-', '')}"

        # Step 1: Seen
        alert.status = "ack1"
        alert.ack_at = alert.created_at + timedelta(hours=random.randint(1, 18))
        alert.ack_by = mgr_id
        stats["ack1"] += 1

        if random.random() < 0.85:
            # Step 2: Contacted
            alert.status = "ack2"
            alert.contacted_at = alert.ack_at + timedelta(hours=random.randint(1, 36))
            stats["ack1"] -= 1
            stats["ack2"] += 1

            if random.random() < 0.75:
                # Step 3: Closed
                alert.status = "closed"
                alert.closed_at = alert.contacted_at + timedelta(hours=random.randint(1, 48))
                alert.closure_note = random.choice(CLOSURE_NOTES)
                stats["ack2"] -= 1
                stats["closed"] += 1

                # ~50% of closed alerts also get published as team update
                if random.random() < 0.50:
                    tu = TeamUpdate(
                        author_id=mgr_id,
                        department_id=ci.department_id,
                        content=alert.closure_note,
                        published_at=alert.closed_at + timedelta(hours=random.randint(1, 12)),
                        is_active=True,
                    )
                    tu.created_at = alert.closed_at
                    db.session.add(tu)
                    db.session.flush()
                    alert.team_update_id = tu.update_id
                    alert.closure_published = True
                    stats["published"] += 1

    db.session.commit()
    print(f"  Alert distribution: {stats}")


def seed_team_updates():
    """Create standalone team updates (beyond those linked to alert closures)."""
    print("Seeding team updates...")
    now = utcnow()
    count = 0

    for dept in DEPARTMENTS:
        slug = dept["id"].replace("dept-", "")
        mgr_id = f"demo-mgr-{slug}"

        for i in range(6):
            days_ago = (8 - i) * 10 + random.randint(0, 5)
            pub_at = now - timedelta(days=days_ago)
            content = TEAM_UPDATES_HE[i % len(TEAM_UPDATES_HE)]

            tu = TeamUpdate(
                author_id=mgr_id,
                department_id=dept["id"],
                content=content,
                published_at=pub_at,
                is_active=True,
            )
            tu.created_at = pub_at - timedelta(hours=2)
            tu.updated_at = pub_at
            db.session.add(tu)
            count += 1

    db.session.commit()
    print(f"  {count} standalone team updates created.")


# ─── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed Wellbeing2.0 demo data")
    parser.add_argument("--reset-demo-data", action="store_true",
                        help="Delete existing demo data before seeding")
    parser.add_argument("--days", type=int, default=90,
                        help="Days of historical check-in data (default: 90)")
    args = parser.parse_args()

    app = create_app()

    with app.app_context():
        db.create_all()

        if args.reset_demo_data:
            reset_demo_data()

        seed_users()
        seed_consent()
        seed_checkins(args.days)
        seed_alert_workflow()
        seed_team_updates()

        # ── Summary ──
        n_users = db.session.query(User).filter(User.user_id.like("demo-%")).count()
        n_checkins = db.session.query(CheckIn).filter(CheckIn.department_id.in_(DEPT_IDS)).count()
        n_alerts = db.session.query(Alert).count()
        n_updates = db.session.query(TeamUpdate).filter(TeamUpdate.department_id.in_(DEPT_IDS)).count()

        # Per-user check-in count
        emp_users = [u for u in DEMO_USERS if u["role"] == "employee"]
        if emp_users and n_checkins > 0:
            avg_per_user = n_checkins / len(emp_users)
        else:
            avg_per_user = 0

        print("\n=== Seed Summary ===")
        print(f"  Departments:         {len(DEPARTMENTS)}")
        print(f"  Users:               {n_users}")
        print(f"  Check-ins:           {n_checkins}")
        print(f"  Avg check-ins/user:  {avg_per_user:.0f}")
        print(f"  Alerts:              {n_alerts}")
        print(f"  Team Updates:        {n_updates}")
        print("====================")
        print("\nDemo login users:")
        print("  Admin:    demo-superadmin (superadmin@demo.local)")
        print("  Mgr Int:  demo-mgr-internal-a (manager.internal@demo.local)")
        print("  Mgr ER:   demo-mgr-er (manager.er@demo.local)")
        print("  Mgr Ped:  demo-mgr-pediatrics (manager.pediatrics@demo.local)")
        print("  Employee: demo-internal-a-00 (noa.peretz@demo.local)")
        print("  Employee: demo-er-00 (adi.vardi@demo.local)")


if __name__ == "__main__":
    main()
