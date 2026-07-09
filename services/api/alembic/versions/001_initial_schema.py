"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-07-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "clubs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ea_club_id", sa.String(32), nullable=False),
        sa.Column("name", sa.String(255), nullable=False, server_default=""),
        sa.Column("division", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("stadium", sa.String(255), nullable=False, server_default=""),
        sa.Column("summary_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_clubs_ea_club_id", "clubs", ["ea_club_id"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("google_id", sa.String(128), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("plan", sa.String(32), nullable=False, server_default="free"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    op.create_table(
        "matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ea_match_id", sa.String(64), nullable=False),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clubs.id"), nullable=False),
        sa.Column("opponent_ea_id", sa.String(32), nullable=False, server_default=""),
        sa.Column("opponent_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("match_type", sa.String(32), nullable=False, server_default="unknown"),
        sa.Column("played_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("club_goals", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opponent_goals", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("result", sa.String(4), nullable=False, server_default=""),
        sa.Column("raw_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("ea_match_id", name="uq_matches_ea_match_id"),
    )
    op.create_index("ix_matches_club_id", "matches", ["club_id"])
    op.create_index("ix_matches_played_at", "matches", ["played_at"])
    op.create_index("ix_matches_ea_match_id", "matches", ["ea_match_id"])

    op.create_table(
        "user_tracked_clubs",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clubs.id"), primary_key=True),
        sa.Column("tracked_since", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "sync_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clubs.id"), nullable=True),
        sa.Column("club_ea_id", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("matches_added", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text(), nullable=True),
    )
    op.create_index("ix_sync_jobs_club_ea_id", "sync_jobs", ["club_ea_id"])


def downgrade() -> None:
    op.drop_table("sync_jobs")
    op.drop_table("user_tracked_clubs")
    op.drop_table("matches")
    op.drop_table("users")
    op.drop_table("clubs")
