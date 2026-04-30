#!/usr/bin/env python3
"""
Seed script — creates a realistic demo dataset for Wellbeing2.0.

Usage:
    # From backend/ directory:
    python scripts/seed_demo_data.py --days 120
    python scripts/seed_demo_data.py --reset-demo-data --days 120

    # On Railway:
    railway run python scripts/seed_demo_data.py --reset-demo-data --days 120

Idempotent: uses stable user_ids so re-running upserts rather than duplicates.
Demo records are tagged with stable IDs prefixed with 'demo-'.
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# Ensure the backend package is importable
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


# ─── Demo constants ─────────────────────────────────────────────────────────

DEPARTMENTS = [
    {"id": "dept-internal-a", "name": "פנימית א׳", "name_en": "Internal Medicine A"},
    {"id": "dept-er", "name": "מיון", "name_en": "Emergency Department"},
    {"id": "dept-oncology", "name": "אונקולוגיה יום", "name_en": "Oncology Day Care"},
    {"id": "dept-pediatrics", "name": "ילדים", "name_en": "Pediatric Ward"},
]

DEMO_USERS: list[dict] = [
    # Super admin
    {
        "user_id": "demo-superadmin",
        "display_name": "מנהל-על דמו",
        "role": "admin",
        "department_id": None,
        "contact_email": "superadmin@demo.local",
    },
    # Admin
    {
        "user_id": "demo-admin",
        "display_name": "מנהל/ת מערכת",
        "role": "admin",
        "department_id": None,
        "contact_email": "admin@demo.local",
    },
]

# Department managers
for dept in DEPARTMENTS:
    slug = dept["id"].replace("dept-", "")
    DEMO_USERS.append({
        "user_id": f"demo-mgr-{slug}",
        "display_name": f"מנהל/ת {dept['name']}",
        "role": "manager",
        "department_id": dept["id"],
        "contact_email": f"manager.{slug}@demo.local",
    })

# Caregivers — 10 per department
HEBREW_FIRST_NAMES = [
    "נועה", "יעל", "שרה", "רחל", "מיכל", "דנה", "אורית", "הילה",
    "תמר", "ליאת", "עדי", "מור", "שירה", "רונית", "גלית",
]
HEBREW_LAST_NAMES = [
    "כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "דוד",
    "אלון", "שמש", "ברק", "גולן", "ורדי", "חיים", "יוסף", "נחום",
]
ROLES_MIX = ["employee"] * 7 + ["employee"] * 2 + ["social_worker"]

for dept in DEPARTMENTS:
    slug = dept["id"].replace("dept-", "")
    for i in range(10):
        fn = HEBREW_FIRST_NAMES[(hash(slug) + i) % len(HEBREW_FIRST_NAMES)]
        ln = HEBREW_LAST_NAMES[(hash(slug) + i + 3) % len(HEBREW_LAST_NAMES)]
        role = ROLES_MIX[i % len(ROLES_MIX)]
        DEMO_USERS.append({
            "user_id": f"demo-{slug}-{i:02d}",
            "display_name": f"{fn} {ln}",
            "role": role,
            "department_id": dept["id"],
            "contact_email": f"nurse.{slug}.{i:02d}@demo.local",
        })

TEAM_UPDATE_TEMPLATES = [
    "תגברנו משמרת ערב בעקבות עומס שדווח השבוע.",
    "עודכנה חלוקת הפסקות במחלקה — הפסקה של 20 דקות בכל משמרת.",
    "נבדקת בקשה להפחתת עומס תיעוד. נעדכן כשיהיה אישור.",
    "שיחה צוותית התקיימה בעקבות דיווחים על עומס. תודה על הכנות.",
    "הוספנו תמיכה של עובדת סוציאלית במשמרות בוקר — אפשר לפנות.",
    "קיבלנו את הבקשה לשיפור חדר המנוחה. העבודות יתחילו בשבוע הבא.",
    "ראינו ירידה באנרגיה ביום רביעי — בודקים מה קורה עם סבב המשמרות.",
    "פגישת צוות חודשית נקבעה ליום שלישי. נדבר על מה שעולה מהדיווחים.",
]


def _energy_pattern(day_offset: int, user_seed: int) -> int:
    """Generate realistic energy with weekly and individual variance."""
    # Base energy with sinusoidal weekly pattern
    base = 55 + 15 * math.sin(day_offset * 0.9 + user_seed * 0.7)
    # Day-of-week effect (lower mid-week)
    dow = (date.today() - timedelta(days=day_offset)).weekday()
    dow_effect = {0: 3, 1: 0, 2: -5, 3: -8, 4: -3, 5: 5, 6: 8}.get(dow, 0)
    # Random noise
    noise = random.gauss(0, 10)
    return max(5, min(95, int(base + dow_effect + noise)))


def reset_demo_data():
    """Delete all records with demo- prefixed IDs."""
    print("Resetting demo data...")

    # Delete in dependency order
    # Alerts reference check-ins
    demo_checkin_ids = [
        c.check_in_id for c in
        db.session.query(CheckIn.check_in_id)
        .filter(CheckIn.department_id.in_([d["id"] for d in DEPARTMENTS]))
        .all()
    ]
    if demo_checkin_ids:
        db.session.query(Alert).filter(
            Alert.check_in_id.in_(demo_checkin_ids)
        ).delete(synchronize_session=False)

    # Check-ins by department
    db.session.query(CheckIn).filter(
        CheckIn.department_id.in_([d["id"] for d in DEPARTMENTS])
    ).delete(synchronize_session=False)

    # Team updates by department
    db.session.query(TeamUpdate).filter(
        TeamUpdate.department_id.in_([d["id"] for d in DEPARTMENTS])
    ).delete(synchronize_session=False)

    # Consent logs for demo users
    demo_user_ids = [u["user_id"] for u in DEMO_USERS]
    db.session.query(ConsentLog).filter(
        ConsentLog.user_id.in_(demo_user_ids)
    ).delete(synchronize_session=False)

    # Demo users themselves
    db.session.query(User).filter(
        User.user_id.in_(demo_user_ids)
    ).delete(synchronize_session=False)

    db.session.commit()
    print("  Demo data reset complete.")


def seed_users():
    """Create or update demo users."""
    print(f"Seeding {len(DEMO_USERS)} users...")
    for u_data in DEMO_USERS:
        existing = db.session.get(User, u_data["user_id"])
        if existing:
            existing.display_name = u_data["display_name"]
            existing.role = u_data["role"]
            existing.department_id = u_data["department_id"]
            existing.contact_email = u_data["contact_email"]
            existing.is_active = True
        else:
            db.session.add(User(
                user_id=u_data["user_id"],
                display_name=u_data["display_name"],
                role=u_data["role"],
                department_id=u_data["department_id"],
                contact_email=u_data["contact_email"],
                is_active=True,
            ))
    db.session.commit()
    print(f"  {len(DEMO_USERS)} users seeded.")


def seed_consent():
    """Grant consent for all demo users so app flows are not blocked."""
    print("Seeding consent records...")
    now = utcnow()
    count = 0
    for u_data in DEMO_USERS:
        existing = (
            db.session.query(ConsentLog)
            .filter_by(user_id=u_data["user_id"], version="1.0")
            .first()
        )
        if not existing:
            db.session.add(ConsentLog(
                user_id=u_data["user_id"],
                version="1.0",
                consent_at=now - timedelta(days=120),
                method="import",
            ))
            # Also set user.consent_at
            user = db.session.get(User, u_data["user_id"])
            if user:
                user.consent_at = now - timedelta(days=120)
            count += 1
    db.session.commit()
    print(f"  {count} new consent records seeded.")


def seed_checkins(days: int):
    """Create historical check-ins across all departments."""
    print(f"Seeding check-ins for {days} days...")
    now = utcnow()
    today = date.today()

    # Get employee users per department
    employees_by_dept: dict[str, list[dict]] = {}
    for dept in DEPARTMENTS:
        emps = [u for u in DEMO_USERS if u["department_id"] == dept["id"] and u["role"] in ("employee", "social_worker")]
        employees_by_dept[dept["id"]] = emps

    total = 0
    alerts_created = 0
    salt = "demo-seed-salt-long-enough-for-validation"

    for day_offset in range(days, 0, -1):
        report_date = today - timedelta(days=day_offset)
        # Skip some weekends (lower reporting)
        if report_date.weekday() >= 5 and random.random() < 0.4:
            continue

        for dept in DEPARTMENTS:
            emps = employees_by_dept[dept["id"]]
            # 60-90% of employees report each day
            reporters = random.sample(emps, k=max(4, int(len(emps) * random.uniform(0.6, 0.9))))

            for emp in reporters:
                energy = _energy_pattern(day_offset, hash(emp["user_id"]))
                # 70% anonymous, 30% identified
                is_anon = random.random() < 0.7

                ts = datetime.combine(report_date, datetime.min.time()) + timedelta(
                    hours=random.randint(7, 20),
                    minutes=random.randint(0, 59),
                )

                if is_anon:
                    token = generate_anon_token(emp["user_id"], report_date, salt)
                    ci = CheckIn(
                        user_id=None,
                        anon_token=token,
                        energy=energy,
                        department_id=dept["id"],
                        source="web",
                    )
                else:
                    ci = CheckIn(
                        user_id=emp["user_id"],
                        energy=energy,
                        department_id=dept["id"],
                        source="web",
                    )

                # Optional follow-up answers (30% chance)
                if random.random() < 0.3:
                    ci.support_q = random.choice([True, False])
                if random.random() < 0.3:
                    ci.workload_q = random.choice([True, False])

                ci.created_at = ts
                ci.updated_at = ts
                db.session.add(ci)
                db.session.flush()

                # Generate alerts for very low/high energy
                if energy < 25:
                    alert = Alert(
                        check_in_id=ci.check_in_id,
                        type="low",
                        status="open",
                    )
                    alert.created_at = ts
                    db.session.add(alert)
                    alerts_created += 1
                elif energy > 85:
                    alert = Alert(
                        check_in_id=ci.check_in_id,
                        type="high",
                        status="open",
                    )
                    alert.created_at = ts
                    db.session.add(alert)
                    alerts_created += 1

                total += 1

        # Commit in daily batches to avoid huge transactions
        if day_offset % 10 == 0:
            db.session.commit()

    db.session.commit()
    print(f"  {total} check-ins seeded.")
    print(f"  {alerts_created} alerts created.")
    return alerts_created


def seed_alert_workflow():
    """Process some open alerts through the ack workflow to create realistic states."""
    print("Processing alert workflow...")
    now = utcnow()
    alerts = db.session.query(Alert).filter(Alert.status == "open").order_by(Alert.created_at.desc()).all()

    if not alerts:
        print("  No open alerts to process.")
        return

    # Process ~60% of alerts through various stages
    random.shuffle(alerts)
    closed_count = 0
    for i, alert in enumerate(alerts):
        if i >= len(alerts) * 0.6:
            break  # leave remaining ~40% as open

        # Get the check-in's department to find a manager
        checkin = db.session.get(CheckIn, alert.check_in_id)
        if not checkin or not checkin.department_id:
            continue

        mgr_id = f"demo-mgr-{checkin.department_id.replace('dept-', '')}"
        mgr = db.session.get(User, mgr_id)
        if not mgr:
            continue

        # Step 1: Mark seen
        alert.status = "ack1"
        alert.ack_at = alert.created_at + timedelta(hours=random.randint(1, 12))
        alert.ack_by = mgr_id

        if random.random() < 0.8:
            # Step 2: Mark contacted
            alert.status = "ack2"
            alert.contacted_at = alert.ack_at + timedelta(hours=random.randint(1, 24))

            if random.random() < 0.7:
                # Step 3: Close
                alert.status = "closed"
                alert.closed_at = alert.contacted_at + timedelta(hours=random.randint(1, 48))
                alert.closure_note = random.choice([
                    "שיחה אישית, נקבעה פגישה",
                    "הופנה לעובד/ת סוציאלי/ת",
                    "התערבות צוותית באמצעות עדכון לצוות",
                    "שיחה עם העובד/ת. מצב השתפר.",
                    "בוצע שינוי במשמרות בעקבות הדיווח.",
                ])
                closed_count += 1

    db.session.commit()
    print(f"  Processed {len(alerts)} alerts, {closed_count} closed.")


def seed_team_updates():
    """Create team updates for each department."""
    print("Seeding team updates...")
    now = utcnow()
    count = 0

    for dept in DEPARTMENTS:
        slug = dept["id"].replace("dept-", "")
        mgr_id = f"demo-mgr-{slug}"

        for i, template in enumerate(TEAM_UPDATE_TEMPLATES[:5]):
            days_ago = (len(TEAM_UPDATE_TEMPLATES) - i) * 7 + random.randint(0, 3)
            published_at = now - timedelta(days=days_ago)

            tu = TeamUpdate(
                author_id=mgr_id,
                department_id=dept["id"],
                content=template,
                published_at=published_at,
                is_active=True,
            )
            tu.created_at = published_at - timedelta(hours=1)
            tu.updated_at = published_at
            db.session.add(tu)
            count += 1

    db.session.commit()
    print(f"  {count} team updates seeded.")


def main():
    parser = argparse.ArgumentParser(description="Seed demo data for Wellbeing2.0")
    parser.add_argument("--reset-demo-data", action="store_true",
                        help="Delete existing demo data before seeding")
    parser.add_argument("--days", type=int, default=120,
                        help="Number of days of historical check-ins (default: 120)")
    parser.add_argument("--departments", type=int, default=4,
                        help="Number of departments (default: 4, max 4)")
    args = parser.parse_args()

    app = create_app()

    with app.app_context():
        # Ensure tables exist
        db.create_all()

        if args.reset_demo_data:
            reset_demo_data()

        seed_users()
        seed_consent()
        seed_checkins(args.days)
        seed_alert_workflow()
        seed_team_updates()

        # Summary
        user_count = db.session.query(User).filter(
            User.user_id.like("demo-%")
        ).count()
        checkin_count = db.session.query(CheckIn).filter(
            CheckIn.department_id.in_([d["id"] for d in DEPARTMENTS])
        ).count()
        alert_count = db.session.query(Alert).count()
        update_count = db.session.query(TeamUpdate).filter(
            TeamUpdate.department_id.in_([d["id"] for d in DEPARTMENTS])
        ).count()

        print("\n=== Seed Summary ===")
        print(f"  Users:        {user_count}")
        print(f"  Check-ins:    {checkin_count}")
        print(f"  Alerts:       {alert_count}")
        print(f"  Team Updates: {update_count}")
        print(f"  Departments:  {len(DEPARTMENTS)}")
        print("====================")


if __name__ == "__main__":
    main()
