"""Add needs_talk flag to checkins.

Anonymous "I need a conversation" — manager sees someone needs
support without knowing who.

Revision ID: 0006_needs_talk
Revises: 0005_admin_settings
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_needs_talk"
down_revision = "0005_admin_settings"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("checkins", sa.Column("needs_talk", sa.Boolean(), nullable=True, server_default=sa.text("false")))


def downgrade():
    op.drop_column("checkins", "needs_talk")
