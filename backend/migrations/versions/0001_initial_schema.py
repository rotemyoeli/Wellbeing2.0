"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-29 00:00:00.000000

This is the foundational migration. It creates all 8 tables defined in
Spec v2 §8, with check constraints, indexes, and foreign keys.

The most important constraint is `ck_checkins_anonymity_invariant` on
the `checkins` table — it enforces that exactly one of {user_id, anon_token}
is populated. This is the database-layer enforcement of UVP 1
(architectural anonymity). Do NOT remove it.

Notes on portability:
- CHECK constraints work in SQLite 3.37+ and PostgreSQL.
- We use String(36) for UUIDs (rather than the postgres-native UUID type)
  for SQLite portability. In a Postgres-only deployment, switching to
  postgresql.UUID would be a future optimisation.
- All booleans use plain Python `Boolean` — SQLAlchemy adapts to each engine.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ----- users -----
    op.create_table(
        "users",
        sa.Column("user_id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("department_id", sa.String(length=36), nullable=True),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("contact_phone", sa.String(length=40), nullable=True),
        sa.Column("shift_group", sa.String(length=40), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("consent_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_department_id", "users", ["department_id"])
    op.create_index("ix_users_is_active", "users", ["is_active"])
    op.create_index("ix_users_role_dept", "users", ["role", "department_id"])

    # ----- shifts -----
    op.create_table(
        "shifts",
        sa.Column("shift_id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("shift_type", sa.String(length=20), nullable=False),
        sa.Column("start_at", sa.DateTime(), nullable=False),
        sa.Column("end_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "shift_type IN ('morning', 'evening', 'night')",
            name="ck_shifts_type",
        ),
        sa.CheckConstraint(
            "end_at > start_at",
            name="ck_shifts_chronology",
        ),
    )
    op.create_index("ix_shifts_user_id", "shifts", ["user_id"])
    op.create_index("ix_shifts_start_at", "shifts", ["start_at"])

    # ----- consent_log (Amendment 13 requirement) -----
    op.create_table(
        "consent_log",
        sa.Column(
            "consent_id", sa.String(length=36), primary_key=True, nullable=False
        ),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("version", sa.String(length=20), nullable=False),
        sa.Column("consent_at", sa.DateTime(), nullable=False),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column("method", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "method IN ('web', 'import', 'api')",
            name="ck_consent_log_method",
        ),
    )
    op.create_index("ix_consent_log_user_id", "consent_log", ["user_id"])
    op.create_index("ix_consent_log_consent_at", "consent_log", ["consent_at"])

    # ----- team_updates -----
    op.create_table(
        "team_updates",
        sa.Column(
            "update_id", sa.String(length=36), primary_key=True, nullable=False
        ),
        sa.Column("author_id", sa.String(length=36), nullable=True),
        sa.Column("department_id", sa.String(length=36), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["author_id"], ["users.user_id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_team_updates_author_id", "team_updates", ["author_id"])
    op.create_index(
        "ix_team_updates_department_id", "team_updates", ["department_id"]
    )

    # ----- checkins -----
    op.create_table(
        "checkins",
        sa.Column(
            "check_in_id", sa.String(length=36), primary_key=True, nullable=False
        ),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("anon_token", sa.String(length=128), nullable=True),
        sa.Column("energy", sa.Integer(), nullable=False),
        sa.Column("support_q", sa.Boolean(), nullable=True),
        sa.Column("workload_q", sa.Boolean(), nullable=True),
        sa.Column("comment_ciphertext", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("shift_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["shift_id"], ["shifts.shift_id"], ondelete="SET NULL"
        ),
        sa.CheckConstraint(
            "energy >= 0 AND energy <= 100",
            name="ck_checkins_energy_range",
        ),
        # The anonymity invariant. THIS IS THE CRITICAL CONSTRAINT.
        # Exactly one of {user_id, anon_token} must be populated.
        sa.CheckConstraint(
            "(user_id IS NOT NULL AND anon_token IS NULL) "
            "OR (user_id IS NULL AND anon_token IS NOT NULL)",
            name="ck_checkins_anonymity_invariant",
        ),
    )
    op.create_index("ix_checkins_user_id", "checkins", ["user_id"])
    op.create_index("ix_checkins_anon_token", "checkins", ["anon_token"])
    op.create_index("ix_checkins_shift_id", "checkins", ["shift_id"])
    op.create_index("ix_checkins_created_at", "checkins", ["created_at"])

    # ----- alerts -----
    op.create_table(
        "alerts",
        sa.Column("alert_id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("check_in_id", sa.String(length=36), nullable=False),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("ack_by", sa.String(length=36), nullable=True),
        sa.Column("ack_at", sa.DateTime(), nullable=True),
        sa.Column("contacted_at", sa.DateTime(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("closure_note", sa.Text(), nullable=True),
        sa.Column("escalated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["check_in_id"], ["checkins.check_in_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["ack_by"], ["users.user_id"], ondelete="SET NULL"),
        sa.CheckConstraint("type IN ('low', 'high')", name="ck_alerts_type"),
        sa.CheckConstraint(
            "status IN ('open', 'ack1', 'ack2', 'closed')",
            name="ck_alerts_status",
        ),
    )
    op.create_index("ix_alerts_check_in_id", "alerts", ["check_in_id"])
    op.create_index("ix_alerts_status", "alerts", ["status"])

    # ----- notifications -----
    op.create_table(
        "notifications",
        sa.Column("notif_id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("template_id", sa.String(length=80), nullable=True),
        sa.Column("error_detail", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.CheckConstraint(
            "channel IN ('sms', 'email', 'wa', 'push')",
            name="ck_notifications_channel",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'sent', 'delivered', 'failed')",
            name="ck_notifications_status",
        ),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_status", "notifications", ["status"])

    # ----- audit -----
    op.create_table(
        "audit",
        sa.Column("audit_id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("actor_id", sa.String(length=36), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=40), nullable=False),
        sa.Column("entity_id", sa.String(length=36), nullable=True),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_audit_actor_id", "audit", ["actor_id"])
    op.create_index("ix_audit_action", "audit", ["action"])
    op.create_index("ix_audit_created_at", "audit", ["created_at"])


def downgrade():
    # Drop in reverse dependency order.
    op.drop_table("audit")
    op.drop_table("notifications")
    op.drop_table("alerts")
    op.drop_table("checkins")
    op.drop_table("team_updates")
    op.drop_table("consent_log")
    op.drop_table("shifts")
    op.drop_table("users")
