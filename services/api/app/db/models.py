from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Club(Base):
    __tablename__ = "clubs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ea_club_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    division: Mapped[int] = mapped_column(Integer, default=0)
    stadium: Mapped[str] = mapped_column(String(255), default="")
    summary_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    slug: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)
    crest_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    admin_pin_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    matches: Mapped[List["Match"]] = relationship(back_populates="club")
    sync_jobs: Mapped[List["SyncJob"]] = relationship(back_populates="club")
    memberships: Mapped[List["ClubMembership"]] = relationship(back_populates="club")
    players: Mapped[List["ClubPlayer"]] = relationship(back_populates="club")
    scheduled_matches: Mapped[List["ScheduledMatch"]] = relationship(back_populates="club")
    trophies: Mapped[List["Trophy"]] = relationship(back_populates="club")


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (UniqueConstraint("ea_match_id", name="uq_matches_ea_match_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ea_match_id: Mapped[str] = mapped_column(String(64), index=True)
    club_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clubs.id"), index=True)
    opponent_ea_id: Mapped[str] = mapped_column(String(32), default="")
    opponent_name: Mapped[str] = mapped_column(String(255), default="")
    match_type: Mapped[str] = mapped_column(String(32), default="unknown")
    played_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    club_goals: Mapped[int] = mapped_column(Integer, default=0)
    opponent_goals: Mapped[int] = mapped_column(Integer, default=0)
    result: Mapped[str] = mapped_column(String(4), default="")
    status: Mapped[str] = mapped_column(String(16), default="approved", index=True)
    source: Mapped[str] = mapped_column(String(16), default="ea")
    screenshot_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    raw_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    club: Mapped["Club"] = relationship(back_populates="matches")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    google_id: Mapped[Optional[str]] = mapped_column(String(128), unique=True, nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    plan: Mapped[str] = mapped_column(String(32), default="free")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    tracked_clubs: Mapped[List["UserTrackedClub"]] = relationship(back_populates="user")
    memberships: Mapped[List["ClubMembership"]] = relationship(back_populates="user")


class UserTrackedClub(Base):
    __tablename__ = "user_tracked_clubs"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    club_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clubs.id"), primary_key=True)
    tracked_since: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="tracked_clubs")
    club: Mapped["Club"] = relationship()


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("clubs.id"), nullable=True)
    club_ea_id: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    matches_added: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    club: Mapped[Optional["Club"]] = relationship(back_populates="sync_jobs")


class ClubMembership(Base):
    __tablename__ = "club_memberships"
    __table_args__ = (UniqueConstraint("user_id", "club_id", name="uq_club_memberships_user_club"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    club_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clubs.id"), index=True)
    role: Mapped[str] = mapped_column(String(16), default="member")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="memberships")
    club: Mapped["Club"] = relationship(back_populates="memberships")


class ClubPlayer(Base):
    __tablename__ = "club_players"
    __table_args__ = (UniqueConstraint("club_id", "ea_player_id", name="uq_club_players_club_player"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clubs.id"), index=True)
    ea_player_id: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(255), default="")
    position_override: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    club: Mapped["Club"] = relationship(back_populates="players")


class ScheduledMatch(Base):
    __tablename__ = "scheduled_matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clubs.id"), index=True)
    opponent_name: Mapped[str] = mapped_column(String(255), default="")
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    league: Mapped[str] = mapped_column(String(128), default="")
    stage: Mapped[str] = mapped_column(String(128), default="")
    is_cup: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    club: Mapped["Club"] = relationship(back_populates="scheduled_matches")


class Trophy(Base):
    __tablename__ = "trophies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clubs.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    organization: Mapped[str] = mapped_column(String(128), default="")
    won_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scope: Mapped[str] = mapped_column(String(32), default="regional")
    final_opponent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    final_score_for: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    final_score_against: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    champions: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    club: Mapped["Club"] = relationship(back_populates="trophies")
