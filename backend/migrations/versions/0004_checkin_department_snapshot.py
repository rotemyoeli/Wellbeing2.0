"""Add department_id snapshot to checkins table.

Every check-in now captures the reporter's department at submission time.
This enables safe department-scoped aggregation including anonymous check-ins,
without joining back to the users table.

Revision ID: 0004
Revises: 0003
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "checkins",
        sa.Column("department_id", sa.String(36), nullable=True),
    )
    op.create_index("ix_checkins_department_id", "checkins", ["department_id"])


def downgrade():
    op.drop_index("ix_checkins_department_id", table_name="checkins")
    op.drop_column("checkins", "department_id")
