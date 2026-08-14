from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Club, ScheduledMatch, Trophy
from app.db.session import get_db
from shared.schemas import ScheduledMatchIn, ScheduledMatchOut, TrophyIn, TrophyOut

router = APIRouter(prefix="/clubs", tags=["events"])


def _get_club(db: Session, club_id: str) -> Club:
    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.get("/{club_id}/schedule", response_model=list[ScheduledMatchOut])
def list_schedule(club_id: str, db: Session = Depends(get_db)):
    club = _get_club(db, club_id)
    rows = (
        db.query(ScheduledMatch)
        .filter(ScheduledMatch.club_id == club.id)
        .order_by(ScheduledMatch.scheduled_at.asc())
        .all()
    )
    return [
        ScheduledMatchOut(
            id=str(r.id),
            opponent_name=r.opponent_name,
            scheduled_at=r.scheduled_at,
            league=r.league,
            stage=r.stage,
            is_cup=r.is_cup,
            notes=r.notes,
        )
        for r in rows
    ]


@router.post("/{club_id}/schedule", response_model=ScheduledMatchOut)
def create_schedule(
    club_id: str,
    body: ScheduledMatchIn,
    db: Session = Depends(get_db),
):
    club = _get_club(db, club_id)
    row = ScheduledMatch(
        club_id=club.id,
        opponent_name=body.opponent_name,
        scheduled_at=body.scheduled_at,
        league=body.league,
        stage=body.stage,
        is_cup=body.is_cup,
        notes=body.notes,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ScheduledMatchOut(
        id=str(row.id),
        opponent_name=row.opponent_name,
        scheduled_at=row.scheduled_at,
        league=row.league,
        stage=row.stage,
        is_cup=row.is_cup,
        notes=row.notes,
    )


@router.delete("/{club_id}/schedule/{event_id}")
def delete_schedule(
    club_id: str,
    event_id: str,
    db: Session = Depends(get_db),
):
    club = _get_club(db, club_id)
    row = (
        db.query(ScheduledMatch)
        .filter(ScheduledMatch.club_id == club.id, ScheduledMatch.id == uuid.UUID(event_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/{club_id}/trophies", response_model=list[TrophyOut])
def list_trophies(club_id: str, db: Session = Depends(get_db)):
    club = _get_club(db, club_id)
    rows = (
        db.query(Trophy)
        .filter(Trophy.club_id == club.id)
        .order_by(Trophy.won_at.desc(), Trophy.created_at.desc())
        .all()
    )
    return [
        TrophyOut(
            id=str(r.id),
            title=r.title,
            organization=r.organization,
            won_at=r.won_at,
            scope=r.scope,
            final_opponent=r.final_opponent,
            final_score_for=r.final_score_for,
            final_score_against=r.final_score_against,
            champions=list(r.champions or []),
        )
        for r in rows
    ]


@router.post("/{club_id}/trophies", response_model=TrophyOut)
def create_trophy(
    club_id: str,
    body: TrophyIn,
    db: Session = Depends(get_db),
):
    club = _get_club(db, club_id)
    scope = body.scope
    if scope == "national":
        scope = "nacional"
    row = Trophy(
        club_id=club.id,
        title=body.title,
        organization=body.organization,
        won_at=body.won_at or datetime.now(timezone.utc),
        scope=scope,
        final_opponent=body.final_opponent,
        final_score_for=body.final_score_for,
        final_score_against=body.final_score_against,
        champions=body.champions,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return TrophyOut(
        id=str(row.id),
        title=row.title,
        organization=row.organization,
        won_at=row.won_at,
        scope=row.scope,
        final_opponent=row.final_opponent,
        final_score_for=row.final_score_for,
        final_score_against=row.final_score_against,
        champions=list(row.champions or []),
    )


@router.patch("/{club_id}/trophies/{trophy_id}", response_model=TrophyOut)
def update_trophy(
    club_id: str,
    trophy_id: str,
    body: TrophyIn,
    db: Session = Depends(get_db),
):
    club = _get_club(db, club_id)
    row = (
        db.query(Trophy)
        .filter(Trophy.club_id == club.id, Trophy.id == uuid.UUID(trophy_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Trophy not found")
    scope = body.scope
    if scope == "national":
        scope = "nacional"
    row.title = body.title
    row.organization = body.organization
    row.won_at = body.won_at
    row.scope = scope
    row.final_opponent = body.final_opponent
    row.final_score_for = body.final_score_for
    row.final_score_against = body.final_score_against
    row.champions = body.champions
    db.commit()
    db.refresh(row)
    return TrophyOut(
        id=str(row.id),
        title=row.title,
        organization=row.organization,
        won_at=row.won_at,
        scope=row.scope,
        final_opponent=row.final_opponent,
        final_score_for=row.final_score_for,
        final_score_against=row.final_score_against,
        champions=list(row.champions or []),
    )


@router.delete("/{club_id}/trophies/{trophy_id}")
def delete_trophy(
    club_id: str,
    trophy_id: str,
    db: Session = Depends(get_db),
):
    club = _get_club(db, club_id)
    row = (
        db.query(Trophy)
        .filter(Trophy.club_id == club.id, Trophy.id == uuid.UUID(trophy_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Trophy not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
