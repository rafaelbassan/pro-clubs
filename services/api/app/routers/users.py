from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db.models import Club, User, UserTrackedClub
from app.db.session import get_db
from app.services.club_service import get_or_sync_club
from pydantic import BaseModel

router = APIRouter(prefix="/users/me", tags=["users"])


class TrackedClubOut(BaseModel):
    club_id: str
    name: str
    tracked_since: datetime


@router.post("/clubs/{club_id}/track", response_model=TrackedClubOut)
def track_club(
    club_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    club = get_or_sync_club(db, club_id)
    existing = (
        db.query(UserTrackedClub)
        .filter(
            UserTrackedClub.user_id == user.id,
            UserTrackedClub.club_id == club.id,
        )
        .first()
    )
    if not existing:
        db.add(UserTrackedClub(user_id=user.id, club_id=club.id))
        db.commit()
    return TrackedClubOut(
        club_id=club.ea_club_id,
        name=club.name,
        tracked_since=datetime.now(timezone.utc),
    )


@router.get("/clubs", response_model=list[TrackedClubOut])
def list_tracked_clubs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(UserTrackedClub, Club)
        .join(Club, Club.id == UserTrackedClub.club_id)
        .filter(UserTrackedClub.user_id == user.id)
        .all()
    )
    return [
        TrackedClubOut(
            club_id=club.ea_club_id,
            name=club.name,
            tracked_since=tracked.tracked_since,
        )
        for tracked, club in rows
    ]
