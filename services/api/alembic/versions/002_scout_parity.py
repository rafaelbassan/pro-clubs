"""scout clubs parity schema

Revision ID: 002
Revises: 001
Create Date: 2026-08-14
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clubs",
        sa.Column("slug", sa.String(64), nullable=True),
    )
    op.add_column(
        "clubs",
        sa.Column("crest_url", sa.String(512), nullable=True),
    )
    op.add_column(
        "clubs",
        sa.Column("admin_pin_hash", sa.String(255), nullable=True),
    )
    op.create_index("ix_clubs_slug", "clubs", ["slug"], unique=True)

    op.add_column(
        "matches",
        sa.Column("status", sa.String(16), nullable=False, server_default="approved"),
    )
    op.add_column(
        "matches",
        sa.Column("source", sa.String(16), nullable=False, server_default="ea"),
    )
    op.add_column(
        "matches",
        sa.Column("screenshot_path", sa.String(512), nullable=True),
    )
    op.create_index("ix_matches_status", "matches", ["status"])

    op.create_table(
        "club_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clubs.id"), nullable=False),
        sa.Column("role", sa.String(16), nullable=False, server_default="member"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "club_id", name="uq_club_memberships_user_club"),
    )
    op.create_index("ix_club_memberships_club_id", "club_memberships", ["club_id"])

    op.create_table(
        "club_players",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clubs.id"), nullable=False),
        sa.Column("ea_player_id", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), nullable=False, server_default=""),
        sa.Column("position_override", sa.String(16), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("club_id", "ea_player_id", name="uq_club_players_club_player"),
    )
    op.create_index("ix_club_players_club_id", "club_players", ["club_id"])

    op.create_table(
        "scheduled_matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clubs.id"), nullable=False),
        sa.Column("opponent_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("league", sa.String(128), nullable=False, server_default=""),
        sa.Column("stage", sa.String(128), nullable=False, server_default=""),
        sa.Column("is_cup", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_scheduled_matches_club_id", "scheduled_matches", ["club_id"])
    op.create_index("ix_scheduled_matches_scheduled_at", "scheduled_matches", ["scheduled_at"])

    op.create_table(
        "trophies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clubs.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("organization", sa.String(128), nullable=False, server_default=""),
        sa.Column("won_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scope", sa.String(32), nullable=False, server_default="regional"),
        sa.Column("final_opponent", sa.String(255), nullable=True),
        sa.Column("final_score_for", sa.Integer(), nullable=True),
        sa.Column("final_score_against", sa.Integer(), nullable=True),
        sa.Column("champions", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_trophies_club_id", "trophies", ["club_id"])


def downgrade() -> None:
    op.drop_table("trophies")
    op.drop_table("scheduled_matches")
    op.drop_table("club_players")
    op.drop_table("club_memberships")
    op.drop_index("ix_matches_status", table_name="matches")
    op.drop_column("matches", "screenshot_path")
    op.drop_column("matches", "source")
    op.drop_column("matches", "status")
    op.drop_index("ix_clubs_slug", table_name="clubs")
    op.drop_column("clubs", "admin_pin_hash")
    op.drop_column("clubs", "crest_url")
    op.drop_column("clubs", "slug")
