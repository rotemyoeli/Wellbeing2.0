"""otp requests table

Revision ID: 0002_otp_requests
Revises: 0001_initial_schema
Create Date: 2026-04-29 00:00:00.000000

Adds the otp_requests table for the new OTP authentication flow.
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_otp_requests"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "otp_requests",
        sa.Column("request_id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("contact", sa.String(length=255), nullable=False),
        sa.Column("contact_type", sa.String(length=20), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "contact_type IN ('email', 'phone')",
            name="ck_otp_requests_contact_type",
        ),
    )
    op.create_index("ix_otp_requests_contact", "otp_requests", ["contact"])
    op.create_index(
        "ix_otp_requests_contact_created",
        "otp_requests",
        ["contact", "created_at"],
    )


def downgrade():
    op.drop_table("otp_requests")
