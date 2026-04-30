"""Admin settings: organizations, departments, policy_settings tables.

Revision ID: 0005_admin_settings
Revises: 0004_checkin_department_snapshot
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_admin_settings"
down_revision = "0004_checkin_department_snapshot"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "organizations",
        sa.Column("org_id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("address", sa.String(300), nullable=True),
        sa.Column("phone", sa.String(40), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("timezone", sa.String(60), nullable=True, server_default="Asia/Jerusalem"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "departments",
        sa.Column("dept_id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.org_id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(60), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_departments_org_id", "departments", ["org_id"])
    op.create_index("ix_departments_slug", "departments", ["slug"])

    op.create_table(
        "policy_settings",
        sa.Column("setting_id", sa.String(36), primary_key=True),
        sa.Column("key", sa.String(80), nullable=False, unique=True),
        sa.Column("value", sa.String(500), nullable=False),
        sa.Column("description", sa.String(300), nullable=True),
        sa.Column("updated_by", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_policy_settings_key", "policy_settings", ["key"])


def downgrade():
    op.drop_table("policy_settings")
    op.drop_table("departments")
    op.drop_table("organizations")
