"""alert publish tracking + design pack support

Revision ID: 0003_alert_publish_tracking
Revises: 0002_otp_requests
Create Date: 2026-04-29 00:00:00.000000

Adds columns to the alerts table to support the closed-loop feedback
flow from the design pack:
    - team_update_id: FK linking alert closure to a published team update
    - closure_published: boolean flag for quick filtering unpublished closures
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_alert_publish_tracking"
down_revision = "0002_otp_requests"
branch_labels = None
depends_on = None


def _column_exists(table, column):
    """Check if a column already exists. Works on both SQLite and PostgreSQL."""
    bind = op.get_bind()
    dialect = bind.dialect.name
    if dialect == "sqlite":
        result = bind.execute(sa.text(f"PRAGMA table_info({table})"))
        columns = [row[1] for row in result]
    else:
        # PostgreSQL: query information_schema
        result = bind.execute(sa.text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :table"
        ), {"table": table})
        columns = [row[0] for row in result]
    return column in columns


def upgrade():
    if not _column_exists("alerts", "team_update_id"):
        op.add_column(
            "alerts",
            sa.Column(
                "team_update_id",
                sa.String(36),
                sa.ForeignKey("team_updates.update_id", ondelete="SET NULL"),
                nullable=True,
            ),
        )

    if not _column_exists("alerts", "closure_published"):
        op.add_column(
            "alerts",
            sa.Column(
                "closure_published",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )

    try:
        op.create_index(
            "ix_alerts_closure_published",
            "alerts",
            ["closure_published", "status"],
        )
    except Exception:
        pass


def downgrade():
    try:
        op.drop_index("ix_alerts_closure_published", table_name="alerts")
    except Exception:
        pass
    if _column_exists("alerts", "closure_published"):
        op.drop_column("alerts", "closure_published")
    if _column_exists("alerts", "team_update_id"):
        op.drop_column("alerts", "team_update_id")
