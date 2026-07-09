from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.db.models import Club
from shared.schemas import ClubSearchResult


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def club_to_search_result(club: Club) -> ClubSearchResult:
    summary = club.summary_json or {}
    return ClubSearchResult(
        club_id=club.ea_club_id,
        name=club.name or summary.get("name", club.ea_club_id),
        current_division=club.division or summary.get("current_division", 0),
        wins=summary.get("wins", 0),
        losses=summary.get("losses", 0),
        ties=summary.get("ties", 0),
        platform=summary.get("platform", "common-gen5"),
    )


def search_clubs_from_db(db: Session, query: str, limit: int = 10) -> List[ClubSearchResult]:
    pattern = f"%{query.strip()}%"
    clubs = (
        db.query(Club)
        .filter(Club.name.ilike(pattern))
        .order_by(Club.updated_at.desc())
        .limit(limit)
        .all()
    )
    return [club_to_search_result(club) for club in clubs]


def is_metadata_fresh(club: Club, ttl_seconds: int, now: Optional[datetime] = None) -> bool:
    if not club.updated_at:
        return False
    now = now or utcnow()
    updated = club.updated_at
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    return (now - updated).total_seconds() < ttl_seconds


def upsert_club_from_summary(db: Session, summary: dict) -> Club:
    club_id = str(summary.get("club_id", ""))
    if not club_id:
        raise ValueError("club_id is required to upsert a club")

    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        club = Club(ea_club_id=club_id)
        db.add(club)

    club.name = summary.get("name") or club.name or club_id
    club.division = summary.get("current_division", club.division or 0)
    if summary.get("stadium"):
        club.stadium = summary["stadium"]

    merged_summary = dict(club.summary_json or {})
    merged_summary.update(summary)
    club.summary_json = merged_summary
    club.updated_at = utcnow()
    return club


def upsert_club_from_search_result(db: Session, result: ClubSearchResult) -> Club:
    return upsert_club_from_summary(
        db,
        {
            "club_id": result.club_id,
            "name": result.name,
            "current_division": result.current_division,
            "wins": result.wins,
            "losses": result.losses,
            "ties": result.ties,
            "platform": result.platform,
        },
    )
