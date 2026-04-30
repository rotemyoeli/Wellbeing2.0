"""Add update_reactions table for anonymous feedback on team updates.

Revision ID: 0007_update_reactions
Revises: 0006_needs_talk
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_update_reactions"
down_revision = "0006_needs_talk"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "update_reactions",
        sa.Column("reaction_id", sa.String(36), primary_key=True),
        sa.Column("update_id", sa.String(36), sa.ForeignKey("team_updates.update_id", ondelete="CASCADE"), nullable=False),
        sa.Column("anon_hash", sa.String(128), nullable=False),
        sa.Column("felt_it", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("update_id", "anon_hash", name="uq_reaction_per_user"),
    )
    op.create_index("ix_update_reactions_update_id", "update_reactions", ["update_id"])


def downgrade():
    op.drop_table("update_reactions")
